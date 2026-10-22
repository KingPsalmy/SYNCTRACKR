import { supabase } from "./supabase"

export async function uploadFile(file, projectId) {
  // 1. Get the current login token from the Supabase session.
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error("Not logged in")

  // 2. Ask our server function for a presigned upload link.
  const res = await fetch("/api/upload-url", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ projectId, fileName: file.name, fileSize: file.size }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `Upload request failed (${res.status})`)
  }
  const { uploadUrl, key } = await res.json()

  // 3. Send the file straight to R2 using that link.
  const put = await fetch(uploadUrl, {
    method: "PUT",
    body: file,
    headers: { "Content-Type": file.type || "application/octet-stream" },
  })
  if (!put.ok) throw new Error(`Storage upload failed (${put.status})`)

  return { key, name: file.name, size: file.size }
}

// 1536000 -> "1.5 MB"
export function formatBytes(bytes) {
  if (!bytes) return "0 B"
  const units = ["B", "KB", "MB", "GB"]
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  return `${(bytes / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`
}

export async function getDownloadUrl(commitId) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error("Not logged in")

  const res = await fetch("/api/download-url", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ commitId }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `Download request failed (${res.status})`)
  }
  const { downloadUrl } = await res.json()
  return downloadUrl
}