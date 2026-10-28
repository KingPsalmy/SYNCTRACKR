# SyncTrackr

Music-project version history built with React/Vite, Supabase, and Cloudflare Pages Functions. Supabase holds accounts and project records; Cloudflare R2 holds attached files.

## Local development

Install dependencies with `npm ci`. Local configuration is kept in ignored files:

- `.env`: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
- `.dev.vars`: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `R2_ENDPOINT`, `R2_BUCKET`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`.

Never commit these files or paste their values into logs or chat.

Run `npm run dev`, then open http://localhost:5173 in Chrome. This builds the initial static files and starts both Vite and Wrangler. Keep that terminal running. Ctrl+C stops both servers. If an older Vite process is already running, stop it first; the frontend deliberately refuses to choose another port because auth redirects and R2 CORS depend on the configured origin.

For separate terminals, use `npm run dev:web` and `npm run dev:api` (run `npm run build` once before the API command). Vite forwards `/api` to Wrangler at `127.0.0.1:8788`. Wrangler uses `.dev.vars` and watches the functions. Tests live outside `functions/` so Cloudflare does not bundle them as endpoints.

### Diagnosing uploads

Run in PowerShell:

```powershell
curl.exe -i -X POST http://localhost:5173/api/upload-url
```

Without a login token, a working API returns `401` and `{"error":"Not logged in"}`. This verifies the local route, not an authenticated upload.

- A blank `502` with port 8788 unavailable means the Functions server is not running. Start both servers with `npm run dev`.
- A JSON error such as `Could not check your storage` comes from the function and needs Supabase configuration/function checks.
- An R2 PUT error happens after the upload link was issued; inspect the storage response and CORS configuration.

After R2 accepts a file, the app calls `/api/verify-upload`. This authenticated
function checks project ownership and reads the object size directly from R2
using a signed HEAD request. The app saves the version only after that size
matches the selected file. File bytes remain in R2; Supabase stores metadata.
Verification errors keep the save form open and do not create a version.

This checks presence and size, not a content checksum or DAW compatibility.
It is a reliability check for the app's save flow, not a database-enforced
upload guarantee: direct Supabase inserts remain subject to the existing RLS.
A verification or database failure after a successful PUT keeps a draft in
memory for this tab. **Retry save** reuses the completed upload, verifies it
again when needed, and uses the same commit UUID. If an insert's response was
lost, the app looks up that UUID before trying another insert. It never upserts
over an existing version. Closing the form or switching projects preserves the
pending draft; **Resume save** opens it again. Notes and the file are locked for
that attempt. Discard checks for an already-saved version before dropping the
draft. The browser is asked to warn before a refresh or tab close while drafts
remain; browsers may suppress that warning.

This recovery is limited to the current tab. Refreshing, closing the tab, signing
out, switching accounts, or discarding a draft drops the recovery state. A PUT
whose success response was lost is not cached and may be uploaded again. Partial
transfers do not resume. Failed/abandoned saves can still leave unreferenced R2
objects; discarding a draft does not delete its file or cancel a server insert
already in flight. Durable pending-upload tracking, safe orphan cleanup, and
atomic quota reservations remain outstanding. No database migration is needed
for the current-tab retry flow; it uses the existing commits primary key.

See [ROADMAP.md](ROADMAP.md) for the current product stage and release gates.

## Checks

```powershell
npm run lint
npm test
npm run build
npm run build:functions
```

The automated endpoint tests mock upstream services. Real Supabase permissions, R2 uploads/downloads, and two-account isolation still require integration verification. See `supabase/README.md` for the read-only database inspection workflow.

GitHub Actions runs these checks on Windows and Linux for pull requests to `main`,
pushes to `main` and `codex/**` branches, and manual workflow runs. It installs the
locked dependencies with Node.js 24 and builds both the frontend and Cloudflare
Functions. The build uses fake Supabase settings, requires no production secrets,
and never deploys or applies SQL migrations. Do not publish CI builds to the live
site; production builds use the real frontend configuration.

Branch protection is a separate repository setting. After the workflow has run,
the checks can be selected as required checks for `main`; adding the workflow
alone does not block merging a failing pull request.

## Deployment

GitHub pushes and Cloudflare Pages deployments are separate. A Git push does not update `synctrackr.pages.dev`.

When ready to deploy explicitly:

```powershell
npm run build
npx wrangler pages deploy dist --project-name synctrackr --branch main
```

Production needs the six Functions variables configured as Pages secrets and the site origin allowed by Supabase authentication and R2 CORS. This repository does not apply database migrations automatically.
