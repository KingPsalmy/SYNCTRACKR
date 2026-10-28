import test from 'node:test'
import assert from 'node:assert/strict'
import { putFile } from './uploadTransport.js'

function request() {
  return { upload: {}, open(method, url) { this.method = method; this.url = url },
    setRequestHeader(name, value) { this.header = [name, value] }, send(body) { this.body = body } }
}

test('upload progress does not resolve before R2 confirms success', async () => {
  const xhr = request()
  const file = { type: 'audio/wav' }
  const progress = []
  let finished = false
  const pending = putFile('https://storage.example.test/signed', file, value => progress.push(value), () => xhr)
    .then(() => { finished = true })
  xhr.upload.onprogress({ lengthComputable: true, loaded: 50, total: 100 })
  xhr.upload.onprogress({ lengthComputable: true, loaded: 100, total: 100 })
  await Promise.resolve()
  assert.equal(finished, false)
  assert.deepEqual(progress, [50, 100])
  assert.equal(xhr.method, 'PUT')
  assert.equal(xhr.body, file)
  assert.deepEqual(xhr.header, ['Content-Type', 'audio/wav'])
  xhr.status = 200
  xhr.onload()
  await pending
  assert.equal(finished, true)
})

test('failed uploads reject even after reporting all bytes sent', async () => {
  for (const failure of ['http', 'network', 'abort']) {
    const xhr = request()
    const pending = putFile('https://storage.example.test/signed', {}, undefined, () => xhr)
    const rejected = assert.rejects(pending, /Storage upload failed|Upload interrupted|Upload cancelled/)
    xhr.upload.onprogress({ lengthComputable: true, loaded: 10, total: 10 })
    if (failure === 'http') { xhr.status = 403; xhr.onload() }
    if (failure === 'network') xhr.onerror()
    if (failure === 'abort') xhr.onabort()
    await rejected
  }
})
