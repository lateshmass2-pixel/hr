'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    MessageCircle, X, Send, Sparkles, Loader2,
    ChevronDown, Database, Mail, BarChart3, Lightbulb
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ============================================================================
// Types
// ============================================================================

interface ChatMessage {
    id: string
    role: 'user' | 'assistant'
    content: string
    toolCalls?: { toolName: string; args: Record<string, unknown>; resultPreview: string }[]
    timestamp: Date
}

interface AgentChatPanelProps {
    module?: string
}

// ============================================================================
// Tool Call Visualization
// ============================================================================

function ToolCallBadge({ toolName }: { toolName: string }) {
    const iconMap: Record<string, typeof Database> = {
        queryEmployees: Database,
        queryLeaveRequests: Database,
        queryApplications: Database,
        queryTasks: Database,
        queryProjects: Database,
        queryPerformanceReviews: Database,
        queryJobPostings: Database,
        getHiringPipelineStats: BarChart3,
        getWorkforceOverview: BarChart3,
        getTeamWorkload: BarChart3,
        getLeaveOverlaps: BarChart3,
        sendEmail: Mail,
        updateLeaveStatus: Database,
        updateApplicationStatus: Database,
        createAnnouncement: Database,
    }

    const Icon = iconMap[toolName] || Database

    // Prettify tool name
    const label = toolName
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, s => s.toUpperCase())
        .trim()

    return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-medium rounded-full border border-emerald-100">
            <Icon size={10} />
            {label}
        </span>
    )
}

// ============================================================================
// Suggested Questions
// ============================================================================

const QUICK_QUESTIONS = [
    { icon: '👥', text: 'How many employees do we have?' },
    { icon: '📋', text: "Who's on leave this week?" },
    { icon: '📊', text: 'Show hiring pipeline status' },
    { icon: '📁', text: 'What are the active projects?' },
]

// ============================================================================
// Main Component
// ============================================================================

