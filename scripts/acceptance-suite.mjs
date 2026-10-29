import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { createSaveAttempt, saveVersion } from '../src/saveVersion.js'
import { uploadToR2 } from '../src/uploadWorkflow.js'
import { TEST_PREFIX, digest, expectJson, safeToCleanProject, validateR2Url } from './acceptance-support.mjs'

export async function runAcceptance(config, { runId, checkpoint, log, request = fetch }) {
  const report = { runId, startedAt: new Date().toISOString(), origin: config.origin, passed: false, checks: [], projects: [], cleanup: [] }
  const sessions = []
  const bytes = Buffer.alloc(64 * 1024)
  for (let i = 0; i < bytes.length; i++) bytes[i] = i % 251
  const file = new File([bytes], 'synctrackr-acceptance.bin', { type: 'application/octet-stream' })
  let attempt
  let restoredUrl
  let currentStage = 'Authenticate disposable accounts'
  let failed = false
  const network = (url, init = {}) => request(url, { ...init, redirect: 'error', signal: AbortSignal.timeout(30000) })
  const db = (session, path, init = {}) => network(`${config.supabaseUrl}/rest/v1/${path}`, {
    ...init, headers: { apikey: config.anonKey, Authorization: `Bearer ${session.token}`,
      'Content-Type': 'application/json', Prefer: 'return=representation', ...init.headers },
  })
  const api = (session, route, body) => network(`${config.origin}/api/${route}`, {
    method: 'POST', headers: { Authorization: `Bearer ${session.token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  })
  async function check(name, work) {
    currentStage = name
    await work()
    report.checks.push({ name, passed: true })
    await checkpoint(report)
    log(`PASS: ${name}`)
  }
  const rows = async (session, table, id) => expectJson(await db(session, `${table}?id=eq.${id}&select=*`), 'Read fixture')
  const requireDenied = response => assert.ok(response.status === 403 || response.status === 404)
  const requireRejectedWrite = response => assert.ok(response.status >= 400 && response.status < 500 && response.status !== 401)

  try {
    await check('Authenticate two distinct disposable accounts', async () => {
      for (const account of config.accounts) {
        const auth = await expectJson(await network(`${config.supabaseUrl}/auth/v1/token?grant_type=password`, {
          method: 'POST', headers: { apikey: config.anonKey, 'Content-Type': 'application/json' }, body: JSON.stringify(account),
        }), 'Sign in')
        assert.ok(auth.access_token && auth.user?.id)
        sessions.push({ token: auth.access_token, userId: auth.user.id })
      }
      assert.notEqual(sessions[0].userId, sessions[1].userId)
    })
    const [a, b] = sessions
    await check('Create isolated fixture projects', async () => {
      for (const [index, session] of sessions.entries()) {
        const project = { id: randomUUID(), userId: session.userId,
          name: `${TEST_PREFIX}${runId} ${index === 0 ? 'A' : 'B'}`, commitIds: [], keys: [] }
        report.projects.push(project)
        await checkpoint(report) // Record IDs before writes, even if a response is lost.
        const created = await expectJson(await db(session, 'projects', { method: 'POST', body: JSON.stringify({
          id: project.id, user_id: project.userId, name: project.name, bpm: 120,
          key: 'C major', daw: 'Acceptance fixture', daw_version: 'test', tracks: 0,
        }) }), 'Create project')
        assert.equal(created[0]?.id, project.id)
      }
    })
    const [projectA, projectB] = report.projects
    attempt = createSaveAttempt({ userId: a.userId, projectId: projectA.id, message: `Acceptance ${runId}`, file })
    projectA.commitIds.push(attempt.id)
    await checkpoint(report)
    let simulateVerificationFailure = true
    let simulateLookupFailure = false
    let puts = 0
    let inserts = 0
    const services = {
      assertAccount() {},
      async findCommit(id) {
        if (simulateLookupFailure) { simulateLookupFailure = false; throw new Error('Simulated lost lookup response') }
        return (await rows(a, 'commits', id))[0] || null
      },
      async insertCommit(payload) {
        inserts++
        await expectJson(await db(a, 'commits', { method: 'POST', body: JSON.stringify(payload) }), 'Insert fixture version')
        simulateLookupFailure = true
        throw new Error('Simulated lost insert response')
      },
      upload: draft => uploadToR2(file, projectA.id, a.token, undefined, {
        uploadState: draft.uploadState,
        request: async (path, init) => {
          if (path === '/api/verify-upload' && simulateVerificationFailure) {
            simulateVerificationFailure = false
            return Response.json({ error: 'Simulated verification outage' }, { status: 502 })
          }
          const response = await network(`${config.origin}${path}`, init)
          if (path === '/api/upload-url' && response.ok) {
            const signed = await response.clone().json()
            validateR2Url(signed.uploadUrl)
            assert.ok(signed.key.startsWith(`${a.userId}/${projectA.id}/`))
            projectA.keys.push(signed.key)
            await checkpoint(report)
          }
          return response
        },
        transfer: async (url, body) => {
          puts++
          const result = await network(validateR2Url(url), { method: 'PUT', body, headers: { 'Content-Type': file.type } })
          assert.ok(result.ok)
        },
      }),
    }
    await check('Upload once and keep the draft through a simulated verification outage', async () => {
      await assert.rejects(saveVersion(attempt, services), /Simulated verification outage/)
      assert.equal(puts, 1)
      assert.equal(inserts, 0)
    })
    await check('Reuse the upload through a simulated lost database response', async () => {
      await assert.rejects(saveVersion(attempt, services), /Simulated lost lookup response/)
      assert.equal(puts, 1)
      assert.equal(inserts, 1)
    })
    await check('Recover exactly one saved version by its stable ID', async () => {
      const saved = await saveVersion(attempt, services)
      assert.equal(saved.id, attempt.id)
      assert.equal(puts, 1)
      assert.equal(inserts, 1)
      assert.equal((await rows(a, 'commits', attempt.id)).length, 1)
    })
    await check('Reject missing objects and incorrect file sizes', async () => {
      assert.equal((await api(a, 'verify-upload', { projectId: projectA.id, key: attempt.uploadState.key, fileSize: file.size + 1 })).status, 409)
      assert.equal((await api(a, 'verify-upload', { projectId: projectA.id, key: `${attempt.uploadState.key}.missing`, fileSize: file.size })).status, 409)
    })
    await check('Download and match the original SHA-256 and byte length', async () => {
      const signed = await expectJson(await api(a, 'download-url', { commitId: attempt.id }), 'Request download')
      restoredUrl = validateR2Url(signed.downloadUrl)
      const restored = await network(restoredUrl)
      assert.ok(restored.ok)
      const content = Buffer.from(await restored.arrayBuffer())
      assert.equal(content.length, bytes.length)
      assert.equal(digest(content), digest(bytes))
    })
    await check('Reject cross-account API access', async () => {
      requireDenied(await api(b, 'upload-url', { projectId: projectA.id, fileName: file.name, fileSize: file.size }))
      requireDenied(await api(b, 'verify-upload', { projectId: projectA.id, key: attempt.uploadState.key, fileSize: file.size }))
      requireDenied(await api(b, 'download-url', { commitId: attempt.id }))
      requireDenied(await api(b, 'delete', { commitId: attempt.id }))
      requireDenied(await api(b, 'delete', { projectId: projectA.id }))
      assert.equal((await rows(a, 'commits', attempt.id)).length, 1)
      assert.equal(digest(Buffer.from(await (await network(restoredUrl)).arrayBuffer())), digest(bytes))
    })
    const bCommitId = randomUUID()
    const forbiddenId = randomUUID()
    projectB.commitIds.push(bCommitId)
    projectA.commitIds.push(forbiddenId)
    await checkpoint(report)
    await check('Enforce direct database ownership and prevent moving versions', async () => {
      assert.deepEqual(await rows(b, 'projects', projectA.id), [])
      assert.deepEqual(await rows(b, 'commits', attempt.id), [])
      await expectJson(await db(b, 'commits', { method: 'POST', body: JSON.stringify({
        id: bCommitId, user_id: b.userId, project_id: projectB.id, message: 'Account B control',
      }) }), 'Create B control')
      requireRejectedWrite(await db(b, 'commits', { method: 'POST', body: JSON.stringify({
        id: forbiddenId, user_id: b.userId, project_id: projectA.id, message: 'Must be rejected',
      }) }))
      requireRejectedWrite(await db(b, `commits?id=eq.${bCommitId}`, {
        method: 'PATCH', body: JSON.stringify({ project_id: projectA.id }),
      }))
      const update = await expectJson(await db(b, `commits?id=eq.${attempt.id}`, {
        method: 'PATCH', body: JSON.stringify({ message: 'Must not replace owner note' }),
      }), 'Cross-account update')
      assert.deepEqual(update, [])
      assert.equal((await rows(a, 'commits', attempt.id))[0]?.message, attempt.message)
      assert.equal((await rows(b, 'commits', bCommitId))[0]?.project_id, projectB.id)
    })
    const pluginId = randomUUID()
    await check('Isolate per-version plugin notes', async () => {
      await expectJson(await db(a, 'plugins', { method: 'POST', body: JSON.stringify({
        id: pluginId, commit_id: attempt.id, name: 'Acceptance plugin', track: 'Test track', chain_order: 1,
      }) }), 'Create plugin fixture')
      assert.deepEqual(await rows(b, 'plugins', pluginId), [])
      requireRejectedWrite(await db(b, 'plugins', { method: 'POST', body: JSON.stringify({
        id: randomUUID(), commit_id: attempt.id, name: 'Must be rejected', chain_order: 2,
      }) }))
    })
    await check('Delete the version, its R2 file and its plugin notes', async () => {
      await expectJson(await api(a, 'delete', { commitId: attempt.id }), 'Delete fixture version')
      assert.deepEqual(await rows(a, 'commits', attempt.id), [])
      assert.deepEqual(await rows(a, 'plugins', pluginId), [])
      assert.equal((await network(restoredUrl)).status, 404)
    })
  } catch {
    failed = true
    report.checks.push({ name: currentStage, passed: false })
    log(`FAIL: ${currentStage}. Sensitive request details were omitted.`)
  } finally {
    // Only inspect exact IDs generated by this run. Never search for names and
    // delete everything matching a prefix, and never use an administrative key.
    for (const project of [...report.projects].reverse()) {
      const session = sessions.find(item => item.userId === project.userId)
      try {
        const actual = (await rows(session, 'projects', project.id))[0]
        if (!actual) { report.cleanup.push({ projectId: project.id, status: 'already-absent' }); continue }
        let commits = await expectJson(await db(session, `commits?project_id=eq.${project.id}&select=id,user_id,project_id,file_url`), 'Inspect cleanup scope')
        assert.ok(safeToCleanProject(actual, project, commits))
        // If failure happened after PUT but before INSERT, attach only this run's
        // recorded key to its preselected commit ID so the normal delete API can
        // remove it. Missing objects are safe for R2 DELETE; no direct bucket key
        // or privileged database credentials are required by this runner.
        if (attempt?.projectId === project.id && project.keys.length && !commits.some(row => row.id === attempt.id)
          && !report.checks.some(item => item.name === 'Delete the version, its R2 file and its plugin notes' && item.passed)) {
          await expectJson(await db(session, 'commits', { method: 'POST', body: JSON.stringify({
            id: attempt.id, user_id: session.userId, project_id: project.id, message: 'Acceptance cleanup',
            file_url: project.keys[0], file_name: file.name, file_size: file.size,
          }) }), 'Attach fixture for cleanup')
          commits = await expectJson(await db(session, `commits?project_id=eq.${project.id}&select=id,user_id,project_id,file_url`), 'Recheck cleanup scope')
          assert.ok(safeToCleanProject(actual, project, commits))
        }
        await expectJson(await api(session, 'delete', { projectId: project.id }), 'Clean fixture project')
        assert.deepEqual(await rows(session, 'projects', project.id), [])
        report.cleanup.push({ projectId: project.id, status: 'removed' })
      } catch {
        failed = true
        report.cleanup.push({ projectId: project.id, status: 'needs-attention' })
      }
      await checkpoint(report)
    }
    report.passed = !failed
    report.finishedAt = new Date().toISOString()
    await checkpoint(report)
  }
  return report
}
