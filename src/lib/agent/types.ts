/**
 * Shared types for the HEMS Agentic AI system.
 */

export interface AgentMessage {
    role: 'user' | 'assistant' | 'system' | 'tool';
    content: string;
    toolCallId?: string;
    toolName?: string;
}

export interface ToolCallResult {
    toolCallId: string;
    toolName: string;
    args: Record<string, unknown>;
    result: unknown;
}

export interface AgentContext {
    userId: string;
    userRole: 'HR_ADMIN' | 'STANDARD_USER';
    userName: string;
    module?: 'dashboard' | 'hiring' | 'performance' | 'leave' | 'onboarding' | 'learning' | 'scout' | 'projects' | 'payroll';
}

export interface AgentResponse {
    message: string;
    toolCalls?: ToolCallResult[];
    suggestions?: string[];
}

export interface InsightCard {
    id: string;
    module: string;
    type: 'anomaly' | 'recommendation' | 'summary' | 'alert';
    title: string;
    content: string;
    severity: 'info' | 'warning' | 'critical';
    actionLabel?: string;
    actionHref?: string;
    dismissed: boolean;
    createdAt: string;
}
