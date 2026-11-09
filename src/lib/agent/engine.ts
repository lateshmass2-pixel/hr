/**
 * Core Agent Engine for HEMS.
 * Uses Vercel AI SDK generateText with tool-calling for multi-step reasoning.
 *
 * The engine:
 * 1. Receives a user message + conversation history
 * 2. Calls the LLM with available tools
 * 3. If the LLM requests tool calls, executes them and feeds results back
 * 4. Repeats until the LLM produces a final text response (max 10 iterations)
 */

import { generateText, stepCountIs, type ModelMessage } from 'ai';
import { groq, AI_MODEL } from '@/lib/ai';
import { readTools, writeTools, allTools } from '@/lib/agent/tools/database';
import { emailTools } from '@/lib/agent/tools/email';
import { analyticsTools } from '@/lib/agent/tools/analytics';
import { getHRAssistantPrompt } from '@/lib/agent/prompts/hr-assistant';
import type { AgentContext, ToolCallResult } from '@/lib/agent/types';

/** Maximum tool-calling iterations to prevent infinite loops */
const MAX_ITERATIONS = 10;

/**
 * Builds the tool registry based on user role.
 * STANDARD_USER only gets read tools; HR_ADMIN gets everything.
 */
function getToolsForRole(role: AgentContext['userRole']) {
    const tools = {
        ...readTools,
        ...analyticsTools,
    };

    if (role === 'HR_ADMIN') {
        return {
            ...tools,
            ...writeTools,
            ...emailTools,
        };
    }

    return tools;
}

/**
 * Run the HR Assistant agent.
 *
 * @param messages - Conversation history (CoreMessage[])
 * @param context - Current user context (role, name, module)
 * @returns The agent's final text response + any tool calls that were made
 */
export async function runAgent(
    messages: ModelMessage[],
    context: AgentContext
): Promise<{
    response: string;
    toolCalls: ToolCallResult[];
}> {
    const systemPrompt = getHRAssistantPrompt(context);
    const tools = getToolsForRole(context.userRole);
    const collectedToolCalls: ToolCallResult[] = [];

    const { text, toolCalls, toolResults } = await generateText({
        model: groq('llama-3.1-8b-instant'),
        system: systemPrompt,
        messages,
        tools,
        temperature: 0,
        stopWhen: stepCountIs(MAX_ITERATIONS),
    });

    // Collect tool call details for the UI
    if (toolCalls && toolCalls.length > 0) {
        toolCalls.forEach((tc: any, index: number) => {
            collectedToolCalls.push({
                toolCallId: tc.toolCallId || `tc-${index}`,
                toolName: tc.toolName,
                args: tc.args,
                result: toolResults?.[index]?.output ?? null,
            });
        });
    }

    return {
        response: text || 'I apologize, I was unable to generate a response. Please try again.',
        toolCalls: collectedToolCalls,
    };
}

/**
 * Run the agent with streaming support.
 * Returns a ReadableStream for real-time UI updates.
 */
export async function runAgentStream(
    messages: ModelMessage[],
    context: AgentContext
) {
    const systemPrompt = getHRAssistantPrompt(context);
    const tools = getToolsForRole(context.userRole);

    // For streaming, we use generateText and stream the result
    // The Vercel AI SDK's streamText would be ideal here, but generateText
    // with stepCountIs handles multi-step tool calling better
    const result = await generateText({
        model: groq('llama-3.1-8b-instant'),
        system: systemPrompt,
        messages,
        tools,
        temperature: 0,
        stopWhen: stepCountIs(MAX_ITERATIONS),
    });

    return result;
}
