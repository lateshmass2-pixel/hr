'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { GitBranch, Github, Plus, RefreshCw, Unlink, Link2, Trash2 } from 'lucide-react'

// =============================================================================
// Settings → Integrations → GitHub
// =============================================================================
// Positioning (spec §28): "Work Evidence & Engineering Intelligence" — a
// transparent, employee-visible integration. No covert monitoring.
// =============================================================================

interface ConnectedAccount {
    id: string
    employeeId: string | null
    employeeName: string | null
    githubUsername: string
    displayName: string | null
    email: string | null
    avatarUrl: string | null
    status: string
    lastError: string | null
    connectedAt: string
    lastSyncedAt: string | null
    syncEnabled: boolean
    isBot: boolean
    botType: string | null
    identitySource: string
}

interface ConnectedRepo {
    id: string
    fullName: string
    url: string
    visibility: string
    defaultBranch: string
    isActive: boolean
    syncStatus: string
    lastError: string | null
    lastSyncedAt: string | null
    projectId: string | null
    projectName: string | null
}

const STATUS_COLORS: Record<string, string> = {
    CONNECTED: 'bg-emerald-100 text-emerald-800',
    SYNCED: 'bg-emerald-100 text-emerald-800',
    SYNCING: 'bg-amber-100 text-amber-800',
    ERROR: 'bg-red-100 text-red-800',
    REAUTH_REQUIRED: 'bg-orange-100 text-orange-800',
    DISCONNECTED: 'bg-gray-100 text-gray-600',
}

function statusLabel(status: string): string {
    switch (status) {
        case 'CONNECTED': return 'Connected'
        case 'SYNCED': return 'Synced'
        case 'SYNCING': return 'Syncing…'
        case 'ERROR': return 'Error'
        case 'REAUTH_REQUIRED': return 'Re-auth required'
        case 'DISCONNECTED': return 'Disconnected'
        default: return status
    }
}

