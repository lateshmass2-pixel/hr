-- =====================================================
-- SKILL-BASED FILTERING SCHEMA UPDATE
-- Run this in Supabase SQL Editor
-- =====================================================

-- Add required_skills column to job_postings table
ALTER TABLE job_postings ADD COLUMN IF NOT EXISTS required_skills TEXT[] DEFAULT '{}';

-- Example: How to insert/update a job with skills
-- INSERT INTO job_postings (title, description, required_skills) 
-- VALUES ('Senior Developer', 'Full-stack role', ARRAY['React', 'Node.js', 'PostgreSQL']);

-- Example: How to query jobs with specific skills
-- SELECT * FROM job_postings WHERE 'React' = ANY(required_skills);
