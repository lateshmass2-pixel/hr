-- =============================================================================
-- Coding Workspace Schema — 4 New Tables + RLS
-- =============================================================================
-- Run this in Supabase SQL Editor
-- These tables are independent and do NOT alter existing tables.
-- =============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- 1. project_workspaces — One workspace per project (optionally per task)
-- =============================================================================

CREATE TABLE IF NOT EXISTS project_workspaces (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id UUID NOT NULL,
    task_id UUID,
    title TEXT DEFAULT 'Workspace',
    created_by UUID REFERENCES auth.users(id),
    organization_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(project_id, task_id)
);

-- =============================================================================
-- 2. workspace_files — Code files stored as text
-- =============================================================================

CREATE TABLE IF NOT EXISTS workspace_files (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    workspace_id UUID NOT NULL REFERENCES project_workspaces(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    language TEXT NOT NULL DEFAULT 'javascript',
    content TEXT DEFAULT '',
    updated_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_modified TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(workspace_id, file_name)
);

-- =============================================================================
-- 3. workspace_commits — Version snapshots
-- =============================================================================

CREATE TABLE IF NOT EXISTS workspace_commits (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    workspace_id UUID NOT NULL REFERENCES project_workspaces(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    snapshot JSONB NOT NULL DEFAULT '[]'::jsonb,
    files_changed INTEGER DEFAULT 0,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- 4. workspace_activity — Activity log for progress tracking
-- =============================================================================

CREATE TABLE IF NOT EXISTS workspace_activity (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    workspace_id UUID NOT NULL REFERENCES project_workspaces(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    action TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- Indexes for performance
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_workspace_project ON project_workspaces(project_id);
CREATE INDEX IF NOT EXISTS idx_workspace_org ON project_workspaces(organization_id);
CREATE INDEX IF NOT EXISTS idx_workspace_files_ws ON workspace_files(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_commits_ws ON workspace_commits(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_commits_created ON workspace_commits(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_workspace_activity_ws ON workspace_activity(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_activity_created ON workspace_activity(created_at DESC);

-- =============================================================================
-- RLS Policies
-- =============================================================================

ALTER TABLE project_workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_commits ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_activity ENABLE ROW LEVEL SECURITY;

-- Authenticated users can access all workspace data (org-scoping handled in app layer)
CREATE POLICY "workspace_select" ON project_workspaces
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "files_select" ON workspace_files
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "commits_select" ON workspace_commits
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "activity_select" ON workspace_activity
    FOR ALL USING (auth.role() = 'authenticated');
