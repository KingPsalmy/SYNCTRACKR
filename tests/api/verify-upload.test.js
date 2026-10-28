import test from 'node:test'
import assert from 'node:assert/strict'
import { onRequestPost } from '../../functions/api/verify-upload.js'

const projectId = '11111111-1111-4111-8111-111111111111'
const userId = '22222222-2222-4222-8222-222222222222'
const key = `${userId}/${projectId}/33333333-3333-4333-8333-333333333333-session.flp`
const env = {
  SUPABASE_URL: 'https://database.example.test', SUPABASE_ANON_KEY: 'test-key',
  R2_ENDPOINT: 'https://storage.example.test', R2_BUCKET: 'test-bucket',
  R2_ACCESS_KEY_ID: 'test-id', R2_SECRET_ACCESS_KEY: 'test-secret',
}
const json = (value, status = 200) => Response.json(value, { status })
const request = (body = { projectId, key, fileSize: 128 }, authenticated = true) => new Request('https://app.example.test/api/verify-upload', {
  method: 'POST', headers: authenticated ? { Authorization: 'Bearer test-token' } : {},
  body: JSON.stringify(body),
})

function mockServices(t, { rows = [{ id: projectId, user_id: userId }], storage = () => new Response(null, { headers: { 'Content-Length': '128' } }) } = {}) {
  const calls = []
  t.mock.method(globalThis, 'fetch', async (input, init) => {
    const url = typeof input === 'string' ? input : input.url
    const method = init?.method || input.method || 'GET'
    calls.push({ url, method })
    if (url.endsWith('/auth/v1/user')) return json({ id: userId })
    if (url.includes('/rest/v1/projects?')) {
      assert.equal(init.headers.Authorization, 'Bearer test-token')
      return json(rows)
    }
    if (url.startsWith(env.R2_ENDPOINT)) {
      assert.equal(method, 'HEAD')
      assert.equal(url, `${env.R2_ENDPOINT}/${env.R2_BUCKET}/${key}`)
      assert.match(input.headers.get('Authorization'), /^AWS4-HMAC-SHA256 /)
      return storage()
    }
    throw new Error('Unexpected request')
  })
  return calls
}

test('verifies an owned R2 object using HEAD without writing or deleting data', async t => {
  const calls = mockServices(t)
  const response = await onRequestPost({ request: request(), env })
  assert.equal(response.status, 200)
  assert.equal(response.headers.get('Cache-Control'), 'no-store')
  assert.deepEqual(await response.json(), { verified: true, key, size: 128 })
  assert.deepEqual(calls.map(call => call.method), ['GET', 'GET', 'HEAD'])
})

test('rejects unauthenticated and malformed verification requests without upstream calls', async t => {
  const calls = t.mock.method(globalThis, 'fetch', () => { throw new Error('Unexpected request') })
  assert.equal((await onRequestPost({ request: request(undefined, false), env })).status, 401)
  for (const body of [null, [], {}, { projectId, key, fileSize: 0 }, { projectId, key, fileSize: 1.5 },
    { projectId, key, fileSize: 1024 ** 3 + 1 }, { projectId, key: {}, fileSize: 128 }]) {
    assert.equal((await onRequestPost({ request: request(body), env })).status, 400)
  }
  assert.equal((await onRequestPost({ request: new Request('https://app.example.test', {
    method: 'POST', headers: { Authorization: 'Bearer test-token' }, body: '{broken',
  }), env })).status, 400)
  assert.equal(calls.mock.callCount(), 0)
})

test('rejects foreign keys and path traversal before project or storage access', async t => {
  const calls = mockServices(t)
  for (const badKey of [key.replace(userId, projectId), key.replace(`/${projectId}/`, `/${userId}/`),
    `${userId}/${projectId}/../session.flp`, `${key}/extra`, `${key}%2fextra`, `${key}?other`]) {
    const response = await onRequestPost({ request: request({ projectId, key: badKey, fileSize: 128 }), env })
    assert.equal(response.status, 403)
  }
  assert.ok(calls.every(call => call.url.endsWith('/auth/v1/user')))
})

test('checks project ownership before storage even when the key looks correct', async t => {
  for (const rows of [[], [{ id: projectId, user_id: 'someone-else' }]]) {
    const calls = mockServices(t, { rows })
    assert.equal((await onRequestPost({ request: request(), env })).status, 404)
    assert.equal(calls.length, 2)
    t.mock.restoreAll()
  }
})

test('does not verify missing, incomplete, or unverifiable R2 objects', async t => {
  for (const [status, length, expected] of [[404, null, 409], [403, null, 502], [503, null, 502],
    [200, '127', 409], [200, '129', 409], [200, '0', 409], [200, null, 502], [200, 'invalid', 502]]) {
    const calls = mockServices(t, { storage: () => new Response(null, {
      status, headers: length === null ? {} : { 'Content-Length': length },
    }) })
    const response = await onRequestPost({ request: request(), env })
    assert.equal(response.status, expected)
    assert.match((await response.json()).error, /not been saved/)
    assert.equal(calls.length, 3)
    t.mock.restoreAll()
  }
})

test('upstream failures fail closed without exposing raw errors', async t => {
  mockServices(t, { storage: () => { throw new Error('private token and object path') } })
  const response = await onRequestPost({ request: request(), env })
  assert.equal(response.status, 502)
  const body = await response.text()
  assert.ok(!body.includes('private token'))
  assert.match(body, /not been saved/)
})

test('authentication and project service failures never reach R2', async t => {
  for (const [authStatus, projectStatus, expected] of [[401, 200, 401], [503, 200, 502], [200, 503, 502]]) {
    const calls = []
    t.mock.method(globalThis, 'fetch', async url => {
      calls.push(url)
      if (url.endsWith('/auth/v1/user')) return json({ id: userId }, authStatus)
      if (url.includes('/rest/v1/projects?')) return json({}, projectStatus)
      throw new Error('Must not reach storage')
    })
    assert.equal((await onRequestPost({ request: request(), env })).status, expected)
    assert.ok(calls.every(url => url.startsWith(env.SUPABASE_URL)))
    t.mock.restoreAll()
  }
})
