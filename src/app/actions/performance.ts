'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { generateText, stepCountIs } from 'ai'
import { groq, AI_MODEL } from '@/lib/ai'
import { queryTasks, queryLeaveRequests, queryPerformanceReviews } from '@/lib/agent/tools/database'
import { getTeamWorkload, getCurrentDate } from '@/lib/agent/tools/analytics'

interface PerformanceReview {
    id: string
    employee_id: string
    review_period: string
    ai_summary: string
    rating: number
    created_at: string
}

export async function generatePerformanceReview(employeeId: string) {
    const supabase = await createClient()

    // Verify user is HR
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { success: false, message: 'Not authenticated' }
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (profile?.role !== 'HR_ADMIN') {
        return { success: false, message: 'Unauthorized' }
    }

    // Get employee details
    const { data: employee } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', employeeId)
        .single()

    if (!employee) {
        return { success: false, message: 'Employee not found' }
    }

    // Calculate date range (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const thirtyDaysAgoISO = thirtyDaysAgo.toISOString()

    // Step A: Gather Data
    // Fetch completed tasks from last 30 days
    const { data: tasks } = await supabase
        .from('tasks')
        .select('id, title, priority, deadline, status, updated_at')
        .eq('assigned_to', employeeId)
        .in('status', ['DONE', 'READY_FOR_REVIEW'])
        .gte('updated_at', thirtyDaysAgoISO)
        .order('updated_at', { ascending: false })

    // Fetch work logs from last 30 days
    const { data: workLogs } = await supabase
        .from('work_logs')
        .select('description, hours_worked, created_at')
        .eq('user_id', employeeId)
        .gte('created_at', thirtyDaysAgoISO)
        .order('created_at', { ascending: false })

    // Calculate metrics
    const totalTasks = tasks?.length || 0
    const highPriorityTasks = tasks?.filter(t => t.priority === 'HIGH').length || 0
    const highPriorityPercentage = totalTasks > 0 ? ((highPriorityTasks / totalTasks) * 100).toFixed(1) : '0'

    // Calculate on-time completion rate
    const tasksWithDeadline = tasks?.filter(t => t.deadline) || []
    const onTimeTasks = tasksWithDeadline.filter(t => {
        const completedDate = new Date(t.updated_at)
        const deadline = new Date(t.deadline!)
        return completedDate <= deadline
    })
    const onTimeRate = tasksWithDeadline.length > 0
        ? ((onTimeTasks.length / tasksWithDeadline.length) * 100).toFixed(1)
        : 'N/A'

    const totalHours = workLogs?.reduce((sum, log) => sum + (log.hours_worked || 0), 0) || 0

    // Prepare data for AI
    const taskTitles = tasks?.slice(0, 10).map(t => t.title).join(', ') || 'No tasks completed'
    const workLogSummary = workLogs?.slice(0, 5).map(log => log.description).join('; ') || 'No work logs'

    // Step B: AI Analysis
    const currentMonth = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

    const prompt = `Act as an HR Manager. Here is the work history for ${employee.full_name} for ${currentMonth}:

**Performance Metrics:**
- Completed ${totalTasks} tasks
- ${highPriorityPercentage}% were high-priority tasks
- On-time completion rate: ${onTimeRate}${onTimeRate !== 'N/A' ? '%' : ''}
- Total hours logged: ${totalHours} hours

**Key Achievements:**
${taskTitles}

**Work Logs Summary:**
${workLogSummary}

**Task:** Write a professional, encouraging performance review (approximately 150 words). Highlight their strengths based on this data. Be specific about their accomplishments. End your review with a rating out of 5 (use format "Rating: X/5" on the last line).

Provide constructive feedback and recognize their contributions.`

    try {
        const systemPrompt = `You are a professional HR Performance Review Agent.
Your goal is to write a comprehensive, data-driven, and fair performance review for an employee.

You have access to tools to gather additional context:
1. getCurrentDate to get the current date.
2. queryPerformanceReviews (with employeeId: "${employeeId}") to see their past performance review history.
3. getTeamWorkload to compare this employee's workload with the team's workload.
4. queryLeaveRequests (with userId: "${employeeId}") to get the candidate's leave requests.

You must run these tools to build a comprehensive picture before finalizing your review.

CRITICAL RULE: When you decide to call a tool, you MUST NOT output any conversational text, explanations, or thoughts in the same response. Output the tool call directly and immediately. Preceding text will crash the API parser.
XML Tool Formatting: If you generate tool calls using XML-like tags (e.g., \`<function=toolName>...\`), you MUST make sure the tags are perfectly well-formed. Always include the closing \`>\` of the opening tag. Never output \`<function=toolName{...\` — it must be \`<function=toolName>{...}</function>\`.

Once you have gathered the data:
- Write a professional, encouraging, and detailed performance review (approx 200 words) using the initial activity data and team workload data.
- Compare their completed tasks count with the overall team workload averages.
- Identify any trends or improvements from their past review history.
- Suggest 3 SMART goals for the next period.
- End your review with a rating out of 5 (using the format "Rating: X/5" on the last line).`

        const result = await generateText({
            model: groq(AI_MODEL),
            system: systemPrompt,
            messages: [
                {
                    role: 'user',
                    content: `Act as an HR Manager. Here is the initial work history context for ${employee.full_name} for ${currentMonth}:
                    
**Performance Metrics:**
- Completed ${totalTasks} tasks
- ${highPriorityPercentage}% were high-priority tasks
- On-time completion rate: ${onTimeRate}${onTimeRate !== 'N/A' ? '%' : ''}
- Total hours logged: ${totalHours} hours

**Key Achievements:**
${taskTitles}

**Work Logs Summary:**
${workLogSummary}

Write their performance review.`
                }
            ],
            tools: {
                getCurrentDate,
                queryPerformanceReviews,
                getTeamWorkload,
                queryLeaveRequests
            },
            stopWhen: stepCountIs(10)
        })

        const aiResponse = result.text || ''

        // Parse rating from response
        const ratingMatch = aiResponse.match(/Rating:\s*(\d+(?:\.\d+)?)\s*\/\s*5/i)
        let rating = 4.0 // Default rating

        if (ratingMatch && ratingMatch[1]) {
            const parsedRating = parseFloat(ratingMatch[1])
            if (parsedRating >= 1 && parsedRating <= 5) {
                rating = parsedRating
            }
        }

        // Remove the rating line from summary
        const aiSummary = aiResponse.replace(/Rating:\s*\d+(?:\.\d+)?\s*\/\s*5/i, '').trim()

        // Build reasoning trace markdown
        const traceLines: string[] = []
        result.steps.forEach((step, stepIndex) => {
            if (step.toolCalls && step.toolCalls.length > 0) {
                step.toolCalls.forEach(tc => {
                    const toolName = tc.toolName
                    const argsStr = JSON.stringify(tc.input)
                    const prettyName = toolName
                        .replace(/([A-Z])/g, ' $1')
                        .replace(/^./, s => s.toUpperCase())
                        .trim()
                    traceLines.push(`- **Step ${stepIndex + 1}: ${prettyName}** — Called with parameters \`${argsStr}\``)
                })
            }
        })
        const traceMarkdown = traceLines.length > 0
            ? `\n\n### 🔍 Agent Execution Trace\n` + traceLines.join('\n')
            : ''

        const finalSummary = aiSummary + traceMarkdown

        // Step C: Save Review
        const { error } = await supabase
            .from('performance_reviews')
            .insert({
                employee_id: employeeId,
                review_period: currentMonth,
                ai_summary: finalSummary,
                rating: rating
            })

        if (error) {
            console.error('Error saving review:', error)
            return { success: false, message: 'Failed to save review' }
        }

        revalidatePath('/dashboard/performance')
        return {
            success: true,
            message: 'Performance review generated successfully',
            rating,
            summary: finalSummary
        }

    } catch (error) {
        console.error('Error generating AI review:', error)
        return { success: false, message: 'Failed to generate AI review' }
    }
}

