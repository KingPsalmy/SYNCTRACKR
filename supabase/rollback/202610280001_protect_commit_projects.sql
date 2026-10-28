-- Recovery only, after explicit approval: this restores the prior ownership gap.
-- Run only if the corresponding migration was applied successfully.
BEGIN;

DROP TRIGGER commits_prevent_project_change ON public.commits;
DROP FUNCTION public.prevent_commit_project_change();

-- Explicitly reproduces the old implicit WITH CHECK (same as USING).
ALTER POLICY "Users can only see their own commits"
ON public.commits
WITH CHECK (auth.uid() = user_id);

COMMIT;
