-- =============================================================================
-- 003: Fix Project RLS Policies
-- =============================================================================
-- Ensures employees CANNOT insert/update/delete projects.
-- Only owner, hr, manager can create/update. Only owner can delete.
-- =============================================================================

-- Only run if org_projects table exists (from 001_saas_foundation.sql)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'org_projects') THEN

        -- Enable RLS
        ALTER TABLE org_projects ENABLE ROW LEVEL SECURITY;

        -- Drop existing policies if any (idempotent)
        DROP POLICY IF EXISTS "projects_select" ON org_projects;
        DROP POLICY IF EXISTS "projects_insert" ON org_projects;
        DROP POLICY IF EXISTS "projects_update" ON org_projects;
        DROP POLICY IF EXISTS "projects_delete" ON org_projects;

        -- SELECT: All org members can view their org's projects
        CREATE POLICY "projects_select" ON org_projects
            FOR SELECT TO authenticated
            USING (
                EXISTS (
                    SELECT 1 FROM organization_members
                    WHERE organization_members.organization_id = org_projects.organization_id
                      AND organization_members.user_id = auth.uid()
                      AND organization_members.is_active = TRUE
                )
            );

        -- INSERT: Only owner, hr, manager can create projects
        CREATE POLICY "projects_insert" ON org_projects
            FOR INSERT TO authenticated
            WITH CHECK (
                EXISTS (
                    SELECT 1 FROM organization_members
                    WHERE organization_members.organization_id = org_projects.organization_id
                      AND organization_members.user_id = auth.uid()
                      AND organization_members.is_active = TRUE
                      AND organization_members.role IN ('owner', 'hr', 'manager')
                )
            );

        -- UPDATE: Only owner, hr, manager can update projects
        CREATE POLICY "projects_update" ON org_projects
            FOR UPDATE TO authenticated
            USING (
                EXISTS (
                    SELECT 1 FROM organization_members
                    WHERE organization_members.organization_id = org_projects.organization_id
                      AND organization_members.user_id = auth.uid()
                      AND organization_members.is_active = TRUE
                      AND organization_members.role IN ('owner', 'hr', 'manager')
                )
            );

        -- DELETE: Only owner can delete projects
        CREATE POLICY "projects_delete" ON org_projects
            FOR DELETE TO authenticated
            USING (
                EXISTS (
                    SELECT 1 FROM organization_members
                    WHERE organization_members.organization_id = org_projects.organization_id
                      AND organization_members.user_id = auth.uid()
                      AND organization_members.is_active = TRUE
                      AND organization_members.role = 'owner'
                )
            );

        RAISE NOTICE 'org_projects RLS policies created successfully.';
    ELSE
        RAISE NOTICE 'org_projects table does not exist — skipping RLS policies.';
    END IF;
END $$;

-- =============================================================================
-- Also fix the legacy `projects` table if it exists
-- =============================================================================
-- Even the old table should have basic protection.

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'projects' AND table_schema = 'public') THEN

        ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

        DROP POLICY IF EXISTS "legacy_projects_select" ON projects;
        DROP POLICY IF EXISTS "legacy_projects_insert" ON projects;
        DROP POLICY IF EXISTS "legacy_projects_delete" ON projects;

        -- SELECT: All authenticated users
        CREATE POLICY "legacy_projects_select" ON projects
            FOR SELECT TO authenticated
            USING (true);

        -- INSERT: Only users with HR_ADMIN or CHAIRMAN role in profiles
        CREATE POLICY "legacy_projects_insert" ON projects
            FOR INSERT TO authenticated
            WITH CHECK (
                EXISTS (
                    SELECT 1 FROM profiles
                    WHERE profiles.id = auth.uid()
                      AND profiles.role IN ('HR_ADMIN')
                )
            );

        -- DELETE: Only users with HR_ADMIN or CHAIRMAN role
        CREATE POLICY "legacy_projects_delete" ON projects
            FOR DELETE TO authenticated
            USING (
                EXISTS (
                    SELECT 1 FROM profiles
                    WHERE profiles.id = auth.uid()
                      AND profiles.role IN ('HR_ADMIN')
                )
            );

        RAISE NOTICE 'Legacy projects table RLS policies created.';
    END IF;
END $$;
