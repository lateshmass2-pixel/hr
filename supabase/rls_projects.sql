-- =====================================================
-- RLS POLICIES FOR PROJECTS MODULE
-- Run this in Supabase SQL Editor
-- =====================================================

-- Enable RLS on projects table (if not already enabled)
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Enable RLS on tasks table (if not already enabled)
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- PROJECTS POLICIES
-- =====================================================

-- Allow authenticated users to view all projects
CREATE POLICY "Authenticated users can view projects"
ON projects FOR SELECT
TO authenticated
USING (true);

-- Allow authenticated users to insert projects
CREATE POLICY "Authenticated users can create projects"
ON projects FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow users to update projects they created (or all if HR_ADMIN)
CREATE POLICY "Users can update their own projects"
ON projects FOR UPDATE
TO authenticated
USING (
    created_by = auth.uid() 
    OR EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role = 'HR_ADMIN'
    )
);

-- Allow users to delete projects they created (or all if HR_ADMIN)
CREATE POLICY "Users can delete their own projects"
ON projects FOR DELETE
TO authenticated
USING (
    created_by = auth.uid() 
    OR EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role = 'HR_ADMIN'
    )
);

-- =====================================================
-- TASKS POLICIES
-- =====================================================

-- Allow authenticated users to view all tasks
CREATE POLICY "Authenticated users can view tasks"
ON tasks FOR SELECT
TO authenticated
USING (true);

-- Allow authenticated users to insert tasks
CREATE POLICY "Authenticated users can create tasks"
ON tasks FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow authenticated users to update tasks
CREATE POLICY "Authenticated users can update tasks"
ON tasks FOR UPDATE
TO authenticated
USING (true);

-- Allow authenticated users to delete tasks
CREATE POLICY "Authenticated users can delete tasks"
ON tasks FOR DELETE
TO authenticated
USING (true);
