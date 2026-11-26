import test from 'node:test'
import assert from 'node:assert/strict'
import { runAcceptance } from '../../scripts/acceptance-suite.mjs'
import { onRequestPost as upload } from '../../functions/api/upload-url.js'
import { onRequestPost as verify } from '../../functions/api/verify-upload.js'
import { onRequestPost as download } from '../../functions/api/download-url.js'
import { onRequestPost as remove } from '../../functions/api/delete.js'

// This is a fake service model for testing the runner's control flow and cleanup,
// not evidence of production RLS. No requests leave the process.
test('acceptance runner completes its fixture lifecycle and cleanup with simulated services', async t => {
  const owners = { a: '11111111-1111-4111-8111-111111111111', b: '22222222-2222-4222-8222-222222222222' }
  const env = {
    SUPABASE_URL: 'https://database.example.test', SUPABASE_ANON_KEY: 'fake-key',
    R2_ENDPOINT: 'https://0123456789abcdef0123456789abcdef.r2.cloudflarestorage.com',
    R2_BUCKET: 'fake-bucket', R2_ACCESS_KEY_ID: 'fake-id', R2_SECRET_ACCESS_KEY: 'fake-secret',
  }
  const data = { projects: new Map(), commits: new Map(), plugins: new Map() }
  const storage = new Map()
  let puts = 0
  const response = (value, status = 200) => Response.json(value, { status })
  const owns = (table, row, user) => table === 'plugins'
    ? data.commits.get(row.commit_id)?.user_id === user : row.user_id === user
  function erase(table, id) {
    if (table === 'projects') for (const row of data.commits.values()) if (row.project_id === id) erase('commits', row.id)
    if (table === 'commits') for (const row of data.plugins.values()) if (row.commit_id === id) erase('plugins', row.id)
    data[table].delete(id)
  }
  async function fakeFetch(input, init) {
    const req = input instanceof Request ? input : new Request(input, init)
    const url = new URL(req.url)
    const user = owners[req.headers.get('Authorization')?.replace('Bearer ', '')]
    if (url.origin === 'https://app.example.test') {
      const handler = { '/api/upload-url': upload, '/api/verify-upload': verify,
        '/api/download-url': download, '/api/delete': remove }[url.pathname]
      assert.ok(handler, 'Unexpected API route')
      return handler({ request: req, env })
    }
    if (url.origin === env.R2_ENDPOINT) {
      if (req.method === 'PUT') { puts++; storage.set(url.pathname, new Uint8Array(await req.arrayBuffer())); return new Response(null) }
      if (req.method === 'DELETE') { storage.delete(url.pathname); return new Response(null, { status: 204 }) }
      const bytes = storage.get(url.pathname)
      if (!bytes) return new Response(null, { status: 404 })
      return new Response(req.method === 'HEAD' ? null : bytes, { headers: { 'Content-Length': String(bytes.length) } })
    }
    assert.equal(url.origin, env.SUPABASE_URL, 'Unexpected external destination')
    if (url.pathname === '/auth/v1/token') {
      const body = await req.json()
      const token = body.email === 'a@example.test' ? 'a' : 'b'
      return response({ access_token: token, user: { id: owners[token] } })
    }
    if (url.pathname === '/auth/v1/user') return user ? response({ id: user }) : response({}, 401)
    if (url.pathname === '/rest/v1/rpc/storage_used') {
      return response([...data.commits.values()].filter(row => row.user_id === user).reduce((sum, row) => sum + (row.file_size || 0), 0))
    }
    const table = url.pathname.split('/').at(-1)
    assert.ok(data[table], 'Unexpected table')
    const matching = () => [...data[table].values()].filter(row => owns(table, row, user)
      && [...url.searchParams].every(([key, value]) => !value.startsWith('eq.') || String(row[key]) === value.slice(3)))
    if (req.method === 'GET') return response(matching())
    if (req.method === 'POST') {
      const row = await req.json()
      if (data[table].has(row.id)) return response({}, 409)
      if (table === 'projects' && row.user_id !== user) return response({}, 403)
      if (table === 'commits') {
        if (row.user_id !== user || data.projects.get(row.project_id)?.user_id !== user) return response({}, 403)
        Object.assign(row, { file_url: row.file_url ?? null, file_name: row.file_name ?? null, file_size: row.file_size ?? null,
          created_at: new Date().toISOString(), version_number: data.commits.size + 1 })
      }
      if (table === 'plugins' && data.commits.get(row.commit_id)?.user_id !== user) return response({}, 403)
      data[table].set(row.id, row)
      return response([row], 201)
    }
    if (req.method === 'PATCH') {
      const patch = await req.json()
      if (patch.project_id) return response({}, 400)
      const found = matching()
      found.forEach(row => Object.assign(row, patch))
      return response(found)
    }
    if (req.method === 'DELETE') {
      const found = matching()
      found.forEach(row => erase(table, row.id))
      return response(found)
    }
    assert.fail('Unexpected method')
  }
  t.mock.method(globalThis, 'fetch', fakeFetch)
  const reports = []
  const report = await runAcceptance({ origin: 'https://app.example.test', supabaseUrl: env.SUPABASE_URL,
    anonKey: env.SUPABASE_ANON_KEY, accounts: [{ email: 'a@example.test', password: 'fake-a' }, { email: 'b@example.test', password: 'fake-b' }] }, {
    runId: 'fixture-run', request: fakeFetch, checkpoint: async state => reports.push(JSON.stringify(state)), log() {},
  })
  assert.equal(report.passed, true, JSON.stringify(report.checks))
  assert.equal(report.checks.length, 11)
  assert.equal(puts, 1)
  assert.equal(storage.size, 0)
  for (const table of Object.values(data)) assert.equal(table.size, 0)
  assert.equal(report.cleanup.length, 2)
  assert.ok(report.cleanup.every(item => item.status === 'removed'))
  assert.ok(!reports.join('').includes('fake-secret'))
  assert.ok(!reports.join('').includes('fake-a'))
})
