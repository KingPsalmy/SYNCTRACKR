import test from 'node:test'
import assert from 'node:assert/strict'
import { validateOrigin, validateR2Url, safeToCleanProject, expectJson } from '../../scripts/acceptance-support.mjs'
import { runAcceptance } from '../../scripts/acceptance-suite.mjs'

test('acceptance targets require secure origins without embedded credentials or paths', () => {
  assert.equal(validateOrigin('https://synctrackr.pages.dev'), 'https://synctrackr.pages.dev')
  assert.equal(validateOrigin('http://127.0.0.1:5173/'), 'http://127.0.0.1:5173')
  for (const value of ['http://public.example.test', 'https://name:password@example.test',
    'https://example.test/path', 'https://example.test/?token=secret', 'file:///test']) {
    assert.throws(() => validateOrigin(value))
  }
})

test('signed file transfers are limited to R2 endpoints', () => {
  const good = 'https://0123456789abcdef0123456789abcdef.r2.cloudflarestorage.com/bucket/file?signature=fake'
  assert.equal(validateR2Url(good), good)
  for (const value of ['https://unrelated.example.test/file', good.replace('https:', 'http:'),
    good.replace('.com/', '.com.attacker.test/'), good.replace('https://', 'https://user:password@')]) {
    assert.throws(() => validateR2Url(value))
  }
})

test('cleanup requires the exact generated IDs, owner, name, and known file keys', () => {
  const expected = { id: 'generated-id', userId: 'owner', name: 'SyncTrackr acceptance run A', commitIds: ['commit'], keys: ['owner/file'] }
  const actual = { id: expected.id, user_id: 'owner', name: expected.name }
  const commits = [{ id: 'commit', user_id: 'owner', project_id: expected.id, file_url: 'owner/file' }]
  assert.equal(safeToCleanProject(actual, expected, commits), true)
  assert.equal(safeToCleanProject({ ...actual, id: 'real-project' }, expected, commits), false)
  assert.equal(safeToCleanProject({ ...actual, name: 'Real music' }, expected, commits), false)
  assert.equal(safeToCleanProject({ ...actual, user_id: 'someone-else' }, expected, commits), false)
  assert.equal(safeToCleanProject(actual, expected, [{ ...commits[0], id: 'unrelated-commit' }]), false)
  assert.equal(safeToCleanProject(actual, expected, [{ ...commits[0], file_url: 'owner/real-music' }]), false)
})

test('service errors do not include upstream bodies or signed URLs', async () => {
  await assert.rejects(expectJson(new Response('private upstream details', { status: 403 }), 'Read fixture'),
    { message: 'Read fixture: HTTP 403' })
})

test('failed login creates no fixtures and writes only a redacted failure report', async () => {
  const checkpoints = []
  const logs = []
  const requests = []
  const report = await runAcceptance({ origin: 'https://app.example.test', supabaseUrl: 'https://db.example.test',
    anonKey: 'fake-key', accounts: [{ email: 'fake@example.test', password: 'fake-private-password' }] }, {
    runId: 'test-run', checkpoint: async state => checkpoints.push(JSON.stringify(state)), log: value => logs.push(value),
    request: async url => { requests.push(url); throw new Error('private token in network exception') },
  })
  assert.equal(report.passed, false)
  assert.deepEqual(report.projects, [])
  assert.equal(requests.length, 1)
  assert.ok(requests[0].includes('/auth/v1/token'))
  assert.ok(!JSON.stringify([checkpoints, logs]).includes('fake-private-password'))
  assert.ok(!JSON.stringify([checkpoints, logs]).includes('private token'))
})
