-- =====================================================
-- RLS POLICIES FOR APPLICATIONS TABLE
-- Run this in Supabase SQL Editor
-- =====================================================

-- Enable RLS on applications
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first (ignore errors if they don't exist)
DROP POLICY IF EXISTS "Authenticated users can view applications" ON applications;
DROP POLICY IF EXISTS "Authenticated users can insert applications" ON applications;
DROP POLICY IF EXISTS "Authenticated users can update applications" ON applications;
DROP POLICY IF EXISTS "Authenticated users can delete applications" ON applications;
DROP POLICY IF EXISTS "Allow public read of specific application fields via ID" ON applications;
DROP POLICY IF EXISTS "Public can view applications" ON applications;
DROP POLICY IF EXISTS "Public can update applications" ON applications;

-- =====================================================
-- AUTHENTICATED USER POLICIES (for HR Dashboard)
-- =====================================================

CREATE POLICY "Authenticated users can view applications"
ON applications FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert applications"
ON applications FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update applications"
ON applications FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete applications"
ON applications FOR DELETE
TO authenticated
USING (true);

-- =====================================================
-- PUBLIC/ANONYMOUS POLICIES (for Assessment Page)
-- Candidates access the assessment without being logged in
-- =====================================================

CREATE POLICY "Public can view applications"
ON applications FOR SELECT
TO anon
USING (true);

-- CRITICAL: Allow anonymous users to update applications
-- This is needed for the assessment submission
CREATE POLICY "Public can update applications"
ON applications FOR UPDATE
TO anon
USING (true);
