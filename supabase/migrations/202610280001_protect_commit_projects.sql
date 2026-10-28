-- Prepared against the policies, trigger and constraints reported by the owner.
-- Review and approve before running in Supabase SQL Editor. Does not alter rows.
BEGIN;

-- Applies to inserts and to the proposed new row on updates. The existing USING
-- expression still restricts which rows may be selected, updated or deleted.
ALTER POLICY "Users can only see their own commits"
ON public.commits
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.projects AS project
    WHERE project.id = commits.project_id
      AND project.user_id = auth.uid()
  )
);

-- Even moves between two projects owned by the same user are forbidden:
-- a saved version's project determines its numbering and attached-file path.
CREATE FUNCTION public.prevent_commit_project_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
BEGIN
  IF NEW.project_id IS DISTINCT FROM OLD.project_id THEN
    RAISE EXCEPTION 'A saved version cannot be moved to another project'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER commits_prevent_project_change
BEFORE UPDATE ON public.commits
FOR EACH ROW EXECUTE FUNCTION public.prevent_commit_project_change();

COMMIT;
