import test from 'node:test'
import assert from 'node:assert/strict'
import { createSaveAttempt, findSavedAttempt, saveVersion } from './saveVersion.js'
import { uploadToR2 } from './uploadWorkflow.js'

const file = { name: 'session.flp', size: 128 }
const draft = () => createSaveAttempt({ userId: 'owner', projectId: 'project', message: ' Mix notes ', file }, 'stable-id')
const metadata = { key: 'owner/project/object', name: file.name, size: file.size }
const record = payload => ({ ...payload, version_number: 8, created_at: '2026-10-28T00:00:00Z' })

function services(overrides = {}) {
  return {
    assertAccount() {}, findCommit: async () => null,
    upload: async () => metadata, insertCommit: async payload => record(payload),
    ...overrides,
  }
}

test('save retry reuses the R2 upload and primary key after a failed database insert', async () => {
  const attempt = draft()
  let transfers = 0
  let signatures = 0
  let verifications = 0
  const inserts = []
  const deps = services({
    upload: (attempt, progress) => uploadToR2(attempt.file, attempt.projectId, 'token', progress, {
      uploadState: attempt.uploadState,
      request: async url => {
        if (url === '/api/upload-url') {
          signatures++
          return Response.json({ key: metadata.key, uploadUrl: 'https://storage.example.test/signed' })
        }
        verifications++
        return Response.json({ verified: true, key: metadata.key, size: file.size })
      },
      transfer: async () => { transfers++ },
    }),
    insertCommit: async payload => {
      inserts.push({ ...payload })
      if (inserts.length === 1) throw new Error('Database unavailable')
      return record(payload)
    },
  })
  await assert.rejects(saveVersion(attempt, deps), /Database unavailable/)
  const saved = await saveVersion(attempt, deps)
  assert.equal(saved.id, 'stable-id')
  assert.equal(saved.message, 'Mix notes')
  assert.equal(signatures, 1)
  assert.equal(transfers, 1)
  assert.equal(verifications, 2)
  assert.deepEqual(inserts[0], inserts[1])
})

test('recovers a successful insert whose response was lost', async () => {
  const attempt = draft()
  let stored
  let uploads = 0
  let inserts = 0
  let reads = 0
  const deps = services({
    upload: async () => { uploads++; return metadata },
    insertCommit: async payload => { inserts++; stored = record(payload); throw new Error('Response lost') },
    findCommit: async () => {
      if (++reads === 1) throw new Error('Still offline')
      return stored
    },
  })
  await assert.rejects(saveVersion(attempt, deps), /Still offline/)
  assert.deepEqual(await saveVersion(attempt, deps), stored)
  assert.equal(uploads, 1)
  assert.equal(inserts, 1)
})

test('a delayed original insert wins safely without an upsert on retry', async () => {
  const attempt = draft()
  const inserted = []
  let stored = null
  const deps = services({
    findCommit: async () => stored,
    insertCommit: async payload => {
      inserted.push(payload.id)
      if (inserted.length === 1) throw new Error('Timeout')
      stored = record(payload) // First request has now committed on the server.
      throw new Error('Duplicate primary key')
    },
  })
  await assert.rejects(saveVersion(attempt, deps), /Timeout/)
  assert.equal((await saveVersion(attempt, deps)).id, 'stable-id')
  assert.deepEqual(inserted, ['stable-id', 'stable-id'])
})

test('an uncertain save cannot be retried when its existence cannot be checked', async () => {
  const attempt = draft()
  let inserts = 0
  const deps = services({
    insertCommit: async () => { inserts++; throw new Error('Write failed') },
    findCommit: async () => { throw new Error('Lookup unavailable') },
  })
  await assert.rejects(saveVersion(attempt, deps), /Lookup unavailable/)
  await assert.rejects(saveVersion(attempt, deps), /Lookup unavailable/)
  assert.equal(inserts, 1)
})

test('does not recover a mismatched record or overwrite it', async () => {
  const attempt = draft()
  const saved = await saveVersion(attempt, services())
  await assert.rejects(saveVersion(attempt, services({
    findCommit: async () => ({ ...saved, project_id: 'another-project' }),
    insertCommit: async () => { assert.fail('Must not write') },
  })), /does not match/)
})

test('account changes stop a save after upload and before database insert', async () => {
  const attempt = draft()
  let changed = false
  await assert.rejects(saveVersion(attempt, services({
    assertAccount() { if (changed) throw new Error('Account changed') },
    upload: async () => { changed = true; return metadata },
    insertCommit: async () => { assert.fail('Must not write for another account') },
  })), /Account changed/)
  assert.equal(attempt.insertStarted, false)
})

test('notes without attachments use the same retry protection', async () => {
  const attempt = createSaveAttempt({ userId: 'owner', projectId: 'project', message: 'Notes', file: null }, 'note-id')
  let stored = null
  const deps = services({
    upload: async () => { assert.fail('No attachment to upload') },
    insertCommit: async payload => { stored = record(payload); throw new Error('Lost response') },
    findCommit: async () => stored,
  })
  const saved = await saveVersion(attempt, deps)
  assert.equal(saved.file_url, null)
  assert.equal(saved.file_size, null)
  assert.deepEqual(await findSavedAttempt(attempt, deps), saved)
})
