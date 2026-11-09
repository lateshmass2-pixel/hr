'use client'

import dynamic from 'next/dynamic'

// Lazy-load the chat panel to avoid increasing initial bundle size
const AgentChatPanel = dynamic(
    () => import('@/components/agent/AgentChatPanel'),
    { ssr: false }
)

export function AgentChatWrapper() {
    return <AgentChatPanel />
}
