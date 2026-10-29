import test from 'node:test'
import assert from 'node:assert/strict'
import { onRequestPost } from '../../functions/api/download-url.js'

const userId = '22222222-2222-4222-8222-222222222222'
const commitId = '11111111-1111-4111-8111-111111111111'
const env = {
  SUPABASE_URL: 'https://database.example.test', SUPABASE_ANON_KEY: 'test-key',
  R2_ENDPOINT: 'https://storage.example.test', R2_BUCKET: 'test-bucket',
  R2_ACCESS_KEY_ID: 'test-id', R2_SECRET_ACCESS_KEY: 'test-secret',
}
const request = (body = { commitId }, authenticated = true) => new Request('https://app.example.test/api/download-url', {
  method: 'POST', headers: authenticated ? { Authorization: 'Bearer test-token' } : {},
  body: JSON.stringify(body),
})
function mockLookup(t, rows) {
  t.mock.method(globalThis, 'fetch', async (url, init) => {
    assert.equal(init.headers.Authorization, 'Bearer test-token')
    if (url.endsWith('/auth/v1/user')) return Response.json({ id: userId })
    if (url.includes('/rest/v1/commits?')) return Response.json(rows)
    throw new Error('Unexpected upstream request')
  })
}

test('download URL stays in the owned object path and cannot be cached', async t => {
  mockLookup(t, [{ file_url: `${userId}/project/session.flp`, file_name: 'Mix "one".flp' }])
  const response = await onRequestPost({ request: request(), env })
  assert.equal(response.status, 200)
  assert.equal(response.headers.get('Cache-Control'), 'no-store')
  const url = new URL((await response.json()).downloadUrl)
  assert.equal(url.pathname, `/test-bucket/${userId}/project/session.flp`)
  assert.equal(url.searchParams.get('X-Amz-Expires'), '300')
  assert.equal(url.searchParams.get('response-content-disposition'), 'attachment; filename="Mix _one_.flp"')
})

test('rejects traversal, URL syntax, malformed keys and foreign owner paths', async t => {
  for (const key of ['foreign/file.flp', `${userId}/../foreign/file.flp`, `${userId}/%2e%2e/foreign/file.flp`,
    `${userId}/project/../../foreign/file.flp`, `${userId}/project/./file.flp`, `${userId}/a\\..\\file.flp`,
    `${userId}/file.flp?other`, `${userId}/file.flp#other`, `${userId}//file.flp`, { path: 'wrong type' }]) {
    mockLookup(t, [{ file_url: key }])
    const response = await onRequestPost({ request: request(), env })
    assert.equal(response.status, 403)
    assert.deepEqual(await response.json(), { error: 'Forbidden' })
    t.mock.restoreAll()
  }
})

test('rejects missing sessions, invalid bodies and unavailable records', async t => {
  mockLookup(t, [])
  assert.equal((await onRequestPost({ request: request(undefined, false), env })).status, 401)
  for (const body of [null, [], {}, { commitId: 'invalid' }]) {
    assert.equal((await onRequestPost({ request: request(body), env })).status, 400)
  }
  assert.equal((await onRequestPost({ request: request(), env })).status, 404)
})

test('network failures return a safe JSON error without exposing request details', async t => {
  t.mock.method(globalThis, 'fetch', async () => { throw new Error('private upstream credentials') })
  const response = await onRequestPost({ request: request(), env })
  assert.equal(response.status, 502)
  assert.deepEqual(await response.json(), { error: 'Could not prepare your download. Please try again.' })
})
