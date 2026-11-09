-- =============================================================================
-- 005: Candidate display fields on `applications`
-- =============================================================================
-- Stores the structured fields extracted from each resume (via the Groq
-- parser) so the hiring board can render real skills and job title instead of
-- re-deriving them from raw text at render time.
--
-- Consolidates two earlier ad hoc scripts that both added `skills`:
--   - supabase/migrations/add_skills_column.sql   (skills text[])
--   - supabase/applications_display_fields.sql    (skills text[] default '{}', position text)
-- Keeping both risked the column existing with or without a default depending
-- on which script an environment happened to run.
-- =============================================================================

ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS skills text[] DEFAULT '{}';

ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS position text;

-- Backfill the default for rows created by the variant that had none, so
-- application code can rely on `skills` never being NULL.
UPDATE applications SET skills = '{}' WHERE skills IS NULL;

ALTER TABLE applications
  ALTER COLUMN skills SET DEFAULT '{}';
