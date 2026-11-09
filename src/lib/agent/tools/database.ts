/**
 * Database tools for the HEMS Agent.
 * Provides safe, RBAC-aware read/write access to Supabase tables.
 */

import { tool } from 'ai';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

// ============================================================================
// Read Tools
// ============================================================================

export const queryEmployees = tool({
    description: 'Query the employee/profiles list. Returns employee id, name, email, position, and role. Use this to look up employees, find team members, or get employee counts.',
    inputSchema: z.object({
        search: z.string().optional().describe('Optional search term to filter by name, email, or position'),
        role: z.enum(['HR_ADMIN', 'STANDARD_USER']).optional().describe('Filter by role'),
        limit: z.number().optional().default(50).describe('Max results to return'),
    }),
    execute: async ({ search, role, limit }) => {
        const supabase = await createClient();
        let query = supabase
            .from('profiles')
            .select('id, full_name, email, position, role, created_at')
            .order('full_name', { ascending: true })
            .limit(limit ?? 50);

        if (role) {
            query = query.eq('role', role);
        }
        if (search) {
            query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,position.ilike.%${search}%`);
        }

        const { data, error } = await query;
        if (error) return { success: false, error: error.message };
        return { success: true, count: data?.length ?? 0, employees: data };
    },
});

export const queryLeaveRequests = tool({
    description: 'Query leave requests. Returns leave request id, user_id, start/end dates, status, and reason. Use this to check who is on leave, pending approvals, or leave history.',
    inputSchema: z.object({
        userId: z.string().optional().describe('Filter by specific user ID'),
        status: z.string().optional().describe('Filter by status: approved, pending, rejected'),
        startAfter: z.string().optional().describe('Filter leaves starting after this ISO date'),
        startBefore: z.string().optional().describe('Filter leaves starting before this ISO date'),
        limit: z.number().optional().default(50).describe('Max results to return'),
    }),
    execute: async ({ userId, status, startAfter, startBefore, limit }) => {
        const supabase = await createClient();
        let query = supabase
            .from('leave_requests')
            .select('id, user_id, start_date, end_date, status, reason')
            .order('start_date', { ascending: false })
            .limit(limit ?? 50);

        if (userId) query = query.eq('user_id', userId);
        
        if (status) {
            const lowerStatus = status.toLowerCase();
            const validStatuses = ['approved', 'pending', 'rejected'];
            if (validStatuses.includes(lowerStatus)) {
                query = query.eq('status', lowerStatus);
            } else {
                return {
                    success: true,
                    count: 0,
                    leaves: [],
                    message: `Status "${status}" is invalid. Valid statuses are: approved, pending, rejected.`
                };
            }
        }
        
        if (startAfter) query = query.gte('start_date', startAfter);
        if (startBefore) query = query.lte('start_date', startBefore);

        const { data, error } = await query;
        if (error) return { success: false, error: error.message };
        return { success: true, count: data?.length ?? 0, leaves: data };
    },
});

export const queryApplications = tool({
    description: 'Query the hiring pipeline / job applications. Returns candidate name, email, score, status, AI reasoning, and job ID. Use this to check hiring pipeline status, candidate counts by stage, or specific candidate details.',
    inputSchema: z.object({
        status: z.string().optional().describe('Filter by status: NEW, TEST_PENDING, SHORTLISTED, interview, offer, HIRED, REJECTED'),
        jobId: z.string().optional().describe('Filter by job posting ID'),
        minScore: z.number().optional().describe('Minimum AI score to filter by'),
        limit: z.number().optional().default(50).describe('Max results to return'),
    }),
    execute: async ({ status, jobId, minScore, limit }) => {
        const supabase = await createClient();
        let query = supabase
            .from('applications')
            .select('id, candidate_name, candidate_email, score, status, ai_reasoning, job_id, created_at')
            .order('created_at', { ascending: false })
            .limit(limit ?? 50);

        if (status) query = query.eq('status', status);
        if (jobId) query = query.eq('job_id', jobId);
        if (minScore) query = query.gte('score', minScore);

        const { data, error } = await query;
        if (error) return { success: false, error: error.message };
        return { success: true, count: data?.length ?? 0, applications: data };
    },
});

export const queryTasks = tool({
    description: 'Query project tasks. Returns task id, title, status, priority, assignee_id, project_id, and due date. Use this to check task progress, workload, or overdue items.',
    inputSchema: z.object({
        projectId: z.string().optional().describe('Filter by project ID'),
        assigneeId: z.string().optional().describe('Filter by assignee user ID'),
        status: z.string().optional().describe('Filter by task status: TODO, IN_PROGRESS, READY_FOR_REVIEW, COMPLETED'),
        limit: z.number().optional().default(50).describe('Max results to return'),
    }),
    execute: async ({ projectId, assigneeId, status, limit }) => {
        const supabase = await createClient();
        let query = supabase
            .from('tasks')
            .select('id, title, status, priority, assigned_to, project_id, due_date, created_at, description')
            .order('created_at', { ascending: false })
            .limit(limit ?? 50);

        if (projectId) query = query.eq('project_id', projectId);
        if (assigneeId) query = query.eq('assigned_to', assigneeId);
        
        if (status) {
            const upperStatus = status.toUpperCase().replace(' ', '_');
            const validStatuses = ['TODO', 'IN_PROGRESS', 'READY_FOR_REVIEW', 'COMPLETED'];
            if (validStatuses.includes(upperStatus)) {
                query = query.eq('status', upperStatus);
            } else {
                return {
                    success: true,
                    count: 0,
                    tasks: [],
                    message: `Status "${status}" is invalid. Valid statuses are: TODO, IN_PROGRESS, READY_FOR_REVIEW, COMPLETED.`
                };
            }
        }

        const { data, error } = await query;
        if (error) return { success: false, error: error.message };

        // Map assigned_to back to assignee_id and supply updated_at/verification_status placeholders
        const mappedTasks = (data || []).map((task: any) => ({
            id: task.id,
            title: task.title,
            status: task.status,
            priority: task.priority,
            assignee_id: task.assigned_to,
            project_id: task.project_id,
            due_date: task.due_date,
            created_at: task.created_at,
            description: task.description,
            verification_status: 'NOT_STARTED',
            updated_at: task.created_at
        }));

        return { success: true, count: mappedTasks.length, tasks: mappedTasks };
    },
});

export const queryProjects = tool({
    description: 'Query projects. Returns project id, title, description, status, progress, team lead, and member IDs. Use this to check active projects, team assignments, or project health.',
    inputSchema: z.object({
        status: z.string().optional().describe('Filter by project status: ACTIVE, COMPLETED, ARCHIVED'),
        managerId: z.string().optional().describe('Filter by project manager/lead ID'),
        limit: z.number().optional().default(50).describe('Max results to return'),
    }),
    execute: async ({ status, managerId, limit }) => {
        const supabase = await createClient();
        let query = supabase
            .from('projects')
            .select('id, title, description, status, progress, team_lead_id, member_ids, created_at')
            .order('created_at', { ascending: false })
            .limit(limit ?? 50);

        if (status) {
            const upperStatus = status.toUpperCase();
            if (['ACTIVE', 'COMPLETED', 'ARCHIVED'].includes(upperStatus)) {
                query = query.eq('status', upperStatus);
            } else {
                return {
                    success: true,
                    count: 0,
                    projects: [],
                    message: `Status "${status}" is invalid. Valid statuses are: ACTIVE, COMPLETED, ARCHIVED. (If you are looking for pending projects, please note that the system only uses ACTIVE, COMPLETED, or ARCHIVED. You should query without a status filter or check ACTIVE projects.)`
                };
            }
        }
        
        if (managerId) query = query.eq('team_lead_id', managerId);

        const { data, error } = await query;
        if (error) return { success: false, error: error.message };

        // Map created_at to updated_at placeholder to prevent client crashes
        const mappedProjects = (data || []).map((project: any) => ({
            ...project,
            updated_at: project.created_at
        }));

        return { success: true, count: mappedProjects.length, projects: mappedProjects };
    },
});

export const queryPerformanceReviews = tool({
    description: 'Query performance reviews. Returns review summaries, ratings, and review periods. Use this to check employee performance history or latest reviews.',
    inputSchema: z.object({
        employeeId: z.string().optional().describe('Filter by specific employee ID'),
        reviewPeriod: z.string().optional().describe('Filter by review period string, e.g., "June 2026"'),
        limit: z.number().optional().default(20).describe('Max results to return'),
    }),
    execute: async ({ employeeId, reviewPeriod, limit }) => {
        const supabase = await createClient();
        let query = supabase
            .from('performance_reviews')
            .select('id, employee_id, review_period, ai_summary, rating, created_at')
            .order('created_at', { ascending: false })
            .limit(limit ?? 20);

        if (employeeId) query = query.eq('employee_id', employeeId);
        if (reviewPeriod) query = query.eq('review_period', reviewPeriod);

        const { data, error } = await query;
        if (error) return { success: false, error: error.message };
        return { success: true, count: data?.length ?? 0, reviews: data };
    },
});

export const queryJobPostings = tool({
    description: 'Query active job postings. Returns job title, description, required skills, and active status.',
    inputSchema: z.object({
        activeOnly: z.boolean().optional().default(true).describe('Only return active postings'),
        limit: z.number().optional().default(20).describe('Max results to return'),
    }),
    execute: async ({ activeOnly, limit }) => {
        const supabase = await createClient();
        let query = supabase
            .from('job_postings')
            .select('id, title, description, requirements, required_skills, posted_at')
            .order('posted_at', { ascending: false })
            .limit(limit ?? 20);

        const { data, error } = await query;
        if (error) return { success: false, error: error.message };

        // Map posted_at to created_at and provide is_active: true
        const mappedJobs = (data || []).map((job: any) => ({
            id: job.id,
            title: job.title,
            description: job.description,
            requirements: job.requirements,
            required_skills: job.required_skills,
            is_active: true,
            created_at: job.posted_at
        }));

        return { success: true, count: mappedJobs.length, jobs: mappedJobs };
    },
});

// ============================================================================
// Write Tools (HR_ADMIN only — enforced at the engine level)
// ============================================================================

export const updateLeaveStatus = tool({
    description: 'Approve or reject a leave request. HR_ADMIN only. Use this when the user asks to approve or deny a leave request.',
    inputSchema: z.object({
        leaveId: z.string().describe('The leave request ID to update'),
        status: z.string().describe('New status: approved, rejected'),
        reason: z.string().optional().describe('Optional reason for rejection'),
    }),
    execute: async ({ leaveId, status, reason }) => {
        const supabase = await createClient();
        const lowerStatus = status.toLowerCase();
        if (lowerStatus !== 'approved' && lowerStatus !== 'rejected') {
            return { success: false, error: `Invalid status "${status}". Must be either approved or rejected.` };
        }

        const updateData: Record<string, unknown> = { status: lowerStatus };
        // Note: leave_requests table does not have rejection_reason column in the database,
        // so we only update status (reason is the employee's request reason).

        const { error } = await supabase
            .from('leave_requests')
            .update(updateData)
            .eq('id', leaveId);

        if (error) return { success: false, error: error.message };
        return { success: true, message: `Leave request ${leaveId} ${lowerStatus}` };
    },
});

export const updateApplicationStatus = tool({
    description: 'Update a job application status in the hiring pipeline. HR_ADMIN only. Use this to move candidates through pipeline stages.',
    inputSchema: z.object({
        applicationId: z.string().describe('The application ID to update'),
        newStatus: z.string().describe('New status: NEW, TEST_PENDING, SHORTLISTED, interview, offer, HIRED, REJECTED'),
    }),
    execute: async ({ applicationId, newStatus }) => {
        const supabase = await createClient();
        const { error } = await supabase
            .from('applications')
            .update({ status: newStatus })
            .eq('id', applicationId);

        if (error) return { success: false, error: error.message };
        return { success: true, message: `Application ${applicationId} moved to ${newStatus}` };
    },
});

export const createAnnouncement = tool({
    description: 'Create a new company announcement. HR_ADMIN only. Use when the user wants to post an announcement to all employees.',
    inputSchema: z.object({
        title: z.string().describe('Announcement title'),
        content: z.string().describe('Announcement body content'),
        priority: z.enum(['low', 'normal', 'high']).optional().default('normal').describe('Priority level'),
    }),
    execute: async ({ title, content, priority }) => {
        const supabase = await createClient();
        const upperPriority = (priority || 'normal').toUpperCase();
        const { data, error } = await supabase
            .from('announcements')
            .insert({ title, content, priority: upperPriority })
            .select()
            .single();

        if (error) return { success: false, error: error.message };
        return { success: true, announcement: data, message: `Announcement "${title}" created` };
    },
});

// ============================================================================
// Aggregation / Analytics Tools
// ============================================================================

export const getHiringPipelineStats = tool({
    description: 'Get hiring pipeline statistics — count of candidates at each stage. Use for dashboard overviews or when asked about hiring funnel status.',
    inputSchema: z.object({}).nullish(),
    execute: async () => {
        const supabase = await createClient();
        const { data, error } = await supabase
            .from('applications')
            .select('status');

        if (error) return { success: false, error: error.message };

        const stats: Record<string, number> = {};
        (data || []).forEach((app: { status: string }) => {
            stats[app.status] = (stats[app.status] || 0) + 1;
        });

        return {
            success: true,
            total: data?.length ?? 0,
            byStatus: stats,
        };
    },
});

export const getWorkforceOverview = tool({
    description: 'Get a high-level overview of the workforce — total employees, roles breakdown, recent hires, employees on leave. Use this for dashboard summaries.',
    inputSchema: z.object({}).nullish(),
    execute: async () => {
        const supabase = await createClient();

        const [profilesRes, leavesRes, projectsRes] = await Promise.all([
            supabase.from('profiles').select('id, role, created_at'),
            supabase.from('leave_requests').select('id, status, start_date, end_date').eq('status', 'approved'),
            supabase.from('projects').select('id, status'),
        ]);

        const profiles = profilesRes.data || [];
        const leaves = leavesRes.data || [];
        const projects = projectsRes.data || [];

        const today = new Date().toISOString().split('T')[0];
        const currentlyOnLeave = leaves.filter((l: any) => l.start_date <= today && l.end_date >= today);

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const recentHires = profiles.filter((p: any) => new Date(p.created_at) >= thirtyDaysAgo);

        return {
            success: true,
            totalEmployees: profiles.length,
            hrAdmins: profiles.filter((p: any) => p.role === 'HR_ADMIN').length,
            standardUsers: profiles.filter((p: any) => p.role !== 'HR_ADMIN').length,
            currentlyOnLeave: currentlyOnLeave.length,
            recentHires: recentHires.length,
            activeProjects: projects.filter((p: any) => p.status === 'ACTIVE').length,
            completedProjects: projects.filter((p: any) => p.status === 'COMPLETED').length,
        };
    },
});

// ============================================================================
// Tool Registry
// ============================================================================

/** All read-only tools (available to all authenticated users) */
export const readTools = {
    queryEmployees,
    queryLeaveRequests,
    queryApplications,
    queryTasks,
    queryProjects,
    queryPerformanceReviews,
    queryJobPostings,
    getHiringPipelineStats,
    getWorkforceOverview,
};

/** Write tools (HR_ADMIN only) */
export const writeTools = {
    updateLeaveStatus,
    updateApplicationStatus,
    createAnnouncement,
};

/** All tools combined */
export const allTools = {
    ...readTools,
    ...writeTools,
};
