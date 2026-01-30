-- Add interview-related columns to applications table for scheduling interviews
ALTER TABLE applications ADD COLUMN IF NOT EXISTS interview_date DATE;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS interview_time TEXT;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS interview_type TEXT;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS interviewer TEXT;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS interview_link TEXT;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS interview_notes TEXT;
