'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import Groq from 'groq-sdk'

function getGroqClient() {
    const apiKey = process.env.GROQ_API_KEY

    if (!apiKey) {
        throw new Error(
            'GROQ_API_KEY is not set in environment variables. ' +
            'Please add GROQ_API_KEY=your_key to your .env file and restart the dev server.'
        )
    }

    return new Groq({ apiKey })
}

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
        const groq = getGroqClient()
        const completion = await groq.chat.completions.create({
            messages: [
                {
                    role: 'system',
                    content: 'You are a professional HR manager who writes fair, encouraging, and data-driven performance reviews.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            model: 'llama-3.3-70b-versatile',
            temperature: 0.7,
            max_tokens: 500
        })

        const aiResponse = completion.choices[0]?.message?.content || ''

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

        // Step C: Save Review
        const { error } = await supabase
            .from('performance_reviews')
            .insert({
                employee_id: employeeId,
                review_period: currentMonth,
                ai_summary: aiSummary,
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
            summary: aiSummary
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
        .eq('role', 'EMPLOYEE')
        .order('full_name', { ascending: true })

    if (error) {
        console.error('Error fetching employees:', error)
        return []
    }

    return data || []
}
