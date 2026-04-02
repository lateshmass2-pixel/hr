'use client'

import { useRef, useEffect } from 'react'
import { Trash2, Terminal, Clock, Cpu, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { useState } from 'react'

export interface ConsoleEntry {
    id: string
    type: 'stdout' | 'stderr' | 'info' | 'error' | 'system'
    content: string
    timestamp: Date
    executionTime?: number
    memoryUsed?: string
}

interface ConsoleOutputProps {
    entries: ConsoleEntry[]
    onClear: () => void
    isRunning?: boolean
}

export function ConsoleOutput({ entries, onClear, isRunning = false }: ConsoleOutputProps) {
    const scrollRef = useRef<HTMLDivElement>(null)
    const [isCollapsed, setIsCollapsed] = useState(false)

    // Auto-scroll on new entries
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }, [entries])

    const getEntryStyle = (type: ConsoleEntry['type']) => {
        switch (type) {
            case 'stdout':
                return 'text-emerald-300'
            case 'stderr':
            case 'error':
                return 'text-red-400'
            case 'info':
                return 'text-blue-400'
            case 'system':
                return 'text-gray-500 italic'
            default:
                return 'text-gray-300'
        }
    }

    const getPrefix = (type: ConsoleEntry['type']) => {
        switch (type) {
            case 'stdout':
                return '❯'
            case 'stderr':
            case 'error':
                return '✕'
            case 'info':
                return 'ℹ'
            case 'system':
                return '⚙'
            default:
                return '>'
        }
    }

    return (
        <div className={cn("flex flex-col bg-[#0D1117] border-t border-white/5", isCollapsed ? "h-8" : "h-full")}>
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-1.5 bg-[#0F172A] border-b border-white/5 shrink-0">
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400 hover:text-gray-200 transition-colors"
                >
                    <Terminal size={12} />
                    <span>Console</span>
                    {entries.length > 0 && (
                        <span className="bg-white/10 text-gray-400 px-1.5 py-0.5 rounded-full text-[9px] font-bold">
                            {entries.length}
                        </span>
                    )}
                    {isCollapsed ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                </button>

                <div className="flex items-center gap-2">
                    {isRunning && (
                        <div className="flex items-center gap-1.5 text-[10px] text-emerald-400">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            Running...
                        </div>
                    )}
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onClear}
                        className="h-5 w-5 text-gray-500 hover:text-gray-300 hover:bg-white/10"
                    >
                        <Trash2 size={10} />
                    </Button>
                </div>
            </div>

            {/* Output */}
            {!isCollapsed && (
                <div ref={scrollRef} className="flex-1 overflow-y-auto min-h-0">
                    <div className="p-3 space-y-1 font-mono text-xs">
                        {entries.length === 0 ? (
                            <div className="text-gray-600 text-center py-4">
                                <Terminal size={20} className="mx-auto mb-2 opacity-30" />
                                <p className="text-[11px]">Run code to see output here</p>
                                <p className="text-[10px] text-gray-700 mt-1">⌘+Enter to run</p>
                            </div>
                        ) : (
                            entries.map((entry) => (
                                <div
                                    key={entry.id}
                                    className={cn('flex items-start gap-2 leading-relaxed', getEntryStyle(entry.type))}
                                >
                                    <span className="opacity-50 select-none shrink-0 mt-0.5">
                                        {getPrefix(entry.type)}
                                    </span>
                                    <pre className="whitespace-pre-wrap break-words flex-1 min-w-0">
                                        {entry.content}
                                    </pre>
                                    {entry.executionTime !== undefined && (
                                        <span className="shrink-0 flex items-center gap-1 text-[9px] text-gray-600 mt-0.5">
                                            <Clock size={8} />
                                            {entry.executionTime}ms
                                        </span>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
