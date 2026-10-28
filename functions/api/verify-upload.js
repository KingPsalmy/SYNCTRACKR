import { AwsClient } from "aws4fetch"

const MAX_FILE_BYTES = 1024 ** 3
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const OBJECT_NAME = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-[a-zA-Z0-9._-]+$/i

function json(body, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } })
}

// A reliability check for the normal save flow. Database RLS still controls
// writes; this endpoint does not make direct client inserts server-verified.
export async function onRequestPost({ request, env }) {
  const token = request.headers.get("Authorization")?.match(/^Bearer (\S+)$/i)?.[1]
  if (!token) return json({ error: "Not logged in" }, 401)

  let body
  try { body = await request.json() } catch { return json({ error: "Bad request" }, 400) }
  const { projectId, key, fileSize } = body || {}
  if (typeof projectId !== "string" || !UUID.test(projectId)
    || typeof key !== "string" || !Number.isSafeInteger(fileSize)
    || fileSize <= 0 || fileSize > MAX_FILE_BYTES) {
    return json({ error: "Invalid upload details" }, 400)
  }

  try {
    const headers = { Authorization: `Bearer ${token}`, apikey: env.SUPABASE_ANON_KEY }
    const userRes = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, { headers })
    if (!userRes.ok) return json({ error: "Could not verify your session" }, userRes.status >= 500 ? 502 : 401)
    const user = await userRes.json()
    if (!UUID.test(user.id || "")) return json({ error: "Invalid session" }, 401)

    const prefix = `${user.id}/${projectId}/`
    if (!key.startsWith(prefix) || !OBJECT_NAME.test(key.slice(prefix.length))) {
      return json({ error: "File does not belong to this project" }, 403)
    }
    const projectRes = await fetch(
      `${env.SUPABASE_URL}/rest/v1/projects?id=eq.${projectId}&select=id,user_id`, { headers })
    if (!projectRes.ok) return json({ error: "Could not check project ownership" }, 502)
    const projects = await projectRes.json()
    if (!Array.isArray(projects)) return json({ error: "Could not check project ownership" }, 502)
    if (!projects.some(project => project.id === projectId && project.user_id === user.id)) {
      return json({ error: "Project not found" }, 404)
    }

    const r2 = new AwsClient({
      accessKeyId: env.R2_ACCESS_KEY_ID, secretAccessKey: env.R2_SECRET_ACCESS_KEY,
      service: "s3", region: "auto", retries: 0,
    })
    const encodedKey = key.split("/").map(encodeURIComponent).join("/")
    const stored = await r2.fetch(`${env.R2_ENDPOINT}/${env.R2_BUCKET}/${encodedKey}`, { method: "HEAD" })
    if (stored.status === 404) {
      return json({ error: "Your file was not found in storage. This version has not been saved." }, 409)
    }
    if (!stored.ok) return json({ error: "Could not verify your file in storage. This version has not been saved." }, 502)
    const length = stored.headers.get("Content-Length")
    const size = length !== null && /^\d+$/.test(length) ? Number(length) : NaN
    if (!Number.isSafeInteger(size)) return json({ error: "Storage did not confirm your file size. This version has not been saved." }, 502)
    if (size !== fileSize) {
      return json({ error: "The stored file size does not match your file. This version has not been saved." }, 409)
    }
    return json({ verified: true, key, size })
  } catch {
    // Never include upstream URLs, tokens, object keys, or raw service errors.
    return json({ error: "Could not verify your upload. Check your connection and try again. This version has not been saved." }, 502)
  }
}
