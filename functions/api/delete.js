import { AwsClient } from "aws4fetch"
import { isOwnedObjectKey, objectPath } from "../../server/objectKey.js"

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const MAX_FILES_PER_CALL = 40

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  })
}

export async function onRequestPost({ request, env }) {
  try {
    return await deleteTarget({ request, env })
  } catch {
    return json({ error: "Could not complete deletion. Please try again." }, 502)
  }
}

async function deleteTarget({ request, env }) {
  // 1. Who is asking?
  const token = (request.headers.get("Authorization") || "").replace("Bearer ", "")
  if (!token) return json({ error: "Not logged in" }, 401)

  const userRes = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
    headers: { Authorization: `Bearer ${token}`, apikey: env.SUPABASE_ANON_KEY },
  })
  if (!userRes.ok) return json({ error: "Invalid session" }, 401)
  const user = await userRes.json()

  // 2. Exactly one target: a commit OR a project.
  let body
  try {
    body = await request.json()
  } catch {
    return json({ error: "Bad request" }, 400)
  }
  if (!body || typeof body !== "object") return json({ error: "Bad request" }, 400)

  const isCommit = UUID.test(body.commitId || "")
  const isProject = UUID.test(body.projectId || "")
  if (isCommit === isProject) {
    return json({ error: "Send exactly one valid commitId or projectId" }, 400)
  }
  const targetId = isCommit ? body.commitId : body.projectId

  // Helper: talk to the database AS THE USER, so row level security applies.
  const db = (path, init = {}) =>
    fetch(`${env.SUPABASE_URL}/rest/v1/${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: env.SUPABASE_ANON_KEY,
        ...init.headers,
      },
    })

  // 3. Find the files that belong to this target.
  const filter = isCommit ? `id=eq.${targetId}` : `project_id=eq.${targetId}`
  const listRes = await db(`commits?${filter}&select=file_url`)
  if (!listRes.ok) return json({ error: "Lookup failed" }, 502)
  const rows = await listRes.json()
  if (!Array.isArray(rows)) return json({ error: "Lookup failed" }, 502)
  const keys = rows.map(r => r.file_url).filter(Boolean)

  if (keys.length > MAX_FILES_PER_CALL) {
    return json({ error: `Too many files to delete at once (max ${MAX_FILES_PER_CALL})` }, 400)
  }
  // Second lock: every file must live inside the caller's own folder.
  if (keys.some(key => !isOwnedObjectKey(key, user.id))) return json({ error: "Forbidden" }, 403)

  // 4. Delete the files from R2 FIRST.
  if (keys.length > 0) {
    const r2 = new AwsClient({
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
      service: "s3",
      region: "auto",
    })
    const results = await Promise.all(
      keys.map(async key => {
        const path = objectPath(key)
        try {
          const res = await r2.fetch(`${env.R2_ENDPOINT}/${env.R2_BUCKET}/${path}`, { method: "DELETE" })
          if (!res.ok) {
            const body = await res.text()
            // Log only the status and a bounded service error code. Never log
            // object paths, credentials, signed requests, or the raw response.
            const code = body.match(/<Code>([A-Za-z0-9]{1,80})<\/Code>/)?.[1] || "Unknown"
            console.error("R2 delete failed", { status: res.status, code })
          }
          return res.ok
        } catch (error) {
          console.error("R2 delete failed", { code: "RequestFailed", type: error?.name || "Error" })
          return false
        }
      })
    )
    if (results.some(ok => !ok)) {
      return json({ error: "Some files could not be deleted, so the record was kept. Try again." }, 502)
    }
  }

  // 5. Only now delete the database row.
  const table = isCommit ? "commits" : "projects"
  const delRes = await db(`${table}?id=eq.${targetId}`, {
    method: "DELETE",
    headers: { Prefer: "return=representation" },
  })
  if (!delRes.ok) return json({ error: "Could not delete the record" }, 502)
  const deleted = await delRes.json()
  if (deleted.length === 0) return json({ error: "Not found" }, 404)

  return json({ deleted: true, files: keys.length })
}
