import { AwsClient } from "aws4fetch"

const MAX_FILE_BYTES = 1024 * 1024 * 1024 // 1 GB per file
const FREE_QUOTA_BYTES = 5 * 1024 * 1024 * 1024 // 5 GB per account (Free plan)
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const gb = n => `${(n / 1024 ** 3).toFixed(2)} GB`

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}

export async function onRequestPost({ request, env }) {
  // 1. Who is asking? Read the login token the browser sent.
  const token = (request.headers.get("Authorization") || "").replace("Bearer ", "")
  if (!token) return json({ error: "Not logged in" }, 401)

  // 2. Don't trust the token, ask Supabase to verify it.
  const userRes = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
    headers: { Authorization: `Bearer ${token}`, apikey: env.SUPABASE_ANON_KEY },
  })
  if (!userRes.ok) return json({ error: "Invalid session" }, 401)
  const user = await userRes.json()

  // 3. Read and validate what the browser wants to upload.
  let body
  try {
    body = await request.json()
  } catch {
    return json({ error: "Bad request" }, 400)
  }
  const { projectId, fileName, fileSize } = body || {}
  if (!UUID.test(projectId || "")) return json({ error: "Invalid project" }, 400)
  if (typeof fileName !== "string" || !fileName) return json({ error: "Missing file name" }, 400)
  if (!Number.isSafeInteger(fileSize) || fileSize <= 0 || fileSize > MAX_FILE_BYTES) {
    return json({ error: "File too large or empty" }, 400)
  }

  // Verify the project exists and belongs to this caller before signing any link.
  // Use the caller's token so RLS also applies; check ownership explicitly as well.
  const projectRes = await fetch(
    `${env.SUPABASE_URL}/rest/v1/projects?id=eq.${projectId}&select=id,user_id`,
    { headers: { Authorization: `Bearer ${token}`, apikey: env.SUPABASE_ANON_KEY } }
  )
  if (!projectRes.ok) return json({ error: "Could not check project ownership" }, 502)
  const projects = await projectRes.json()
  if (!projects.some(project => project.id === projectId && project.user_id === user.id)) {
    return json({ error: "Project not found" }, 404)
  }

  // 4. Storage limit: how much does this user already store?
  const usedRes = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/storage_used`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: env.SUPABASE_ANON_KEY,
      "Content-Type": "application/json",
    },
    body: "{}",
  })
  if (!usedRes.ok) return json({ error: "Could not check your storage" }, 502)
  const used = Number(await usedRes.json())
  if (!Number.isFinite(used)) return json({ error: "Could not check your storage" }, 502)
  if (used + fileSize > FREE_QUOTA_BYTES) {
    return json(
      { error: `Storage limit reached: ${gb(used)} of ${gb(FREE_QUOTA_BYTES)} used, and this file is ${gb(fileSize)}.` },
      403
    )
  }

  // 5. Decide where the file will live inside the bucket.
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_")
  const key = `${user.id}/${projectId}/${crypto.randomUUID()}-${safeName}`

  // 6. Create a presigned upload link, valid for 10 minutes.
  const r2 = new AwsClient({
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    service: "s3",
    region: "auto",
  })
  const url = new URL(`${env.R2_ENDPOINT}/${env.R2_BUCKET}/${key}`)
  url.searchParams.set("X-Amz-Expires", "600")
  const signed = await r2.sign(new Request(url, { method: "PUT" }), {
    aws: { signQuery: true },
  })

  return json({ uploadUrl: signed.url, key })
}
