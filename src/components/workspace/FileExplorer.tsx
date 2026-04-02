'use client'

import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    FileText,
    FilePlus,
    Trash2,
    Pencil,
    ChevronRight,
    ChevronDown,
    FolderOpen,
    X,
    Check,
} from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import type { WorkspaceFile } from '@/types/workspace'
import { LANGUAGE_MAP, detectLanguage } from '@/types/workspace'

interface FileExplorerProps {
    files: WorkspaceFile[]
    activeFileId: string | null
    onFileSelect: (file: WorkspaceFile) => void
    onFileCreate: (name: string, language: string) => void
    onFileDelete: (fileId: string) => void
    onFileRename: (fileId: string, newName: string, newLanguage: string) => void
    readOnly?: boolean
}

const FILE_ICONS: Record<string, string> = {
    javascript: '🟨',
    typescript: '🔷',
    python: '🐍',
    html: '🌐',
    css: '🎨',
    json: '📋',
    markdown: '📝',
}

export function FileExplorer({
    files,
    activeFileId,
    onFileSelect,
    onFileCreate,
    onFileDelete,
    onFileRename,
    readOnly = false,
}: FileExplorerProps) {
    const [isCreating, setIsCreating] = useState(false)
    const [newFileName, setNewFileName] = useState('')
    const [renamingId, setRenamingId] = useState<string | null>(null)
    const [renameValue, setRenameValue] = useState('')
    const [isExpanded, setIsExpanded] = useState(true)
    const inputRef = useRef<HTMLInputElement>(null)

    const handleCreate = () => {
        if (!newFileName.trim()) return
        const lang = detectLanguage(newFileName)
        onFileCreate(newFileName.trim(), lang)
        setNewFileName('')
        setIsCreating(false)
    }

    const handleRename = (fileId: string) => {
        if (!renameValue.trim()) return
        const lang = detectLanguage(renameValue)
        onFileRename(fileId, renameValue.trim(), lang)
        setRenamingId(null)
        setRenameValue('')
    }

    return (
        <div className="flex flex-col h-full bg-[#0F172A] text-gray-300">
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-white/5">
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400 hover:text-gray-200 transition-colors"
                >
                    {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                    Explorer
                </button>
                {!readOnly && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-gray-400 hover:text-white hover:bg-white/10"
                        onClick={() => {
                            setIsCreating(true)
                            setTimeout(() => inputRef.current?.focus(), 100)
                        }}
                    >
                        <FilePlus size={14} />
                    </Button>
                )}
            </div>

            {/* File Tree */}
            <ScrollArea className="flex-1">
                <AnimatePresence>
                    {isExpanded && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="py-1"
                        >
                            {/* Workspace Folder */}
                            <div className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-400">
                                <FolderOpen size={14} className="text-emerald-400" />
                                <span className="font-medium">workspace</span>
                            </div>

                            {/* New File Input */}
                            <AnimatePresence>
                                {isCreating && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="px-3 py-1 ml-4"
                                    >
                                        <div className="flex items-center gap-1">
                                            <Input
                                                ref={inputRef}
                                                value={newFileName}
                                                onChange={(e) => setNewFileName(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') handleCreate()
                                                    if (e.key === 'Escape') {
                                                        setIsCreating(false)
                                                        setNewFileName('')
                                                    }
                                                }}
                                                placeholder="filename.js"
                                                className="h-6 text-xs bg-white/5 border-emerald-500/30 text-white placeholder:text-gray-500 focus-visible:ring-emerald-500/30"
                                            />
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 shrink-0"
                                                onClick={handleCreate}
                                            >
                                                <Check size={12} />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6 text-gray-500 hover:text-gray-300 hover:bg-white/5 shrink-0"
                                                onClick={() => {
                                                    setIsCreating(false)
                                                    setNewFileName('')
                                                }}
                                            >
                                                <X size={12} />
                                            </Button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* File Items */}
                            {files.map((file) => (
                                <div key={file.id} className="group">
                                    {renamingId === file.id ? (
                                        <div className="flex items-center gap-1 px-3 py-1 ml-4">
                                            <Input
                                                value={renameValue}
                                                onChange={(e) => setRenameValue(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') handleRename(file.id)
                                                    if (e.key === 'Escape') setRenamingId(null)
                                                }}
                                                autoFocus
                                                className="h-6 text-xs bg-white/5 border-emerald-500/30 text-white focus-visible:ring-emerald-500/30"
                                            />
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6 text-emerald-400 shrink-0"
                                                onClick={() => handleRename(file.id)}
                                            >
                                                <Check size={12} />
                                            </Button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => onFileSelect(file)}
                                            className={cn(
                                                'w-full flex items-center gap-2 px-3 py-1.5 ml-2 text-xs transition-all duration-150',
                                                'hover:bg-white/5 rounded-md mx-1',
                                                activeFileId === file.id
                                                    ? 'bg-emerald-500/10 text-emerald-300 border-l-2 border-emerald-400 ml-0 rounded-none rounded-r-md'
                                                    : 'text-gray-400 hover:text-gray-200'
                                            )}
                                        >
                                            <span className="text-sm leading-none">
                                                {FILE_ICONS[file.language] || '📄'}
                                            </span>
                                            <span className="truncate flex-1 text-left font-medium">
                                                {file.file_name}
                                            </span>

                                            {/* Actions */}
                                            {!readOnly && (
                                                <div className="hidden group-hover:flex items-center gap-0.5 shrink-0">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            setRenamingId(file.id)
                                                            setRenameValue(file.file_name)
                                                        }}
                                                        className="p-0.5 rounded hover:bg-white/10 text-gray-500 hover:text-gray-300"
                                                    >
                                                        <Pencil size={10} />
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            onFileDelete(file.id)
                                                        }}
                                                        className="p-0.5 rounded hover:bg-red-500/20 text-gray-500 hover:text-red-400"
                                                    >
                                                        <Trash2 size={10} />
                                                    </button>
                                                </div>
                                            )}
                                        </button>
                                    )}
                                </div>
                            ))}

                            {files.length === 0 && !isCreating && (
                                <div className="px-4 py-8 text-center">
                                    <FileText size={24} className="mx-auto text-gray-600 mb-2" />
                                    <p className="text-[11px] text-gray-500">No files yet</p>
                                    {!readOnly && (
                                        <button
                                            onClick={() => setIsCreating(true)}
                                            className="text-[11px] text-emerald-400 hover:text-emerald-300 mt-1"
                                        >
                                            Create your first file
                                        </button>
                                    )}
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </ScrollArea>

            {/* Footer Stats */}
            <div className="px-3 py-2 border-t border-white/5 text-[10px] text-gray-500 flex items-center gap-2">
                <span>{files.length} file{files.length !== 1 ? 's' : ''}</span>
            </div>
        </div>
    )
}