export default function GitHubIntegrationsPage() {
    const [accounts, setAccounts] = useState<ConnectedAccount[]>([])
    const [repos, setRepos] = useState<ConnectedRepo[]>([])
    const [projects, setProjects] = useState<Array<{ id: string; name: string }>>([])
    const [isLoading, setIsLoading] = useState(true)
    const [connecting, setConnecting] = useState(false)
    const [syncing, setSyncing] = useState<string | null>(null)

    const [newRepo, setNewRepo] = useState('')
    const [newRepoProject, setNewRepoProject] = useState('')
    const [addingRepo, setAddingRepo] = useState(false)

    const loadData = useCallback(async () => {
        setIsLoading(true)
        try {
            const [accRes, repoRes, projRes] = await Promise.all([
                fetch('/api/github/accounts'),
                fetch('/api/github/repositories'),
                fetch('/api/work-intelligence/projects'),
            ])
            if (accRes.ok) {
                const data = await accRes.json()
                setAccounts(data.accounts ?? [])
            }
            if (repoRes.ok) {
                const data = await repoRes.json()
                setRepos(data.repositories ?? [])
            }
            if (projRes.ok) {
                const data = await projRes.json()
                setProjects(data.projects ?? [])
            }
        } catch {
            toast.error('Failed to load GitHub integration data')
        } finally {
            setIsLoading(false)
        }
    }, [])

    useEffect(() => {
        loadData()
        // Read OAuth result params from the redirect
        const params = new URLSearchParams(window.location.search)
        if (params.get('connected') === 'true') {
            toast.success('GitHub account connected')
            window.history.replaceState({}, '', window.location.pathname)
        }
        const err = params.get('error')
        if (err) {
            toast.error(`GitHub connection failed: ${err}`)
            window.history.replaceState({}, '', window.location.pathname)
        }
    }, [loadData])

    async function handleConnectGitHub() {
        setConnecting(true)
        window.location.href = '/api/auth/github'
    }

    async function handleDisconnect(accountId: string) {
        if (!window.confirm('Disconnect this GitHub account? Existing evidence is retained for audit; new evidence collection stops.')) return
        try {
            const res = await fetch(`/api/github/accounts/${accountId}`, { method: 'DELETE' })
            if (!res.ok) throw new Error()
            toast.success('Account disconnected')
            await loadData()
        } catch {
            toast.error('Failed to disconnect account')
        }
    }

    async function handleToggleSync(accountId: string, enabled: boolean) {
        try {
            const res = await fetch(`/api/github/accounts/${accountId}/sync`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ enabled }),
            })
            if (!res.ok) throw new Error()
            toast.success(enabled ? 'Sync enabled' : 'Sync paused')
            await loadData()
        } catch {
            toast.error('Failed to update sync setting')
        }
    }

    async function handleSyncNow(accountId: string) {
        setSyncing(accountId)
        try {
            const res = await fetch(`/api/github/accounts/${accountId}/sync`, { method: 'POST' })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error)
            toast.success(`Sync finished: ${data.repositories?.length ?? 0} repositories processed`)
            await loadData()
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Sync failed')
        } finally {
            setSyncing(null)
        }
    }

    async function handleAddRepo() {
        if (!newRepo.trim()) return
        setAddingRepo(true)
        try {
            const res = await fetch('/api/github/repositories', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fullName: newRepo.trim(),
                    projectId: newRepoProject || null,
                }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error)
            toast.success(`Connected ${newRepo.trim()}`)
            setNewRepo('')
            setNewRepoProject('')
            await loadData()
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Failed to connect repository')
        } finally {
            setAddingRepo(false)
        }
    }

    async function handleMapProject(repoId: string, projectId: string) {
        try {
            const res = await fetch(`/api/github/repositories?id=${repoId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectId: projectId || null }),
            })
            if (!res.ok) throw new Error()
            toast.success('Project mapping updated')
            await loadData()
        } catch {
            toast.error('Failed to update project mapping')
        }
    }

    async function handleSyncRepo(repoId: string) {
        setSyncing(repoId)
        try {
            const res = await fetch(`/api/github/repositories?id=${repoId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'sync' }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error)
            toast.success('Repository sync completed')
            await loadData()
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Sync failed')
        } finally {
            setSyncing(null)
        }
    }

    async function handleDeactivateRepo(repoId: string) {
        if (!window.confirm('Deactivate this repository? Historical evidence is retained; new events will be ignored.')) return
        try {
            const res = await fetch(`/api/github/repositories?id=${repoId}`, { method: 'DELETE' })
            if (!res.ok) throw new Error()
            toast.success('Repository deactivated')
            await loadData()
        } catch {
            toast.error('Failed to deactivate repository')
        }
    }

    return (
        <div className="p-6 max-w-5xl mx-auto space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-[#0a3b2a] mb-2 flex items-center gap-3">
                    <Github className="h-8 w-8" />
                    GitHub Integration
                </h1>
                <p className="text-[#14532d]/80">
                    Connect GitHub accounts and repositories to collect verifiable work
                    evidence — commits, pull requests, reviews and CI. Employees can see and
                    manage their own connections; all evidence is transparent.
                </p>
            </div>

            {/* Accounts */}
            <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-[#14532d] flex items-center gap-2">
                        <Github className="h-5 w-5" /> Connected Accounts
                        <span className="text-sm font-normal text-slate-400">({accounts.length})</span>
                    </h2>
                    <Button onClick={handleConnectGitHub} disabled={connecting}>
                        <Plus className="h-4 w-4 mr-1" />
                        {connecting ? 'Redirecting…' : 'Connect Account'}
                    </Button>
                </div>

                {isLoading ? (
                    <p className="text-sm text-slate-500 py-6 text-center">Loading…</p>
                ) : accounts.length === 0 ? (
                    <p className="text-sm text-slate-500 py-6 text-center">
                        No GitHub accounts connected yet. Connect an account to start
                        collecting work evidence.
                    </p>
                ) : (
                    <div className="space-y-3">
                        {accounts.map((acc) => (
                            <div key={acc.id} className="border border-slate-100 rounded-xl p-4 flex items-center gap-4">
                                {acc.avatarUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={acc.avatarUrl} alt={acc.githubUsername} className="h-10 w-10 rounded-full" />
                                ) : (
                                    <div className="h-10 w-10 rounded-full bg-[#14532d]/10 text-[#14532d] flex items-center justify-center font-semibold">
                                        {acc.githubUsername.charAt(0).toUpperCase()}
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-medium text-[#0a3b2a]">{acc.githubUsername}</span>
                                        <Badge variant="outline" className={STATUS_COLORS[acc.status] ?? ''}>
                                            {statusLabel(acc.status)}
                                        </Badge>
                                        {acc.isBot && <Badge variant="secondary">Bot</Badge>}
                                        {acc.identitySource === 'oauth' && (
                                            <Badge variant="secondary">Self-connected</Badge>
                                        )}
                                    </div>
                                    <div className="text-xs text-slate-500 mt-1">
                                        {acc.employeeName ? `${acc.employeeName} · ` : ''}
                                        {acc.email ?? 'no email'}
                                        {acc.lastSyncedAt && ` · last synced ${new Date(acc.lastSyncedAt).toLocaleString()}`}
                                    </div>
                                    {acc.lastError && (
                                        <div className="text-xs text-amber-700 mt-1">{acc.lastError}</div>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    <label className="flex items-center gap-1 text-xs text-slate-500">
                                        <Switch
                                            checked={acc.syncEnabled}
                                            onCheckedChange={(v) => handleToggleSync(acc.id, v)}
                                        />
                                        Sync
                                    </label>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleSyncNow(acc.id)}
                                        disabled={syncing === acc.id || !acc.syncEnabled}
                                        title="Sync now"
                                    >
                                        <RefreshCw className={`h-4 w-4 ${syncing === acc.id ? 'animate-spin' : ''}`} />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleDisconnect(acc.id)}
                                        className="hover:bg-red-50 hover:text-red-600"
                                        title="Disconnect"
                                    >
                                        <Unlink className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Card>

            {/* Repositories */}
            <Card className="p-6">
                <h2 className="text-lg font-semibold text-[#14532d] flex items-center gap-2 mb-4">
                    <GitBranch className="h-5 w-5" /> Repositories
                    <span className="text-sm font-normal text-slate-400">({repos.length})</span>
                </h2>

                <div className="flex flex-col sm:flex-row gap-2 mb-4">
                    <Input
                        placeholder="owner/repository (e.g. company/finswitch)"
                        value={newRepo}
                        onChange={(e) => setNewRepo(e.target.value)}
                        className="flex-1"
                    />
                    <select
                        value={newRepoProject}
                        onChange={(e) => setNewRepoProject(e.target.value)}
                        className="border rounded-lg px-3 text-sm bg-white"
                    >
                        <option value="">No project mapping</option>
                        {projects.map((p) => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>
                    <Button onClick={handleAddRepo} disabled={addingRepo || !newRepo.trim()}>
                        {addingRepo ? 'Connecting…' : 'Connect'}
                    </Button>
                </div>

                {repos.length === 0 ? (
                    <p className="text-sm text-slate-500 py-6 text-center">
                        No repositories connected. Connect a repository so pushes, PRs and CI
                        can be recorded as work evidence.
                    </p>
                ) : (
                    <div className="space-y-3">
                        {repos.map((repo) => (
                            <div key={repo.id} className="border border-slate-100 rounded-xl p-4">
                                <div className="flex items-center gap-3 flex-wrap">
                                    <a
                                        href={repo.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="font-medium text-[#0a3b2a] hover:underline"
                                    >
                                        {repo.fullName}
                                    </a>
                                    <Badge variant="outline" className={STATUS_COLORS[repo.syncStatus] ?? ''}>
                                        {statusLabel(repo.syncStatus)}
                                    </Badge>
                                    <Badge variant="secondary">{repo.visibility}</Badge>
                                    {!repo.isActive && <Badge variant="secondary">Inactive</Badge>}
                                    {repo.projectName && (
                                        <Badge variant="outline" className="bg-blue-50 text-blue-800">
                                            <Link2 className="h-3 w-3 mr-1" />
                                            {repo.projectName}
                                        </Badge>
                                    )}
                                </div>
                                {repo.lastError && (
                                    <div className="text-xs text-amber-700 mt-1">{repo.lastError}</div>
                                )}
                                <div className="text-xs text-slate-500 mt-1">
                                    default branch: {repo.defaultBranch}
                                    {repo.lastSyncedAt && ` · last synced ${new Date(repo.lastSyncedAt).toLocaleString()}`}
                                </div>
                                <div className="flex items-center gap-2 mt-3">
                                    <select
                                        value={repo.projectId ?? ''}
                                        onChange={(e) => handleMapProject(repo.id, e.target.value)}
                                        className="border rounded-lg px-2 py-1 text-xs bg-white"
                                    >
                                        <option value="">Map to project…</option>
                                        {projects.map((p) => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                        ))}
                                    </select>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleSyncRepo(repo.id)}
                                        disabled={syncing === repo.id}
                                        title="Sync now"
                                    >
                                        <RefreshCw className={`h-4 w-4 ${syncing === repo.id ? 'animate-spin' : ''}`} />
                                    </Button>
                                    {repo.isActive && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleDeactivateRepo(repo.id)}
                                            className="hover:bg-red-50 hover:text-red-600"
                                            title="Deactivate"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Card>

            <p className="text-xs text-slate-400">
                Webhook endpoint:{' '}
                <code className="bg-slate-100 px-1.5 py-0.5 rounded">
                    /api/integrations/github/webhook
                </code>{' '}
                — configure it in your GitHub repository/organization settings with the same
                secret as <code>GITHUB_WEBHOOK_SECRET</code>. Events: push, pull_request,
                pull_request_review, workflow_run.
            </p>
        </div>
    )
}