export async function getEmployeeReview(employeeId: string) {
    const supabase = await createClient()

    const currentMonth = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

    const { data, error } = await supabase
        .from('performance_reviews')
        .select('*')
        .eq('employee_id', employeeId)
        .eq('review_period', currentMonth)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
        console.error('Error fetching review:', error)
        return null
    }

    return data as PerformanceReview | null
}

export async function getAllReviews(employeeIds: string[]) {
    if (employeeIds.length === 0) return []

    const supabase = await createClient()
    const currentMonth = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

    const { data, error } = await supabase
        .from('performance_reviews')
        .select('*')
        .in('employee_id', employeeIds)
        .eq('review_period', currentMonth)

    if (error) {
        console.error('Error fetching batch reviews:', error)
        return []
    }

    // Deduplicate: get only the latest review per employee
    // Since we can't easily do "DISTINCT ON" with simple PostgREST js client without raw sql sometimes,
    // we will fetch all matching and filter in JS if there are duplicates (unlikely if logic holds).
    // Actually, let's just return all and filter in the component or map them.
    // Better: Sort by created_at desc in query if possible, but .in() makes it tricky to sort per group.

    return data as PerformanceReview[]
}

export async function getAllEmployees() {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, position, role')
        .eq('role', 'STANDARD_USER')
        .order('full_name', { ascending: true })

    if (error) {
        console.error('Error fetching employees:', error)
        return []
    }

    return data || []
}
