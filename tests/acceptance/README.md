# Live acceptance checks

These checks are separate from `npm test`. The ordinary test suite mocks
services and never signs into Supabase or uploads to R2.

The live runner uses **two disposable, verified email/password accounts** in the
same Supabase project as the target site. It uses ordinary user sessions and the
existing public Supabase configuration in `.env`. It does not need an admin,
service-role, database password, or R2 secret. It does not create auth accounts,
change schema, or open a DAW.

## One-time setup

1. Create two accounts used only for testing. You can use the site's signup flow
   and confirm each email, or add the users in Supabase Authentication. Do not use
   an account containing real music projects. Keep each password local.
2. Copy `.env.acceptance.example` to `.env.acceptance.local` in the project root.
   Files ending in `.local` are ignored by Git. Fill in both emails and passwords
   in your editor, not in terminal arguments or chat. Quote passwords containing
   `#` or other dotenv-special characters. Never publish this file.
3. Set `ACCEPTANCE_APP_ORIGIN` to the intended site. It defaults to
   `https://synctrackr.pages.dev`. For local testing use `http://localhost:5173`
   and start both Vite and Wrangler with `npm run dev`.
4. Run the preflight, which reads configuration only:

   ```powershell
   npm run test:acceptance
   ```

## Run against the selected environment

On localhost:

```powershell
npm run test:acceptance -- --run
```

Against the configured deployed site (creates and deletes test data):

```powershell
npm run test:acceptance -- --run --allow-production
```

The remote flag is a deliberate guard against running the suite accidentally.
Check the configured target before using it. The runner creates two projects
named `SyncTrackr acceptance <unique run ID> A/B`, uploads one generated 64 KiB
binary fixture to R2, and creates test versions/plugin notes. It never uploads
your local music files. Cleanup checks exact generated project IDs, owners,
names, commit IDs and object keys before calling the normal delete endpoint.

## What is checked

- Upload, actual R2 size verification, authenticated download, and SHA-256/size
  comparison against the generated original bytes.
- Reuse of a confirmed upload after a **simulated** verification outage.
- Recovery after a **simulated** lost insert/lookup response, using a real saved
  commit and the same production save workflow modules.
- Rejection of nonexistent objects and incorrect claimed file sizes.
- Account B cannot sign uploads, verify files, download or delete A's fixtures.
- Direct database project/commit/plugin reads and writes respect ownership;
  an owned commit cannot be moved into another account's project.
- Version deletion removes the object and cascades its plugin notes.

The runner is an API-level check. It does **not** test browser refresh recovery,
actual network disconnections, large/resumable uploads, browser CORS, schema
definitions, atomic quotas, or opening a project in a DAW. A passing result does
not complete the whole private-beta gate in ROADMAP.md.

## Reports and cleanup

The runner checkpoints generated IDs and recorded keys to
`.wrangler/acceptance/<run-id>.json` before writes where possible. This directory
is ignored by Git. Reports omit credentials, tokens and signed URLs. Failures
identify the stage without dumping upstream error text.

Cleanup runs even after failures, using the same normal user permissions. If an
upload exists without a commit, it tries to attach that run's recorded key to its
preselected test commit ID, then deletes the test project through the API. It
does not remove arbitrary R2 objects or force deletion after an ownership/scope
mismatch. A `needs-attention` result means cleanup is incomplete: retain the
report, inspect the exact listed fixture IDs, and clean them up deliberately.
Do not broaden cleanup to every project matching the name prefix. A process
termination or total outage can leave test data behind; the ledger makes that
visible but is not a guarantee of automatic cleanup.

## Current acceptance status

As of 29 October 2026, the runner has not been executed with live test accounts.
The default preflight and mocked safety tests are not evidence that production
isolation or the complete live restore flow passes. Update this status only
after reviewing a real run report and its cleanup results.
