import { supabase } from "./supabase"
import { uploadToR2 } from "./uploadWorkflow"

export async function uploadFile(file, projectId, onProgress, uploadState, userId) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error("Not logged in")
  if (session.user.id !== userId) throw new Error("Your account changed. Sign in again before saving.")
  return uploadToR2(file, projectId, session.access_token, onProgress, { uploadState })
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

export async function deleteOnServer({ commitId, projectId }) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error("Not logged in")

  const res = await fetch("/api/delete", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ commitId, projectId }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `Delete failed (${res.status})`)
  }
}
