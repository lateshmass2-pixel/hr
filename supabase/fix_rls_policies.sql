-- Fix RLS policies for projects to allow employees to create projects
-- Drop all existing policies first
DROP POLICY IF EXISTS "Admins can do everything on projects" ON projects;
DROP POLICY IF EXISTS "Employees can view projects" ON projects;
DROP POLICY IF EXISTS "Authenticated users can create projects" ON projects;
DROP POLICY IF EXISTS "All authenticated users can view projects" ON projects;
DROP POLICY IF EXISTS "Users can update their own projects" ON projects;
DROP POLICY IF EXISTS "HR_ADMIN can manage all projects" ON projects;

-- Create new policies
-- Employees can create projects
CREATE POLICY "Authenticated users can create projects"
  ON projects FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Users can view all projects
CREATE POLICY "All authenticated users can view projects"
  ON projects FOR SELECT
  USING (auth.role() = 'authenticated');

-- Users can update projects they created
CREATE POLICY "Users can update their own projects"
  ON projects FOR UPDATE
  USING (auth.uid() = created_by);

-- HR_ADMIN can do anything on projects
CREATE POLICY "HR_ADMIN can manage all projects"
  ON projects FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'HR_ADMIN'
    )
  );

-- Also ensure tasks table allows creation
DROP POLICY IF EXISTS "Admins can do everything on tasks" ON tasks;
DROP POLICY IF EXISTS "Admins can manage all tasks" ON tasks;
DROP POLICY IF EXISTS "Authenticated users can create tasks" ON tasks;

CREATE POLICY "Admins can manage all tasks"
  ON tasks FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'HR_ADMIN'
    )
  );

CREATE POLICY "Authenticated users can create tasks"
  ON tasks FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');
