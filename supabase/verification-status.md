# Database verification status — 28 October 2026

Evidence below was supplied by the owner from the Supabase SQL Editor. These
results have not been independently queried through a database connection.

Confirmed in the supplied results:

- `storage_used` is a STABLE SQL function returning bigint. It totals `file_size`
  from commits where `user_id = auth.uid()` and returns zero for an empty result.
  The supplied definition uses the default invoker security. It counts database
  metadata, not independently verified R2 object sizes.
- `projects.last_version` and `commits.version_number` are integer columns.
- `commits_assign_version_number` is enabled for ordinary inserts. It increments
  `projects.last_version` using an UPDATE filtered by project ID and `auth.uid()`
  ownership, assigns the result to `NEW.version_number`, and rejects a null result.
- `commits_project_version_unique` enforces unique `(project_id, version_number)`.
- Project deletion cascades to commits; commit deletion cascades to plugins.
- `plugins_text_limits` limits plugin names to 1–100 characters, tracks/presets
  to 100, and versions to 50.
- Row-level security is enabled on projects, commits, and plugins.
- Projects and commits have ALL policies using `auth.uid() = user_id`. The original
  WITH CHECK fields were null. Commits now additionally require project ownership
  in an explicit WITH CHECK clause, following the migration below.
- Plugins have an ALL policy requiring their commit to belong to the caller.

Original gap: the commit policy did not check the proposed project's owner, and
the numbering trigger only ran on INSERT. An UPDATE could therefore move an owned
commit to another project. The migration below addresses this gap.

## Applied migration (owner confirmed)

`migrations/202610280001_protect_commit_projects.sql` adds an explicit project
ownership check and prevents changing an existing commit's project. It does not
renumber versions, delete records, or touch R2 files. It changes one policy and
adds one function/trigger in a transaction. Existing objects with the new names
cause an error rather than being silently overwritten. The owner approved and
ran this script successfully, then supplied query results confirming both the
enabled `commits_prevent_project_change` trigger and the full project ownership
WITH CHECK expression. Do not rerun it on this database; it is saved here for
version control and future environments. It is not a complete baseline migration.

The matching rollback file is for approved recovery only. It restores the old
policy behavior and removes the new trigger, reopening the ownership gap.

## Checks after application

The definitions and RLS enablement have been checked using the owner's supplied
results. Against staging or explicitly approved disposable records, still verify:

1. Account A can create a version on A's project.
2. Account A cannot create a version on B's project.
3. Account A cannot move its version to B's project or a different project of A.
4. Updating a version note while keeping its project unchanged still works.
5. Rejected writes leave the original records and counters unchanged.

Use an authenticated ordinary-user session for these tests, not the SQL Editor's
default administrative role, which bypasses RLS. No two-account test has run yet.
The existing JavaScript tests/build do not validate SQL behavior.

Remaining verification: column defaults/nullability, counter stability after
deleting/saving, and authenticated isolation tests. This is not a complete
baseline schema export.

## R2 production deletion

On 28 October 2026, production deletion returned R2 `403 AccessDenied`, while
the local credentials could delete. After owner approval, the four production R2
settings were replaced with the working local values for the existing account
and bucket, and Pages was redeployed. The owner confirmed live deletion works.
No credentials are stored in this repository. API deletion diagnostics now log
only HTTP status, a bounded R2 error code, or an exception type. Tests verify that
storage failure keeps the database record and successful storage deletion
precedes database deletion. This does not replace the pending isolation tests.
