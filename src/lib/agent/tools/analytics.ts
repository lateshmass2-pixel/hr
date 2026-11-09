/**
 * Analytics tools for the HEMS Agent.
 * Provides computed metrics, trend analysis, and date utilities.
 */

import { tool } from 'ai';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

export const getTeamWorkload = tool({
    description: 'Analyze team workload distribution. Shows how many tasks each team member has by status. Use when asked about workload balance, who is overloaded, or who has capacity.',
    inputSchema: z.object({
        projectId: z.string().optional().describe('Optionally scope to a specific project'),
    }),
    execute: async ({ projectId }) => {
        const supabase = await createClient();

        let query = supabase
            .from('tasks')
            .select('assigned_to, status');

        if (projectId) query = query.eq('project_id', projectId);

        const { data: tasks, error } = await query;
        if (error) return { success: false, error: error.message };

        // Aggregate by assignee
        const workload: Record<string, { total: number; todo: number; inProgress: number; done: number }> = {};

        (tasks || []).forEach((t: any) => {
            if (!t.assigned_to) return;
            if (!workload[t.assigned_to]) {
                workload[t.assigned_to] = { total: 0, todo: 0, inProgress: 0, done: 0 };
            }
            workload[t.assigned_to].total++;
            if (t.status === 'TODO') workload[t.assigned_to].todo++;
            else if (t.status === 'IN_PROGRESS') workload[t.assigned_to].inProgress++;
            else if (t.status === 'COMPLETED' || t.status === 'READY_FOR_REVIEW') workload[t.assigned_to].done++;
        });

        // Get names for the assignee IDs
        const ids = Object.keys(workload);
        if (ids.length === 0) return { success: true, message: 'No tasks assigned to anyone', workload: {} };

        const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name')
            .in('id', ids);

        const nameMap = new Map((profiles || []).map((p: any) => [p.id, p.full_name]));

        const result = Object.entries(workload).map(([id, stats]) => ({
            employeeId: id,
            name: nameMap.get(id) || 'Unknown',
            ...stats,
        }));

        // Sort by total tasks descending
        result.sort((a, b) => b.total - a.total);

        return { success: true, workload: result };
    },
});

export const getLeaveOverlaps = tool({
    description: 'Check for leave overlaps in a date range. Use to check team coverage, detect scheduling conflicts, or validate if approving a leave request would leave a team understaffed.',
    inputSchema: z.object({
        startDate: z.string().describe('Start date in ISO format (YYYY-MM-DD)'),
        endDate: z.string().describe('End date in ISO format (YYYY-MM-DD)'),
    }),
    execute: async ({ startDate, endDate }) => {
        const supabase = await createClient();

        const { data: leaves, error } = await supabase
            .from('leave_requests')
            .select('id, user_id, start_date, end_date, status, reason')
            .eq('status', 'approved')
            .lte('start_date', endDate)
            .gte('end_date', startDate);

        if (error) return { success: false, error: error.message };

        if (!leaves || leaves.length === 0) {
            return { success: true, overlaps: 0, message: 'No employees on leave during this period' };
        }

        // Get names
        const userIds = [...new Set(leaves.map((l: any) => l.user_id))];
        const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name')
            .in('id', userIds);

        const nameMap = new Map((profiles || []).map((p: any) => [p.id, p.full_name]));

        const results = leaves.map((l: any) => ({
            ...l,
            employee_name: nameMap.get(l.user_id) || 'Unknown',
        }));

        return {
            success: true,
            overlaps: results.length,
            period: { startDate, endDate },
            employeesOnLeave: results,
        };
    },
});

export const getCurrentDate = tool({
    description: 'Get the current date and time. Use this when you need to reference today, calculate relative dates, or determine the current review period.',
    inputSchema: z.object({}).nullish(),
    execute: async () => {
        const now = new Date();
        return {
            iso: now.toISOString(),
            date: now.toISOString().split('T')[0],
            time: now.toTimeString().split(' ')[0],
            dayOfWeek: now.toLocaleDateString('en-US', { weekday: 'long' }),
            month: now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        };
    },
});

export const analyticsTools = {
    getTeamWorkload,
    getLeaveOverlaps,
    getCurrentDate,
};
