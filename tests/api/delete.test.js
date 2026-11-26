import test from 'node:test'
import assert from 'node:assert/strict'
import { onRequestPost } from '../../functions/api/delete.js'

const userId = '22222222-2222-4222-8222-222222222222'
const commitId = '11111111-1111-4111-8111-111111111111'
const env = {
  SUPABASE_URL: 'https://database.example.test', SUPABASE_ANON_KEY: 'test-key',
  R2_ENDPOINT: 'https://storage.example.test', R2_BUCKET: 'test-bucket',
  R2_ACCESS_KEY_ID: 'test-id', R2_SECRET_ACCESS_KEY: 'test-secret',
}
const json = value => new Response(JSON.stringify(value))
const request = () => new Request('https://app.example.test/api/delete', {
  method: 'POST', headers: { Authorization: 'Bearer test-token' },
  body: JSON.stringify({ commitId }),
})

function mockServices(t, key, storageResponse) {
  const calls = []
  t.mock.method(globalThis, 'fetch', async (input, init) => {
    const url = typeof input === 'string' ? input : input.url
    const method = init?.method || input.method || 'GET'
    if (url.endsWith('/auth/v1/user')) return json({ id: userId })
    if (url.startsWith(env.SUPABASE_URL) && method === 'GET') return json([{ file_url: key }])
    if (url.startsWith(env.R2_ENDPOINT)) {
      calls.push('storage')
      return storageResponse()
    }
    if (url.startsWith(env.SUPABASE_URL) && method === 'DELETE') {
      calls.push('database')
      return json([{ id: commitId }])
    }
    throw new Error('Unexpected request')
  })
  return calls
}

test('R2 failure keeps the database row and logs no path or raw response', async t => {
  const logs = t.mock.method(console, 'error', () => {})
  const calls = mockServices(t, `${userId}/private-session.flp`, () => new Response(
    '<Error><Code>AccessDenied</Code><Message>private response</Message></Error>', { status: 403 }))
  const response = await onRequestPost({ request: request(), env })
  assert.equal(response.status, 502)
  assert.deepEqual(calls, ['storage'])
  assert.deepEqual(logs.mock.calls[0].arguments, ['R2 delete failed', { status: 403, code: 'AccessDenied' }])
})

test('storage success precedes deleting the database row', async t => {
  const calls = mockServices(t, `${userId}/session.flp`, () => new Response(null, { status: 204 }))
  const response = await onRequestPost({ request: request(), env })
  assert.equal(response.status, 200)
  assert.deepEqual(calls, ['storage', 'database'])
})

test('a version without a file deletes only its row', async t => {
  const calls = mockServices(t, null, () => { throw new Error('Unexpected storage request') })
  const response = await onRequestPost({ request: request(), env })
  assert.equal(response.status, 200)
  assert.deepEqual(calls, ['database'])
})

test('another user’s object key is rejected before touching storage or rows', async t => {
  const calls = mockServices(t, 'someone-else/session.flp', () => { throw new Error('Unexpected storage request') })
  const response = await onRequestPost({ request: request(), env })
  assert.equal(response.status, 403)
  assert.deepEqual(calls, [])
})

test('network errors preserve the row and do not log error messages', async t => {
  const logs = t.mock.method(console, 'error', () => {})
  const calls = mockServices(t, `${userId}/session.flp`, () => { throw new TypeError('private request details') })
  const response = await onRequestPost({ request: request(), env })
  assert.equal(response.status, 502)
  assert.deepEqual(calls, ['storage'])
  assert.deepEqual(logs.mock.calls[0].arguments, ['R2 delete failed', { code: 'RequestFailed', type: 'TypeError' }])
})

test('path traversal never reaches R2 or deletes a database row', async t => {
  for (const key of [`${userId}/../foreign/file.flp`, `${userId}/%2e%2e/foreign/file.flp`,
    `${userId}/project/../../foreign/file.flp`, `${userId}/a\\..\\file.flp`, `${userId}//file.flp`,
    `${userId}/file.flp?other`, { path: 'wrong type' }]) {
    const calls = mockServices(t, key, () => { assert.fail('Must not access storage') })
    assert.equal((await onRequestPost({ request: request(), env })).status, 403)
    assert.deepEqual(calls, [])
    t.mock.restoreAll()
  }
})
