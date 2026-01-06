'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

interface LeaveRequest {
    id: string
    user_id: string
    start_date: string
    end_date: string
    reason: string
    status: 'pending' | 'approved' | 'rejected'
    created_at: string
    profile?: {
        full_name: string
        email: string
    }
}

export async function submitLeaveRequest(formData: FormData) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { success: false, message: 'Not authenticated' }
    }

    const startDate = formData.get('start_date') as string
    const endDate = formData.get('end_date') as string
    const reason = formData.get('reason') as string

    if (!startDate || !endDate || !reason) {
        return { success: false, message: 'All fields are required' }
    }

    // Validate dates
    if (new Date(startDate) > new Date(endDate)) {
        return { success: false, message: 'End date must be after start date' }
    }

    const { error } = await supabase
        .from('leave_requests')
        .insert({
            user_id: user.id,
            start_date: startDate,
            end_date: endDate,
            reason: reason.trim()
        })

    if (error) {
        console.error('Error submitting leave request:', error)
        return { success: false, message: 'Failed to submit leave request' }
    }

    revalidatePath('/dashboard/employee/leave')
    return { success: true, message: 'Leave request submitted successfully' }
}

export async function getMyLeaveRequests() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const { data, error } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching leave requests:', error)
        return []
    }

    return data as LeaveRequest[]
}

export async function getAllLeaveRequests() {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('leave_requests')
        .select(`
            *,
            profile:profiles(full_name, email)
        `)
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching all leave requests:', error)
        return []
    }

    return data as LeaveRequest[]
}

export async function updateLeaveStatus(requestId: string, newStatus: 'approved' | 'rejected') {
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

    // Get leave request details for email
    const { data: leaveRequest } = await supabase
        .from('leave_requests')
        .select(`
            *,
            profile:profiles(full_name, email)
        `)
        .eq('id', requestId)
        .single()

    // Update status
    const { error } = await supabase
        .from('leave_requests')
        .update({ status: newStatus })
        .eq('id', requestId)

    if (error) {
        console.error('Error updating leave status:', error)
        return { success: false, message: 'Failed to update leave status' }
    }

    // Send email notification if approved
    if (newStatus === 'approved' && leaveRequest?.profile) {
        try {
            const testEmail = process.env.TEST_ADMIN_EMAIL || 'latesh312006@gmail.com'

            await resend.emails.send({
                from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
                to: testEmail, // Using test email for development
                subject: 'Leave Request Approved',
                html: `
                    <h2>Leave Request Approved</h2>
                    <p>Dear ${leaveRequest.profile.full_name},</p>
                    <p>Your leave request has been <strong>approved</strong>.</p>
                    <p><strong>Details:</strong></p>
                    <ul>
                        <li>Start Date: ${new Date(leaveRequest.start_date).toLocaleDateString()}</li>
                        <li>End Date: ${new Date(leaveRequest.end_date).toLocaleDateString()}</li>
                        <li>Reason: ${leaveRequest.reason}</li>
                    </ul>
                    <p>Best regards,<br>HR Team</p>
                `
            })
        } catch (emailError) {
            console.error('Error sending email:', emailError)
            // Don't fail the request if email fails
        }
    }

    revalidatePath('/dashboard/leave')
    revalidatePath('/dashboard/employee/leave')

    return { success: true, message: `Leave request ${newStatus}` }
}
