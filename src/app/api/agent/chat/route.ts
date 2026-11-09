/**
 * API Route: /api/agent/chat
 * Handles the HR Assistant agent chat requests.
 * Accepts conversation messages + context, runs the agent, returns response.
 */

import { NextRequest, NextResponse } from 'next/server';
import { runAgent } from '@/lib/agent/engine';
import { createClient } from '@/lib/supabase/server';
import type { AgentContext } from '@/lib/agent/types';
import type { ModelMessage } from 'ai';

export const maxDuration = 60; // Allow up to 60s for multi-step agent calls

export async function POST(req: NextRequest) {
    try {
        const supabase = await createClient();

        // 1. Authenticate
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 2. Get user profile for role info
        const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, role')
            .eq('id', user.id)
            .single();

        // 3. Parse request body
        const body = await req.json();
        const { messages, module } = body as {
            messages: ModelMessage[];
            module?: string;
        };

        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            return NextResponse.json({ error: 'Messages array is required' }, { status: 400 });
        }

        // 4. Build context
        const context: AgentContext = {
            userId: user.id,
            userRole: (profile?.role === 'HR_ADMIN' || profile?.role === 'hr' || profile?.role === 'owner')
                ? 'HR_ADMIN'
                : 'STANDARD_USER',
            userName: profile?.full_name || user.email?.split('@')[0] || 'User',
            module: module as AgentContext['module'],
        };

        // 5. Run the agent
        const { response, toolCalls } = await runAgent(messages, context);

        // 6. Return response
        return NextResponse.json({
            message: response,
            toolCalls: toolCalls.map(tc => ({
                toolName: tc.toolName,
                args: tc.args,
                // Truncate large results for the UI
                resultPreview: JSON.stringify(tc.result).substring(0, 500),
            })),
        });

    } catch (error: any) {
        console.error('❌ Agent Chat Error:', error);
        return NextResponse.json(
            { error: error.message || 'Agent failed to respond' },
            { status: 500 }
        );
    }
}
