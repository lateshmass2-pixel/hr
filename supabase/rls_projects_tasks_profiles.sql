-- =====================================================
-- RLS POLICIES FOR PROJECTS, TASKS, AND PROFILES TABLES
-- Industrial Grade Security Implementation
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to start fresh
DROP POLICY IF EXISTS "Allow all authenticated access to profiles" ON profiles;
DROP POLICY IF EXISTS "Allow all authenticated access to projects" ON projects;
DROP POLICY IF EXISTS "Allow all authenticated access to tasks" ON tasks;
DROP POLICY IF EXISTS "Allow all authenticated access to project_members" ON project_members;

-- =====================================================
-- PROFILES TABLE POLICIES
-- =====================================================

-- Allow authenticated users to view all profiles (for team selection)
CREATE POLICY "Authenticated users can view profiles"
ON profiles FOR SELECT
TO authenticated
USING (true);

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- =====================================================
-- PROJECTS TABLE POLICIES
-- =====================================================

-- HR_ADMIN: Can view, create, update, delete all projects
CREATE POLICY "HR_ADMIN full access to projects"
ON projects FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'HR_ADMIN'
  )
);

-- STANDARD_USER: Can view projects they lead or are members of
CREATE POLICY "Standard users can view accessible projects"
ON projects FOR SELECT
TO authenticated
USING (
  -- User is team lead
  team_lead_id = auth.uid()
  OR 
  -- User is in project_members table
  EXISTS (
    SELECT 1 FROM project_members
    WHERE project_members.project_id = projects.id
    AND project_members.user_id = auth.uid()
  )
  OR
  -- User is HR_ADMIN (redundant but explicit)
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'HR_ADMIN'
  )
);

-- Allow users to create projects (everyone can create)
CREATE POLICY "Authenticated users can create projects"
ON projects FOR INSERT
TO authenticated
WITH CHECK (true);

-- Only project lead or HR_ADMIN can update project
CREATE POLICY "Project lead can update project"
ON projects FOR UPDATE
TO authenticated
USING (
  team_lead_id = auth.uid()
  OR 
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'HR_ADMIN'
  )
);

-- Only project lead or HR_ADMIN can delete project
CREATE POLICY "Project lead can delete project"
ON projects FOR DELETE
TO authenticated
USING (
  team_lead_id = auth.uid()
  OR 
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'HR_ADMIN'
  )
);

-- =====================================================
-- TASKS TABLE POLICIES
-- =====================================================

-- HR_ADMIN: Can view, create, update, delete all tasks
CREATE POLICY "HR_ADMIN full access to tasks"
ON tasks FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'HR_ADMIN'
  )
);

-- STANDARD_USER: Can view tasks if they have access to the parent project
CREATE POLICY "Users can view tasks for accessible projects"
ON tasks FOR SELECT
TO authenticated
USING (
  -- User has access to the project
  EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = tasks.project_id
    AND (
      projects.team_lead_id = auth.uid()
      OR 
      EXISTS (
        SELECT 1 FROM project_members
        WHERE project_members.project_id = projects.id
        AND project_members.user_id = auth.uid()
      )
    )
  )
);

-- Allow users to create tasks if they have project access
CREATE POLICY "Users can create tasks for accessible projects"
ON tasks FOR INSERT
TO authenticated
WITH CHECK (
  -- User has access to the project
  EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = tasks.project_id
    AND (
      projects.team_lead_id = auth.uid()
      OR 
      EXISTS (
        SELECT 1 FROM project_members
        WHERE project_members.project_id = projects.id
        AND project_members.user_id = auth.uid()
      )
    )
  )
);

-- Allow users to update their assigned tasks (status and proof_url only)
CREATE POLICY "Users can update assigned tasks"
ON tasks FOR UPDATE
TO authenticated
USING (
  -- User is assigned to the task
  assignee_id = auth.uid()
)
WITH CHECK (
  -- User is assigned to the task
  assignee_id = auth.uid()
  AND 
  -- Can only update specific columns
  (
    -- Update to status 'COMPLETED' requires proof_url
    (status = 'COMPLETED' AND proof_url IS NOT NULL AND OLD.status != 'COMPLETED')
    OR
    -- Update from COMPLETED back to IN_PROGRESS for rejected tasks
    (status = 'IN_PROGRESS' AND OLD.status = 'COMPLETED')
    OR
    -- Normal status updates between other statuses
    (status != OLD.status AND status IN ('TODO', 'IN_PROGRESS', 'READY_FOR_REVIEW'))
  )
);

-- Project leads can update any task in their project (for verification)
CREATE POLICY "Project leads can verify tasks"
ON tasks FOR UPDATE
TO authenticated
USING (
  -- User is the project lead
  EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = tasks.project_id
    AND projects.team_lead_id = auth.uid()
  )
)
WITH CHECK (
  -- Can only update verification_status and related fields
  verification_status IS DISTINCT FROM OLD.verification_status
  OR status IS DISTINCT FROM OLD.status
);

-- =====================================================
-- PROJECT_MEMBERS TABLE POLICIES
-- =====================================================

-- HR_ADMIN: Full access
CREATE POLICY "HR_ADMIN full access to project_members"
ON project_members FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'HR_ADMIN'
  )
);

-- Project leads can manage members in their project
CREATE POLICY "Project leads can manage members"
ON project_members FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = project_members.project_id
    AND projects.team_lead_id = auth.uid()
  )
);

-- Users can view their own memberships
CREATE POLICY "Users can view own memberships"
ON project_members FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Allow project leads to add/remove members
CREATE POLICY "Project leads can modify project_members"
ON project_members FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = project_members.project_id
    AND projects.team_lead_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = project_members.project_id
    AND projects.team_lead_id = auth.uid()
  )
);