/**
 * API Route: /api/agent/learning
 * Generates personalized AI learning paths — replaces the mocked setTimeout in learning/page.tsx
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateText } from 'ai';
import { z } from 'zod';
import { groq, AI_MODEL } from '@/lib/ai';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit, RATE_LIMITS } from '@/lib/security';
import { logger, newRequestId } from '@/lib/observability/logger';

export const maxDuration = 30;

const ROUTE = 'POST /api/agent/learning';

/** Expected shape of the model's output: 4-5 actionable step strings. */
const learningPathSchema = z.array(z.string().min(1).max(500)).min(1).max(10);

// Length/size caps bound both token spend and prompt-injection blast radius.
const requestSchema = z.object({
    skills: z
        .array(
            z.object({
                name: z.string().max(200),
                level: z.number().min(0).max(100),
                status: z.string().max(50),
            })
        )
        .max(100)
        .default([]),
    enrolledCourses: z
        .array(z.object({ title: z.string().max(300), progress: z.number().min(0).max(100) }))
        .max(100)
        .default([]),
    availableCourses: z
        .array(z.object({ title: z.string().max(300), category: z.string().max(100) }))
        .max(200)
        .default([]),
});

export async function POST(req: NextRequest) {
    const requestId = newRequestId();
    const startedAt = Date.now();
    let log = logger.child({ requestId, route: ROUTE });

    try {
        const supabase = await createClient();

        // Get authenticated user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            log.warn('Unauthenticated request rejected');
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        log = logger.child({ requestId, route: ROUTE, userId: user.id });

        // This endpoint spends LLM tokens per call — rate limit on verified identity.
        const rate = checkRateLimit(`agent:learning:${user.id}`, RATE_LIMITS.heavy);
        if (!rate.allowed) {
            log.warn('Rate limit exceeded', { resetIn: rate.resetIn });
            return NextResponse.json(
                { error: 'Too many requests. Try again shortly.' },
                { status: 429, headers: { 'Retry-After': String(rate.resetIn) } }
            );
        }

        const parsed = requestSchema.safeParse(await req.json());
        if (!parsed.success) {
            log.warn('Invalid request payload', { issues: parsed.error.issues.length });
            return NextResponse.json(
                { error: 'Invalid request payload', details: parsed.error.issues },
                { status: 400 }
            );
        }
        const { skills, enrolledCourses, availableCourses } = parsed.data;

        // Get employee's recent tasks for context
        const { data: tasks } = await supabase
            .from('tasks')
            .select('title, status, priority')
            .eq('assignee_id', user.id)
            .order('updated_at', { ascending: false })
            .limit(10);

        // Get employee profile
        const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, position')
            .eq('id', user.id)
            .single();

        const taskContext = tasks?.map(t => `${t.title} (${t.status})`).join(', ') || 'No recent tasks';

        const { text } = await generateText({
            model: groq(AI_MODEL),
            system: `You are an L&D (Learning & Development) specialist. Generate a personalized learning path based on the employee's current skills, gaps, enrolled courses, and work tasks.

IMPORTANT: Return ONLY a valid JSON array of 4-5 learning path steps. No markdown, no explanation.

Schema:
[
  "Step description with priority indicator"
]

Guidelines:
- Identify the biggest skill gap and prioritize it
- Consider their current work tasks to make recommendations relevant
- Reference specific available courses when possible
- Include a mix of technical and soft skills
- Add priority levels (High/Medium/Low)
- Be specific and actionable`,
            prompt: `Generate a learning path for:

**Employee**: ${profile?.full_name || 'Employee'} (${profile?.position || 'Team Member'})

**Current Skills**:
${skills.map(s => `- ${s.name}: ${s.level}% (${s.status})`).join('\n')}

**Currently Enrolled**:
${enrolledCourses.map(c => `- ${c.title} (${c.progress}% complete)`).join('\n') || 'None'}

**Available Courses**:
${availableCourses.map(c => `- ${c.title} [${c.category}]`).join('\n') || 'None'}

**Recent Work Tasks**:
${taskContext}

Return only a JSON array of 4-5 step strings.`,
        });

        const cleanText = text.replace(/```json\n?|```/g, '').trim();

        // A malformed model response is a failure, not a result. Returning
        // generic advice here previously made every outage look like a success.
        const steps = learningPathSchema.parse(JSON.parse(cleanText));

        log.info('Learning path generated', {
            durationMs: Date.now() - startedAt,
            stepCount: steps.length,
        });

        return NextResponse.json({ learningPath: steps });

    } catch (error) {
        log.error('Learning path generation failed', error, {
            durationMs: Date.now() - startedAt,
        });
        return NextResponse.json(
            { error: 'Could not generate a learning path right now. Please try again.' },
            { status: 502 }
        );
    }
}
