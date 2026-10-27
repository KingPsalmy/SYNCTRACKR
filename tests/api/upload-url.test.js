import test from 'node:test'
import assert from 'node:assert/strict'
import { onRequestPost } from '../../functions/api/upload-url.js'

const projectId = '11111111-1111-4111-8111-111111111111'
const userId = '22222222-2222-4222-8222-222222222222'
// Deliberately fake values: tests never contact a service.
const env = {
  SUPABASE_URL: 'https://database.example.test', SUPABASE_ANON_KEY: 'test-key',
  R2_ENDPOINT: 'https://storage.example.test', R2_BUCKET: 'test-bucket',
  R2_ACCESS_KEY_ID: 'test-id', R2_SECRET_ACCESS_KEY: 'test-secret',
}
const json = (value, status = 200) => new Response(JSON.stringify(value), { status })
const request = (authenticated = true) => new Request('https://app.example.test/api/upload-url', {
  method: 'POST',
  headers: authenticated ? { Authorization: 'Bearer test-token' } : {},
  body: JSON.stringify({ projectId, fileName: 'session.flp', fileSize: 128 }),
})

test('unauthenticated uploads fail before any upstream call', async t => {
  const fetch = t.mock.method(globalThis, 'fetch', () => { throw new Error('Unexpected request') })
  const response = await onRequestPost({ request: request(false), env })
  assert.equal(response.status, 401)
  assert.equal(fetch.mock.callCount(), 0)
})

for (const [name, rows] of [
  ['hidden or missing project', []],
  ['another user’s project', [{ id: projectId, user_id: 'someone-else' }]],
]) {
  test(`rejects ${name} before checking quota or signing`, async t => {
    const calls = []
    t.mock.method(globalThis, 'fetch', async (url, init) => {
      calls.push(url)
      assert.equal(init.headers.Authorization, 'Bearer test-token')
      if (url.endsWith('/auth/v1/user')) return json({ id: userId })
      if (url.includes('/rest/v1/projects?')) return json(rows)
      throw new Error('Must not request quota for an inaccessible project')
    })
    const response = await onRequestPost({ request: request(), env })
    assert.equal(response.status, 404)
    assert.deepEqual(await response.json(), { error: 'Project not found' })
    assert.equal(calls.length, 2)
  })
}

test('project lookup failure fails closed', async t => {
  t.mock.method(globalThis, 'fetch', async url => url.endsWith('/auth/v1/user')
    ? json({ id: userId }) : json({ error: 'unavailable' }, 503))
  const response = await onRequestPost({ request: request(), env })
  assert.equal(response.status, 502)
  assert.deepEqual(await response.json(), { error: 'Could not check project ownership' })
})

test('owned project receives a link scoped to the user and project', async t => {
  t.mock.method(globalThis, 'fetch', async url => {
    if (url.endsWith('/auth/v1/user')) return json({ id: userId })
    if (url.includes('/rest/v1/projects?')) return json([{ id: projectId, user_id: userId }])
    if (url.endsWith('/rpc/storage_used')) return json(0)
    throw new Error('Unexpected upstream request')
  })
  const response = await onRequestPost({ request: request(), env })
  assert.equal(response.status, 200)
  const body = await response.json()
  assert.ok(body.key.startsWith(`${userId}/${projectId}/`))
  const url = new URL(body.uploadUrl)
  assert.equal(url.hostname, 'storage.example.test')
  assert.equal(url.searchParams.get('X-Amz-Expires'), '600')
  assert.ok(url.searchParams.has('X-Amz-Signature'))
})
