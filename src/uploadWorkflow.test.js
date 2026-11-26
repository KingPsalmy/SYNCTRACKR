import test from 'node:test'
import assert from 'node:assert/strict'
import { uploadToR2 } from './uploadWorkflow.js'

const file = { name: 'session.flp', size: 128 }
const key = 'test-user/test-project/test-object'
const uploadUrl = 'https://storage.example.test/signed'
const result = { verified: true, key, size: 128 }

test('does not return file metadata until R2 verification completes', async () => {
  const events = []
  let releaseVerification
  let returned = false
  const waiting = new Promise(resolve => { releaseVerification = resolve })
  const pending = uploadToR2(file, 'project-id', 'test-token', percent => events.push(percent), {
    request: async (url, init) => {
      assert.equal(init.headers.Authorization, 'Bearer test-token')
      if (url === '/api/upload-url') return Response.json({ uploadUrl, key })
      assert.equal(url, '/api/verify-upload')
      assert.deepEqual(JSON.parse(init.body), { projectId: 'project-id', key, fileSize: 128 })
      events.push('verify')
      await waiting
      return Response.json(result)
    },
    transfer: async (url, data) => {
      assert.equal(url, uploadUrl)
      assert.equal(data, file)
      events.push('upload')
    },
  }).then(value => { returned = true; return value })
  // Wait until the verification request starts, leaving its response unresolved.
  await new Promise(resolve => setTimeout(resolve, 0))
  assert.deepEqual(events, ['upload', 100, 'verify'])
  assert.equal(returned, false)
  releaseVerification()
  assert.deepEqual(await pending, { key, name: file.name, size: 128 })
})

test('verification failure or inconsistent confirmation cannot return metadata for a save', async () => {
  for (const response of [Response.json({ error: 'File missing' }, { status: 409 }),
    new Response('gateway error', { status: 502 }), Response.json({ ...result, size: 127 }),
    Response.json({ ...result, key: 'wrong-object' }), Response.json({ ...result, verified: false })]) {
    await assert.rejects(uploadToR2(file, 'project-id', 'token', undefined, {
      request: async url => url === '/api/upload-url' ? Response.json({ uploadUrl, key }) : response,
      transfer: async () => {},
    }), /File missing|not been saved/)
  }
})

test('a failed PUT never reaches verification or returns metadata', async () => {
  const calls = []
  await assert.rejects(uploadToR2(file, 'project-id', 'token', undefined, {
    request: async url => { calls.push(url); return Response.json({ uploadUrl, key }) },
    transfer: async () => { throw new Error('Upload interrupted') },
  }), /Upload interrupted/)
  assert.deepEqual(calls, ['/api/upload-url'])
})

test('verification can retry a completed upload without a second PUT', async () => {
  const uploadState = {}
  let puts = 0
  let signatures = 0
  let checks = 0
  const deps = {
    uploadState,
    request: async url => {
      if (url === '/api/upload-url') { signatures++; return Response.json({ uploadUrl, key }) }
      if (++checks === 1) throw new Error('Verification offline')
      return Response.json(result)
    },
    transfer: async () => { puts++ },
  }
  await assert.rejects(uploadToR2(file, 'project-id', 'old-token', undefined, deps), /Verification offline/)
  assert.deepEqual(await uploadToR2(file, 'project-id', 'refreshed-token', undefined, deps), { key, name: file.name, size: 128 })
  assert.equal(puts, 1)
  assert.equal(signatures, 1)
  assert.equal(checks, 2)
})

test('cached uploads cannot be reused for a different file or project', async () => {
  const deps = {
    uploadState: { key, file, projectId: 'original-project' },
    request: async () => { assert.fail('Must not send a request') },
  }
  await assert.rejects(uploadToR2({ ...file }, 'original-project', 'token', undefined, deps), /different draft/)
  await assert.rejects(uploadToR2(file, 'other-project', 'token', undefined, deps), /different draft/)
})
