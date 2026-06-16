'use client'

import { useState, useCallback, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
    Play, 
    Save, 
    History, 
    Box, 
    ArrowLeft, 
    Loader2, 
    Info, 
    LayoutDashboard, 
    CheckCircle, 
    Clock, 
    Sparkles, 
    ChevronRight, 
    ChevronLeft 
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useHems } from '@/context/HemsContext'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { FileExplorer } from './FileExplorer'
import { CodeEditor } from './CodeEditor'
import { ConsoleOutput, type ConsoleEntry } from './ConsoleOutput'
import { CommitHistory } from './CommitHistory'
import { executeCode } from '@/lib/code-runner'
import type { Workspace, WorkspaceFile, WorkspaceCommit } from '@/types/workspace'
import {
    createWorkspaceFile,
    updateFileContent,
    deleteWorkspaceFile,
    renameWorkspaceFile,
    commitWorkspace,
    logCodeExecution
} from '@/app/dashboard/projects/[id]/workspace/actions'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface WorkspaceLayoutProps {
    workspace: Workspace
    initialFiles: WorkspaceFile[]
    initialCommits: WorkspaceCommit[]
    readOnly?: boolean
}

export function WorkspaceLayout({
    workspace,
    initialFiles,
    initialCommits,
    readOnly = false,
}: WorkspaceLayoutProps) {
    const router = useRouter()
    
    const { tasks, currentUser, moveTask, userRole, getProjectRole } = useHems()
    const projectRole = getProjectRole(workspace.project_id)

    // State
    const [files, setFiles] = useState<WorkspaceFile[]>(initialFiles)
    const [commits, setCommits] = useState<WorkspaceCommit[]>(initialCommits)
    const [activeFileId, setActiveFileId] = useState<string | null>(initialFiles[0]?.id || null)
    const [openTabs, setOpenTabs] = useState<WorkspaceFile[]>(initialFiles[0] ? [initialFiles[0]] : [])
    
    const [consoleEntries, setConsoleEntries] = useState<ConsoleEntry[]>([])
    const [isRunning, setIsRunning] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    
    const [showCommitHistory, setShowCommitHistory] = useState(false)
    const [showCommitDialog, setShowCommitDialog] = useState(false)
    const [commitMessage, setCommitMessage] = useState('')
    const [isCommitting, setIsCommitting] = useState(false)

    // Task Panel State
    const [showTaskPanel, setShowTaskPanel] = useState(true)
    const [proofLink, setProofLink] = useState("")
    const [submittingTaskId, setSubmittingTaskId] = useState<string | null>(null)

    // Derived state
    const projectTasks = tasks.filter(t => t.projectId === workspace.project_id)
    const myTasks = projectTasks.filter(t => t.assigneeId === currentUser.id)
    const displayTasks = projectRole === 'LEADER' || userRole === 'HR' ? projectTasks : myTasks

    // Derived state
    const activeFile = files.find(f => f.id === activeFileId) || null

    // System Log
    const logSystem = useCallback((msg: string) => {
        setConsoleEntries(prev => [...prev, {
            id: Date.now().toString(),
            type: 'system',
            content: msg,
            timestamp: new Date()
        }])
    }, [])

    // Ensure tab sync when files delete/rename
    useEffect(() => {
        setOpenTabs(open => open.map(t => files.find(f => f.id === t.id)).filter(Boolean) as WorkspaceFile[])
        if (activeFileId && !files.some(f => f.id === activeFileId)) {
            setActiveFileId(null)
        }
    }, [files, activeFileId])

    // =========================================================================
    // File Management
    // =========================================================================

    const handleCreateFile = async (name: string, language: string) => {
        const result = await createWorkspaceFile(workspace.id, name, language)
        if (result.success && result.file) {
            setFiles(prev => [...prev, result.file!])
            setOpenTabs(prev => [...prev, result.file!])
            setActiveFileId(result.file.id)
            logSystem(`Created file: ${name}`)
            router.refresh()
        } else {
            toast.error(result.error || 'Failed to create file')
        }
    }

    const handleDeleteFile = async (fileId: string) => {
        const file = files.find(f => f.id === fileId)
        if (!file) return

        if (!confirm(`Are you sure you want to delete ${file.file_name}?`)) return

        const result = await deleteWorkspaceFile(fileId, workspace.id)
        if (result.success) {
            setFiles(prev => prev.filter(f => f.id !== fileId))
            logSystem(`Deleted file: ${file.file_name}`)
            router.refresh()
        } else {
            toast.error(result.error || 'Failed to delete file')
        }
    }

    const handleRenameFile = async (fileId: string, newName: string, newLanguage: string) => {
        const result = await renameWorkspaceFile(fileId, newName, newLanguage)
        if (result.success) {
            setFiles(prev => prev.map(f => 
                f.id === fileId ? { ...f, file_name: newName, language: newLanguage } : f
            ))
            logSystem(`Renamed file to: ${newName}`)
            router.refresh()
        } else {
            toast.error(result.error || 'Failed to rename file')
        }
    }

    const handleContentChange = (fileId: string, content: string) => {
        setFiles(prev => prev.map(f => 
            f.id === fileId ? { ...f, content, _isDirty: true } : f
        ))
    }

    // =========================================================================
    // Save & Run
    // =========================================================================

    const handleSave = async () => {
        if (readOnly) return
        
        const dirtyFiles = files.filter((f: any) => f._isDirty)
        if (dirtyFiles.length === 0) return

        setIsSaving(true)
        try {
            for (const file of dirtyFiles) {
                await updateFileContent(file.id, file.content, workspace.id)
            }
            
            setFiles(prev => prev.map(f => ({ ...f, _isDirty: false })))
            toast.success('All files saved')
            logSystem(`Saved ${dirtyFiles.length} file(s)`)
        } catch (error) {
            console.error('Save error:', error)
            toast.error('Failed to save files')
        } finally {
            setIsSaving(false)
        }
    }

    const handleRun = async () => {
        if (!activeFile) {
            toast.warning('No file selected to run')
            return
        }

        if (!['javascript', 'python'].includes(activeFile.language)) {
            toast.warning(`Execution for ${activeFile.language} is not supported in the browser yet.`)
            return
        }

        setIsRunning(true)
        setConsoleEntries([])
        logSystem(`Executing ${activeFile.file_name}...`)

        // Save active file first if dirty
        if ((activeFile as any)._isDirty && !readOnly) {
            await handleSave()
        }

        try {
            const result = await executeCode(activeFile.content, activeFile.language)
            
            const entries: ConsoleEntry[] = []
            
            if (result.stdout) {
                entries.push({
                    id: Date.now().toString() + '-stdout',
                    type: 'stdout',
                    content: result.stdout.trimEnd(),
                    timestamp: new Date()
                })
            }
            
            if (result.stderr) {
                entries.push({
                    id: Date.now().toString() + '-stderr',
                    type: 'stderr',
                    content: result.stderr.trimEnd(),
                    timestamp: new Date()
                })
            }

            if (result.error && result.status !== 'error') { // Actual internal errors
                 entries.push({
                    id: Date.now().toString() + '-error',
                    type: 'error',
                    content: result.error,
                    timestamp: new Date()
                })
            }

            entries.push({
                id: Date.now().toString() + '-sys',
                type: result.status === 'success' ? 'system' : 'error',
                content: `Process exited with status: ${result.status}`,
                timestamp: new Date(),
                executionTime: result.executionTime
            })

            setConsoleEntries(prev => [...prev, ...entries])

            // Log execution metrics to backend for progress tracking
            if (!readOnly) {
                await logCodeExecution(workspace.id, activeFile.language, result.status)
            }
            
        } catch (error) {
            setConsoleEntries(prev => [...prev, {
                id: Date.now().toString(),
                type: 'error',
                content: `Runtime Environment Error: ${error}`,
                timestamp: new Date()
            }])
        } finally {
            setIsRunning(false)
        }
    }

    const handleTaskCompletion = async (taskId: string) => {
        if (!proofLink.trim()) {
            toast.error("Please provide a proof link")
            return
        }
        
        moveTask(taskId, "Done", proofLink.trim())
        toast.success("Task submitted for review")
        setProofLink("")
        setSubmittingTaskId(null)
    }

    // =========================================================================
    // Version Control (Commits)
    // =========================================================================

    const handleCommit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!commitMessage.trim()) return

        await handleSave() // Ensure everything is saved first
        
        setIsCommitting(true)
        const result = await commitWorkspace(workspace.id, commitMessage.trim())
        
        if (result.success && result.commit) {
            setCommits([result.commit, ...commits])
            toast.success('Workspace committed successfully')
            setShowCommitDialog(false)
            setCommitMessage('')
            logSystem(`Created commit: ${result.commit.message.substring(0, 30)}...`)
            router.refresh()
        } else {
            toast.error(result.error || 'Failed to commit workspace')
        }
        setIsCommitting(false)
    }

    return (
        <div className="flex flex-col h-screen max-h-[calc(100vh-4rem)] bg-[#0D1117] text-gray-200 font-sans border rounded-lg overflow-hidden border-emerald-900/40 shadow-xl shadow-emerald-900/10">
            {/* Top Toolbar */}
            <div className="flex items-center justify-between px-4 h-14 bg-[#0A3B2A] border-b border-emerald-800/50">
                <div className="flex items-center gap-4">
                    <Link href={`/dashboard/projects/${workspace.project_id}`}>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-100 hover:text-white hover:bg-emerald-800/50">
                            <ArrowLeft size={16} />
                        </Button>
                    </Link>
                    <div className="flex items-center gap-2">
                        <Box size={18} className="text-emerald-400" />
                        <h1 className="font-semibold text-lg text-emerald-50">Project Workspace</h1>
                        {readOnly && (
                            <span className="ml-2 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 uppercase tracking-widest">
                                View Only
                            </span>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        className={cn(
                            "h-8 gap-2 text-emerald-100 hover:text-white hover:bg-emerald-800/50",
                            showTaskPanel && "bg-emerald-800/40"
                        )}
                        onClick={() => setShowTaskPanel(!showTaskPanel)}
                    >
                        <LayoutDashboard size={14} /> Tasks
                    </Button>

                    <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 gap-2 text-emerald-100 hover:text-white hover:bg-emerald-800/50"
                        onClick={() => setShowCommitHistory(true)}
                    >
                        <History size={14} /> History
                    </Button>
                    
                    {!readOnly && (
                        <>
                            <div className="w-px h-5 bg-emerald-800/50 mx-1" />
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-8 gap-2 text-emerald-100 hover:text-white hover:bg-emerald-800/50"
                                onClick={handleSave}
                                disabled={isSaving}
                            >
                                {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} 
                                Save
                            </Button>
                            <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-8 gap-2 border-emerald-600 text-emerald-100 hover:bg-emerald-800 hover:text-white"
                                onClick={() => setShowCommitDialog(true)}
                            >
                                Commit
                            </Button>
                            <Button 
                                size="sm" 
                                className="h-8 gap-2 bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-semibold"
                                onClick={handleRun}
                                disabled={isRunning || !activeFile}
                            >
                                {isRunning ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} fill="currentColor" />} 
                                Run
                            </Button>
                        </>
                    )}
                </div>
            </div>

            {/* Main Layout Area */}
            <div className="flex flex-1 min-h-0 bg-[#0D1117]">
                {/* File Explorer (Left Panel) */}
                <div className="w-64 border-r border-white/5 shrink-0 flex flex-col">
                    <FileExplorer
                        files={files}
                        activeFileId={activeFileId}
                        onFileSelect={(file) => {
                            setActiveFileId(file.id)
                            if (!openTabs.find(t => t.id === file.id)) setOpenTabs(prev => [...prev, file])
                        }}
                        onFileCreate={handleCreateFile}
                        onFileDelete={handleDeleteFile}
                        onFileRename={handleRenameFile}
                        readOnly={readOnly}
                    />
                </div>

                {/* Editor & Console (Main Area) */}
                <div className="flex-1 flex flex-col min-w-0">
                    <div className="flex-1 min-h-0">
                        <CodeEditor
                            files={files}
                            activeFile={activeFile}
                            openTabs={openTabs}
                            onTabSelect={(file) => setActiveFileId(file.id)}
                            onTabClose={(id) => {
                                setOpenTabs(prev => prev.filter(t => t.id !== id))
                                if (activeFileId === id) setActiveFileId(openTabs[openTabs.length - 2]?.id || null)
                            }}
                            onContentChange={handleContentChange}
                            onSave={handleSave}
                            onRun={handleRun}
                            readOnly={readOnly}
                        />
                    </div>
                    
                    {/* Console Resizable Split */}
                    <div className="h-[30%] shrink-0 flex flex-col">
                        <ConsoleOutput
                            entries={consoleEntries}
                            onClear={() => setConsoleEntries([])}
                            isRunning={isRunning}
                        />
                    </div>
                </div>

                {/* Task Panel (Right Sidebar) */}
                {showTaskPanel && (
                    <motion.div 
                        initial={{ width: 0, opacity: 0 }}
                        animate={{ width: 320, opacity: 1 }}
                        className="border-l border-white/10 bg-[#0D1117]/80 backdrop-blur-xl flex flex-col overflow-hidden relative z-20 shadow-2xl"
                    >
                        <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/5 to-transparent pointer-events-none" />
                        <div className="p-4 border-b border-white/5 flex items-center justify-between bg-emerald-950/20">
                            <h2 className="font-semibold text-emerald-100 flex items-center gap-2">
                                <LayoutDashboard size={16} /> Task HUD
                            </h2>
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6 text-gray-400 hover:text-white"
                                onClick={() => setShowTaskPanel(false)}
                            >
                                <ChevronRight size={16} />
                            </Button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {displayTasks.length === 0 ? (
                                <div className="text-center py-8">
                                    <p className="text-gray-500 text-sm">No tasks assigned to you in this project.</p>
                                </div>
                            ) : (
                                displayTasks.map(task => (
                                    <div 
                                        key={task.id}
                                        className={cn(
                                            "p-4 rounded-xl border bg-white/5 group transition-all duration-300",
                                            task.status === 'Done' ? "border-emerald-500/30 bg-emerald-500/5 opacity-80" : "border-emerald-800/20 hover:border-emerald-500/40"
                                        )}
                                    >
                                        <div className="flex items-start justify-between mb-2">
                                            <span className={cn(
                                                "text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded",
                                                task.priority === 'High' ? "bg-red-500/20 text-red-400" :
                                                task.priority === 'Medium' ? "bg-blue-500/20 text-blue-400" :
                                                "bg-gray-500/20 text-gray-400"
                                            )}>
                                                {task.priority}
                                            </span>
                                            {task.status === 'Done' ? (
                                                <CheckCircle size={14} className="text-emerald-500" />
                                            ) : (
                                                <Clock size={14} className="text-amber-500" />
                                            )}
                                        </div>
                                        <p className="text-sm font-medium text-gray-100 mb-3">{task.title}</p>
                                        
                                        {task.status !== 'Done' && !readOnly && (
                                            <div className="space-y-3 pt-2 border-t border-white/5">
                                                {submittingTaskId === task.id ? (
                                                    <div className="space-y-2 animate-in fade-in slide-in-from-top-1">
                                                        <Input 
                                                            placeholder="Proof URL (GitHub/Link)"
                                                            value={proofLink}
                                                            onChange={(e) => setProofLink(e.target.value)}
                                                            className="h-8 text-xs bg-[#0D1117] border-emerald-500/30 focus-visible:ring-emerald-500/50"
                                                        />
                                                        <div className="flex gap-2">
                                                            <Button 
                                                                size="sm" 
                                                                className="flex-1 h-7 text-[10px] bg-emerald-600 hover:bg-emerald-500 text-white"
                                                                onClick={() => handleTaskCompletion(task.id)}
                                                            >
                                                                Submit Proof
                                                            </Button>
                                                            <Button 
                                                                size="sm" 
                                                                variant="ghost"
                                                                className="h-7 text-[10px] text-gray-400"
                                                                onClick={() => setSubmittingTaskId(null)}
                                                            >
                                                                Cancel
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <Button 
                                                        variant="outline" 
                                                        size="sm" 
                                                        className="w-full h-8 text-xs border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300"
                                                        onClick={() => setSubmittingTaskId(task.id)}
                                                    >
                                                        Mark as Done
                                                    </Button>
                                                )}
                                            </div>
                                        )}

                                        {task.status === 'Done' && (
                                            <p className="text-[10px] text-emerald-400/60 mt-1 italic">
                                                {task.verificationStatus === 'Verified' ? '✓ Verified by Lead' : 'Pending verification...'}
                                            </p>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>

                        {/* AI Assistant Hook */}
                        <div className="p-4 bg-emerald-950/30 border-t border-white/5">
                            <Button 
                                className="w-full gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-900/20"
                                onClick={() => toast.info("AI Analysis: Task requirements are standard for this project phase.")}
                            >
                                <Sparkles size={14} /> Ask AI Assistant
                            </Button>
                        </div>
                    </motion.div>
                )}
            </div>

            {/* Slide-out Commit History Panel */}
            <CommitHistory
                commits={commits}
                isOpen={showCommitHistory}
                onClose={() => setShowCommitHistory(false)}
                onRestoreCommit={readOnly ? undefined : (commit) => {
                    // In a full implementation, you'd load the snippet back into the DB
                    // For this prototype, we'll inform the user
                    toast.info('Feature in development. For now, you can copy code from the history view.', { duration: 5000 })
                }}
            />

            {/* Commit Dialog */}
            <Dialog open={showCommitDialog} onOpenChange={setShowCommitDialog}>
                <DialogContent className="sm:max-w-[425px] border-emerald-900/50 bg-[#0D1117] text-gray-200">
                    <DialogHeader>
                        <DialogTitle className="text-emerald-50">Create a Commit</DialogTitle>
                        <DialogDescription className="text-gray-400">
                            Snapshot the current state of your code to track progress.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCommit} className="space-y-4 pt-4">
                        <div className="space-y-2">
                            <Label htmlFor="message" className="text-gray-300">Commit Message</Label>
                            <Input
                                id="message"
                                value={commitMessage}
                                onChange={(e) => setCommitMessage(e.target.value)}
                                placeholder="e.g., Added authentication api integration"
                                className="bg-white/5 border-emerald-500/30 text-white focus-visible:ring-emerald-500/50"
                                autoFocus
                            />
                        </div>
                        <div className="flex items-start gap-2 p-3 bg-emerald-500/10 rounded-md border border-emerald-500/20">
                            <Info size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                            <p className="text-xs text-emerald-200/80 leading-relaxed">
                                {files.filter((f: any) => f._isDirty).length > 0 
                                    ? `All ${files.length} file(s) will be saved and committed.`
                                    : `Creating a snapshot of ${files.length} file(s).`
                                }
                            </p>
                        </div>
                        <DialogFooter>
                            <Button 
                                type="button" 
                                variant="ghost" 
                                onClick={() => setShowCommitDialog(false)}
                                className="text-gray-400 hover:text-white"
                            >
                                Cancel
                            </Button>
                            <Button 
                                type="submit" 
                                disabled={isCommitting || !commitMessage.trim()}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white"
                            >
                                {isCommitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Create Snapshot
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    )
}
