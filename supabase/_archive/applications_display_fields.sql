-- =====================================================
-- CANDIDATE DISPLAY FIELDS ON applications
-- =====================================================
-- Stores the structured fields extracted from each resume (via the fast
-- Groq parser) so the hiring board can show real skills and job title
-- instead of re-deriving them from raw text at render time.
--
-- Run this in the Supabase SQL editor.

alter table applications add column if not exists skills   text[] default '{}';
alter table applications add column if not exists position text;
