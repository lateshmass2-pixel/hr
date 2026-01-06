-- Migration: Update tasks table to use profiles for assignment
-- This script is idempotent and safe to run multiple times

-- Step 1: Add assigned_to column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tasks' AND column_name = 'assigned_to'
    ) THEN
        ALTER TABLE tasks ADD COLUMN assigned_to UUID;
    END IF;
END $$;

-- Step 2: Drop old foreign key constraint if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'tasks_assigned_to_fkey' 
        AND table_name = 'tasks'
    ) THEN
        ALTER TABLE tasks DROP CONSTRAINT tasks_assigned_to_fkey;
    END IF;
END $$;

-- Step 3: Add new foreign key to profiles
ALTER TABLE tasks 
ADD CONSTRAINT tasks_assigned_to_fkey 
FOREIGN KEY (assigned_to) 
REFERENCES profiles(id) 
ON DELETE SET NULL;

-- Step 4: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);

-- Step 5: Update RLS policies for tasks
-- Drop old policies
DROP POLICY IF EXISTS "Allow all authenticated access to tasks" ON tasks;
DROP POLICY IF EXISTS "HR can manage all tasks" ON tasks;
DROP POLICY IF EXISTS "Employees can view assigned tasks" ON tasks;
DROP POLICY IF EXISTS "Employees can update own task status" ON tasks;

-- Enable RLS
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- HR can do everything with tasks
CREATE POLICY "HR can manage all tasks"
ON tasks
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'HR_ADMIN'
  )
);

-- Employees can view tasks assigned to them
CREATE POLICY "Employees can view assigned tasks"
ON tasks
FOR SELECT
TO authenticated
USING (
  auth.uid() = assigned_to
  OR
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'HR_ADMIN'
  )
);

-- Employees can update status of their own tasks
CREATE POLICY "Employees can update own task status"
ON tasks
FOR UPDATE
TO authenticated
USING (auth.uid() = assigned_to)
WITH CHECK (auth.uid() = assigned_to);

-- Step 6: Update RLS policies for projects
-- Drop old policies
DROP POLICY IF EXISTS "Allow all authenticated access to projects" ON projects;
DROP POLICY IF EXISTS "HR can manage all projects" ON projects;
DROP POLICY IF EXISTS "Employees can view projects" ON projects;

-- Enable RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- HR can manage all projects
CREATE POLICY "HR can manage all projects"
ON projects
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'HR_ADMIN'
  )
);

-- Employees can view all projects
CREATE POLICY "Employees can view projects"
ON projects
FOR SELECT
TO authenticated
USING (true);

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Migration completed successfully!';
    RAISE NOTICE 'Tasks table now references profiles for employee assignment.';
END $$;