export default function AgentChatPanel({ module }: AgentChatPanelProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [messages, setMessages] = useState<ChatMessage[]>([])
    const [input, setInput] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [showScrollDown, setShowScrollDown] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const messagesContainerRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)

    // Auto-scroll to bottom on new messages
    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [])

    useEffect(() => {
        if (messages.length > 0) scrollToBottom()
    }, [messages, scrollToBottom])

    // Focus input when panel opens
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 300)
        }
    }, [isOpen])

    // Detect scroll position
    const handleScroll = useCallback(() => {
        const container = messagesContainerRef.current
        if (!container) return
        const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100
        setShowScrollDown(!isNearBottom && messages.length > 3)
    }, [messages.length])

    // Send message
    const sendMessage = async (text: string) => {
        if (!text.trim() || isLoading) return

        const userMessage: ChatMessage = {
            id: crypto.randomUUID(),
            role: 'user',
            content: text.trim(),
            timestamp: new Date(),
        }

        setMessages(prev => [...prev, userMessage])
        setInput('')
        setIsLoading(true)

        try {
            // Build messages array for the API (only role + content)
            const apiMessages = [...messages, userMessage].map(m => ({
                role: m.role as 'user' | 'assistant',
                content: m.content,
            }))

            const res = await fetch('/api/agent/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: apiMessages, module }),
            })

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}))
                throw new Error(errData.error || `Request failed (${res.status})`)
            }

            const data = await res.json()

            const assistantMessage: ChatMessage = {
                id: crypto.randomUUID(),
                role: 'assistant',
                content: data.message,
                toolCalls: data.toolCalls,
                timestamp: new Date(),
            }

            setMessages(prev => [...prev, assistantMessage])
        } catch (err: any) {
            const errorMessage: ChatMessage = {
                id: crypto.randomUUID(),
                role: 'assistant',
                content: `⚠️ Sorry, I encountered an error: ${err.message}. Please try again.`,
                timestamp: new Date(),
            }
            setMessages(prev => [...prev, errorMessage])
        } finally {
            setIsLoading(false)
        }
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        sendMessage(input)
    }

    const handleQuickQuestion = (text: string) => {
        sendMessage(text)
    }

    // ========================================================================
    // Render
    // ========================================================================

    return (
        <>
            {/* FAB Button */}
            <AnimatePresence>
                {!isOpen && (
                    <motion.button
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        whileHover={{ scale: 1.08 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setIsOpen(true)}
                        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-[#14532d] to-[#166534] text-white shadow-xl shadow-green-900/30 flex items-center justify-center hover:shadow-2xl hover:shadow-green-900/40 transition-shadow"
                        id="agent-chat-fab"
                    >
                        <Sparkles size={22} />
                    </motion.button>
                )}
            </AnimatePresence>

            {/* Chat Panel */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="fixed bottom-6 right-6 z-50 w-[420px] h-[600px] bg-white rounded-2xl shadow-2xl border border-green-100 flex flex-col overflow-hidden"
                        id="agent-chat-panel"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-[#14532d] to-[#166534] text-white">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                                    <Sparkles size={18} />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-sm">HEMS AI Assistant</h3>
                                    <p className="text-[10px] text-white/70">Ask anything about your HR data</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {/* Messages */}
                        <div
                            ref={messagesContainerRef}
                            onScroll={handleScroll}
                            className="flex-1 overflow-y-auto px-4 py-4 space-y-4 relative"
                        >
                            {/* Welcome state */}
                            {messages.length === 0 && (
                                <div className="flex flex-col items-center justify-center h-full text-center px-4">
                                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-50 to-green-50 border border-green-100 flex items-center justify-center mb-4">
                                        <Lightbulb size={28} className="text-green-600" />
                                    </div>
                                    <h4 className="font-semibold text-[#14532d] mb-1">
                                        Hi! I&apos;m your HR AI Assistant
                                    </h4>
                                    <p className="text-xs text-slate-500 mb-6 max-w-[280px]">
                                        I can query your employee data, check leave schedules, review the hiring pipeline, and more.
                                    </p>

                                    {/* Quick suggestions */}
                                    <div className="grid grid-cols-2 gap-2 w-full">
                                        {QUICK_QUESTIONS.map((q, i) => (
                                            <button
                                                key={i}
                                                onClick={() => handleQuickQuestion(q.text)}
                                                className="flex items-center gap-2 p-3 bg-[#f8faf6] hover:bg-green-50 border border-green-100 rounded-xl text-left text-xs text-slate-700 font-medium transition-colors group"
                                            >
                                                <span className="text-base">{q.icon}</span>
                                                <span className="group-hover:text-[#14532d] transition-colors">{q.text}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Message bubbles */}
                            {messages.map(msg => (
                                <div
                                    key={msg.id}
                                    className={cn(
                                        'flex',
                                        msg.role === 'user' ? 'justify-end' : 'justify-start'
                                    )}
                                >
                                    <div className={cn(
                                        'max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed',
                                        msg.role === 'user'
                                            ? 'bg-gradient-to-r from-[#14532d] to-[#166534] text-white rounded-br-md'
                                            : 'bg-[#f8faf6] text-slate-800 border border-green-100 rounded-bl-md'
                                    )}>
                                        {/* Tool call badges */}
                                        {msg.toolCalls && msg.toolCalls.length > 0 && (
                                            <div className="flex flex-wrap gap-1 mb-2 pb-2 border-b border-green-100/50">
                                                {msg.toolCalls.map((tc, i) => (
                                                    <ToolCallBadge key={i} toolName={tc.toolName} />
                                                ))}
                                            </div>
                                        )}

                                        {/* Message content with basic markdown */}
                                        <div
                                            className="whitespace-pre-wrap [&_strong]:font-semibold [&_em]:italic"
                                            dangerouslySetInnerHTML={{
                                                __html: formatMarkdown(msg.content)
                                            }}
                                        />
                                    </div>
                                </div>
                            ))}

                            {/* Thinking indicator */}
                            {isLoading && (
                                <div className="flex justify-start">
                                    <div className="bg-[#f8faf6] border border-green-100 rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-2">
                                        <Loader2 size={14} className="animate-spin text-green-600" />
                                        <span className="text-xs text-slate-500">Thinking...</span>
                                    </div>
                                </div>
                            )}

                            <div ref={messagesEndRef} />
                        </div>

                        {/* Scroll to bottom button */}
                        <AnimatePresence>
                            {showScrollDown && (
                                <motion.button
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 10 }}
                                    onClick={scrollToBottom}
                                    className="absolute bottom-20 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-white border border-green-200 shadow-md flex items-center justify-center text-green-600 hover:bg-green-50 transition-colors z-10"
                                >
                                    <ChevronDown size={16} />
                                </motion.button>
                            )}
                        </AnimatePresence>

                        {/* Input */}
                        <form
                            onSubmit={handleSubmit}
                            className="px-4 py-3 border-t border-green-100 bg-white"
                        >
                            <div className="flex items-center gap-2 bg-[#f8faf6] rounded-xl border border-green-100 px-3 py-2 focus-within:border-green-300 focus-within:ring-2 focus-within:ring-green-100 transition-all">
                                <MessageCircle size={16} className="text-slate-400 shrink-0" />
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={input}
                                    onChange={e => setInput(e.target.value)}
                                    placeholder="Ask me anything..."
                                    disabled={isLoading}
                                    className="flex-1 bg-transparent text-sm text-slate-800 placeholder-slate-400 outline-none disabled:opacity-50"
                                    id="agent-chat-input"
                                />
                                <button
                                    type="submit"
                                    disabled={!input.trim() || isLoading}
                                    className="w-8 h-8 rounded-lg bg-[#14532d] text-white flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#166534] transition-colors shrink-0"
                                >
                                    <Send size={14} />
                                </button>
                            </div>
                            <p className="text-[10px] text-slate-400 mt-1.5 text-center">
                                Powered by HEMS AI · Responses are AI-generated
                            </p>
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    )
}

// ============================================================================
// Helpers
// ============================================================================

/** Basic markdown → HTML for chat messages */
function formatMarkdown(text: string): string {
    return text
        // Bold
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        // Italic
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        // Inline code
        .replace(/`(.*?)`/g, '<code class="px-1 py-0.5 bg-green-50 text-green-800 rounded text-xs font-mono">$1</code>')
        // Line breaks
        .replace(/\n/g, '<br/>')
}
