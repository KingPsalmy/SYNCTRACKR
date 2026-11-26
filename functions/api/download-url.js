import { AwsClient } from "aws4fetch"
import { isOwnedObjectKey, objectPath } from "../../server/objectKey.js"

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  })
}

export async function onRequestPost({ request, env }) {
  try {
    return await download({ request, env })
  } catch {
    return json({ error: "Could not prepare your download. Please try again." }, 502)
  }
}

async function download({ request, env }) {
  // 1. Who is asking? (same check as the upload function)
  const token = (request.headers.get("Authorization") || "").replace("Bearer ", "")
  if (!token) return json({ error: "Not logged in" }, 401)

  const userRes = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
    headers: { Authorization: `Bearer ${token}`, apikey: env.SUPABASE_ANON_KEY },
  })
  if (!userRes.ok) return json({ error: "Invalid session" }, 401)
  const user = await userRes.json()

  // 2. Which commit do they want?
  let body
  try {
    body = await request.json()
  } catch {
    return json({ error: "Bad request" }, 400)
  }
  const { commitId } = body || {}
  if (!UUID.test(commitId || "")) return json({ error: "Invalid commit" }, 400)

  // 3. Look the commit up AS THE USER, so row level security applies.
  const commitRes = await fetch(
    `${env.SUPABASE_URL}/rest/v1/commits?id=eq.${commitId}&select=file_url,file_name`,
    { headers: { Authorization: `Bearer ${token}`, apikey: env.SUPABASE_ANON_KEY } }
  )
  if (!commitRes.ok) return json({ error: "Lookup failed" }, 502)
  const rows = await commitRes.json()
  if (!Array.isArray(rows)) return json({ error: "Lookup failed" }, 502)
  const commit = rows[0]
  if (!commit || !commit.file_url) return json({ error: "No file for this commit" }, 404)

  // 4. Second lock: the file must live inside the caller's own folder.
  if (!isOwnedObjectKey(commit.file_url, user.id)) return json({ error: "Forbidden" }, 403)

  // 5. Create a presigned download link, valid for 5 minutes.
  const safeName = (commit.file_name || "download").replace(/[^a-zA-Z0-9._ -]/g, "_")
  const r2 = new AwsClient({
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    service: "s3",
    region: "auto",
  })
  const url = new URL(`${env.R2_ENDPOINT}/${env.R2_BUCKET}/${objectPath(commit.file_url)}`)
  url.searchParams.set("X-Amz-Expires", "300")
  url.searchParams.set("response-content-disposition", `attachment; filename="${safeName}"`)
  const signed = await r2.sign(new Request(url, { method: "GET" }), {
    aws: { signQuery: true },
  })

  return json({ downloadUrl: signed.url })
}
