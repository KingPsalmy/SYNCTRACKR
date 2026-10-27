-- Read-only: run in the Supabase SQL Editor and export each result set.
-- Includes schema definitions only, not user rows or credentials.
BEGIN TRANSACTION READ ONLY;

SELECT table_name, column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name IN ('projects', 'commits', 'plugins')
ORDER BY table_name, ordinal_position;

SELECT c.relname AS table_name, c.relrowsecurity AS rls_enabled,
       c.relforcerowsecurity AS rls_forced
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relname IN ('projects', 'commits', 'plugins');

SELECT tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename IN ('projects', 'commits', 'plugins')
ORDER BY tablename, policyname;

SELECT c.relname AS table_name, con.conname, pg_get_constraintdef(con.oid) AS definition
FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relname IN ('projects', 'commits', 'plugins')
ORDER BY c.relname, con.conname;

SELECT c.relname AS table_name, t.tgname, pg_get_triggerdef(t.oid) AS definition,
       t.tgenabled, pg_get_functiondef(t.tgfoid) AS function_definition
FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relname IN ('projects', 'commits', 'plugins')
  AND NOT t.tgisinternal
ORDER BY c.relname, t.tgname;

SELECT n.nspname AS schema_name, p.proname, pg_get_functiondef(p.oid) AS definition
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname = 'storage_used' AND p.prokind = 'f';

SELECT tablename, indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public' AND tablename IN ('projects', 'commits', 'plugins');

COMMIT;
