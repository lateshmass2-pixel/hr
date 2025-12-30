-- =====================================================
-- OFFER LETTER SCHEMA UPDATE
-- Run this in Supabase SQL Editor
-- =====================================================

-- Add offer letter columns to applications table
ALTER TABLE applications ADD COLUMN IF NOT EXISTS offer_letter_content TEXT;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS offer_role TEXT;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS offer_salary TEXT;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS offer_start_date DATE;

-- Add HIRED status to the enum if not exists
-- Note: In PostgreSQL, you need to add enum values carefully
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'HIRED' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'application_status')
    ) THEN
        ALTER TYPE application_status ADD VALUE 'HIRED';
    END IF;
END $$;
