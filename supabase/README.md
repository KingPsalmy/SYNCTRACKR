# Database verification

The live schema has not yet been exported or verified. `verify.sql` is a read-only
inspection script, not a migration. It must not be treated as evidence that the
production database already contains the expected protections.

Open the FIRETRACKS project in Supabase, open SQL Editor, and run `verify.sql`.
Export the result sets (or run each SELECT separately if the editor only shows the
last one). These describe columns, RLS, policies, constraints, triggers, functions,
and indexes; they do not read project, version, or plugin records.

Check for `storage_used`, `plugins_text_limits`,
`commits_project_version_unique`, and `commits_assign_version_number`. Inspect
their definitions, not just their presence. Numbering must use a persistent
project counter and remain unique under concurrent inserts. Inserts must verify
project ownership, and updates must prevent moving commits to another project.

Once these results are available, prepare a migration against the actual schema
and review it before applying. Do not wipe existing records. The frontend now
uses `version_number` if present and otherwise says “Saved version”; it does not
invent historical numbers. This frontend change does not implement the counter.

Still required: authenticated tests with two disposable accounts and projects,
including cross-account inserts/updates and delete/new-version numbering checks.
The upload endpoint's ownership check does not protect direct database writes;
those require verified database policies/triggers.
