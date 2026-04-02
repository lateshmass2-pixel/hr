'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    GitCommitHorizontal,
    Clock,
    FileCode,
    ChevronRight,
    X,
    History,
    User,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'
import type { WorkspaceCommit } from '@/types/workspace'

interface CommitHistoryProps {
    commits: WorkspaceCommit[]
    isOpen: boolean
    onClose: () => void
    onRestoreCommit?: (commit: WorkspaceCommit) => void
}

export function CommitHistory({
    commits,
    isOpen,
    onClose,
    onRestoreCommit,
}: CommitHistoryProps) {
    const [expandedCommit, setExpandedCommit] = useState<string | null>(null)

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Overlay */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/40 z-40"
                        onClick={onClose}
                    />

                    {/* Panel */}
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                        className="fixed right-0 top-0 bottom-0 w-96 bg-[#0F172A] border-l border-white/10 z-50 flex flex-col shadow-2xl"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
                            <div className="flex items-center gap-2">
                                <History size={16} className="text-emerald-400" />
                                <h3 className="text-sm font-semibold text-white">Commit History</h3>
                                <span className="bg-white/10 text-gray-400 px-1.5 py-0.5 rounded-full text-[10px] font-bold">
                                    {commits.length}
                                </span>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-gray-400 hover:text-white hover:bg-white/10"
                                onClick={onClose}
                            >
                                <X size={14} />
                            </Button>
                        </div>

                        {/* Commit List */}
                        <ScrollArea className="flex-1">
                            <div className="p-3 space-y-1">
                                {commits.length === 0 ? (
                                    <div className="text-center py-12">
                                        <GitCommitHorizontal size={32} className="mx-auto text-gray-700 mb-3" />
                                        <p className="text-sm text-gray-500 font-medium">No commits yet</p>
                                        <p className="text-xs text-gray-600 mt-1">
                                            Save and commit your work to track progress
                                        </p>
                                    </div>
                                ) : (
                                    commits.map((commit, index) => (
                                        <motion.div
                                            key={commit.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: index * 0.03 }}
                                        >
                                            <button
                                                onClick={() =>
                                                    setExpandedCommit(
                                                        expandedCommit === commit.id ? null : commit.id
                                                    )
                                                }
                                                className={cn(
                                                    'w-full text-left p-3 rounded-lg transition-all duration-150',
                                                    'hover:bg-white/5 group',
                                                    expandedCommit === commit.id && 'bg-white/5'
                                                )}
                                            >
                                                {/* Commit Header */}
                                                <div className="flex items-start gap-2.5">
                                                    <div className="mt-0.5 shrink-0">
                                                        <div className="w-6 h-6 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                                                            <GitCommitHorizontal
                                                                size={12}
                                                                className="text-emerald-400"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-xs font-semibold text-gray-200 truncate">
                                                            {commit.message}
                                                        </p>
                                                        <div className="flex items-center gap-2 mt-1.5 text-[10px] text-gray-500">
                                                            <span className="flex items-center gap-1">
                                                                <Clock size={9} />
                                                                {formatDistanceToNow(new Date(commit.created_at), { addSuffix: true })}
                                                            </span>
                                                            <span className="flex items-center gap-1">
                                                                <FileCode size={9} />
                                                                {commit.files_changed} file{commit.files_changed !== 1 ? 's' : ''}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <ChevronRight
                                                        size={12}
                                                        className={cn(
                                                            'text-gray-600 transition-transform shrink-0 mt-1',
                                                            expandedCommit === commit.id && 'rotate-90'
                                                        )}
                                                    />
                                                </div>

                                                {/* Expanded: File Snapshot */}
                                                <AnimatePresence>
                                                    {expandedCommit === commit.id && (
                                                        <motion.div
                                                            initial={{ height: 0, opacity: 0 }}
                                                            animate={{ height: 'auto', opacity: 1 }}
                                                            exit={{ height: 0, opacity: 0 }}
                                                            transition={{ duration: 0.2 }}
                                                            className="mt-3 ml-8"
                                                        >
                                                            <div className="space-y-1.5">
                                                                {(commit.snapshot as any[])?.map((file: any, i: number) => (
                                                                    <div
                                                                        key={i}
                                                                        className="flex items-center gap-2 text-[11px] text-gray-400 bg-white/5 rounded px-2 py-1.5"
                                                                    >
                                                                        <FileCode size={10} className="text-emerald-400 shrink-0" />
                                                                        <span className="truncate">
                                                                            {file.file_name}
                                                                        </span>
                                                                        <span className="text-gray-600 ml-auto shrink-0">
                                                                            {file.language}
                                                                        </span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                            {onRestoreCommit && (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="mt-2 text-[10px] text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 h-7"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation()
                                                                        onRestoreCommit(commit)
                                                                    }}
                                                                >
                                                                    Restore this version
                                                                </Button>
                                                            )}
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </button>

                                            {/* Timeline line */}
                                            {index < commits.length - 1 && (
                                                <div className="ml-[22px] h-4 border-l border-dashed border-white/5" />
                                            )}
                                        </motion.div>
                                    ))
                                )}
                            </div>
                        </ScrollArea>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}
