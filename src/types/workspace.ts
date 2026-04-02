// =============================================================================
// Workspace Types — Coding Workspace Feature
// =============================================================================

export interface Workspace {
    id: string
    project_id: string
    task_id: string | null
    title: string
    created_by: string
    organization_id: string | null
    created_at: string
    updated_at: string
}

export interface WorkspaceFile {
    id: string
    workspace_id: string
    file_name: string
    language: string
    content: string
    updated_by: string | null
    created_at: string
    last_modified: string
}

export interface WorkspaceCommit {
    id: string
    workspace_id: string
    message: string
    snapshot: WorkspaceFileSnapshot[]
    files_changed: number
    created_by: string
    created_at: string
    // Joined fields
    author_name?: string
    author_avatar?: string
}

export interface WorkspaceFileSnapshot {
    file_name: string
    language: string
    content: string
}

export interface WorkspaceActivity {
    id: string
    workspace_id: string
    user_id: string
    action: WorkspaceActionType
    metadata: Record<string, unknown>
    created_at: string
    // Joined fields
    user_name?: string
}

export type WorkspaceActionType =
    | 'file_create'
    | 'file_update'
    | 'file_delete'
    | 'file_rename'
    | 'commit'
    | 'run_code'
    | 'workspace_open'

export interface WorkspaceMetrics {
    total_commits: number
    total_files: number
    last_active: string | null
    coding_hours_estimate: number
    recent_activity: WorkspaceActivity[]
}

// =============================================================================
// Code Execution Types
// =============================================================================

export type SupportedLanguage = 'javascript' | 'python' | 'typescript' | 'html' | 'css' | 'json' | 'markdown'

export interface CodeExecutionResult {
    stdout: string
    stderr: string
    error: string | null
    executionTime: number
    status: 'success' | 'error' | 'timeout'
}

export const LANGUAGE_MAP: Record<string, { label: string; extension: string; icon: string; runnable: boolean }> = {
    javascript: { label: 'JavaScript', extension: '.js', icon: '🟨', runnable: true },
    typescript: { label: 'TypeScript', extension: '.ts', icon: '🔷', runnable: false },
    python: { label: 'Python', extension: '.py', icon: '🐍', runnable: true },
    html: { label: 'HTML', extension: '.html', icon: '🌐', runnable: false },
    css: { label: 'CSS', extension: '.css', icon: '🎨', runnable: false },
    json: { label: 'JSON', extension: '.json', icon: '📋', runnable: false },
    markdown: { label: 'Markdown', extension: '.md', icon: '📝', runnable: false },
}

export function detectLanguage(fileName: string): string {
    const ext = fileName.split('.').pop()?.toLowerCase() || ''
    const map: Record<string, string> = {
        js: 'javascript',
        jsx: 'javascript',
        ts: 'typescript',
        tsx: 'typescript',
        py: 'python',
        html: 'html',
        css: 'css',
        json: 'json',
        md: 'markdown',
    }
    return map[ext] || 'javascript'
}
