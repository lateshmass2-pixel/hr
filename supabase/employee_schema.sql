-- =====================================================
-- EMPLOYEE DASHBOARD SCHEMA UPDATE
-- Run this in Supabase SQL Editor
-- =====================================================

-- The work_logs table already exists with columns:
-- id, user_id, date, content, manager_feedback, status, created_at

-- Add the hours_worked column if it doesn't exist
ALTER TABLE work_logs ADD COLUMN IF NOT EXISTS hours_worked DECIMAL(4,2) DEFAULT 8.0;

-- Add check constraint for hours
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'work_logs_hours_check'
    ) THEN
        ALTER TABLE work_logs ADD CONSTRAINT work_logs_hours_check 
            CHECK (hours_worked > 0 AND hours_worked <= 24);
    END IF;
END $$;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_work_logs_user_date ON work_logs(user_id, date DESC);

-- =====================================================
-- RLS POLICIES FOR WORK_LOGS
-- =====================================================

ALTER TABLE work_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first
DROP POLICY IF EXISTS "Users can view own work logs" ON work_logs;
DROP POLICY IF EXISTS "Users can insert own work logs" ON work_logs;
DROP POLICY IF EXISTS "Users can update own work logs" ON work_logs;
DROP POLICY IF EXISTS "Users can delete own work logs" ON work_logs;
DROP POLICY IF EXISTS "Users can CRUD their own logs" ON work_logs;
DROP POLICY IF EXISTS "work_logs_select" ON work_logs;
DROP POLICY IF EXISTS "work_logs_update" ON work_logs;

-- Employees can view their own logs
CREATE POLICY "Users can view own work logs" ON work_logs
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- Employees can insert their own logs
CREATE POLICY "Users can insert own work logs" ON work_logs
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Employees can update their own logs (same day only)
CREATE POLICY "Users can update own work logs" ON work_logs
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id AND date = CURRENT_DATE);

-- Employees can delete their own logs (same day only)
CREATE POLICY "Users can delete own work logs" ON work_logs
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id AND date = CURRENT_DATE);
