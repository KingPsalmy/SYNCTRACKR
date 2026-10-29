import { putFile } from "./uploadTransport.js"

export async function uploadToR2(file, projectId, token, onProgress, { request = fetch, transfer = putFile, uploadState = {} } = {}) {
  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` }
  if (uploadState.key && (uploadState.file !== file || uploadState.projectId !== projectId)) {
    throw new Error("This upload belongs to a different draft.")
  }
  let key = uploadState.key
  if (!key) {
    const res = await request("/api/upload-url", {
      method: "POST", headers,
      body: JSON.stringify({ projectId, fileName: file.name, fileSize: file.size }),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body.error || `Upload request failed (${res.status})`)
    }
    const signed = await res.json()
    key = signed.key
    await transfer(signed.uploadUrl, file, onProgress)
    // Retain only a confirmed PUT, scoped to this exact File and project. A
    // failed verification or database insert can retry without sending bytes.
    Object.assign(uploadState, { key, file, projectId })
  }
  onProgress?.(100)

  // Keep the save pending until the server independently reads R2's object size.
  const verified = await request("/api/verify-upload", {
    method: "POST", headers,
    body: JSON.stringify({ projectId, key, fileSize: file.size }),
  })
  if (!verified.ok) {
    const body = await verified.json().catch(() => ({}))
    throw new Error(body.error || `Could not verify your uploaded file (${verified.status}). This version has not been saved.`)
  }
  const result = await verified.json()
  if (result.verified !== true || result.key !== key || result.size !== file.size) {
    throw new Error("Storage confirmation did not match your file. This version has not been saved.")
  }
  return { key, name: file.name, size: result.size }
}
