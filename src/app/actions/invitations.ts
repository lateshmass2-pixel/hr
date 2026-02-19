// =============================================================================
// Server Actions — Organization Invite System
// =============================================================================

'use server';

import { createClient } from '@/lib/supabase/server';
import { requirePermission } from '@/lib/rbac/guard';
import { createAuditLog } from '@/lib/audit';
import { CreateInviteSchema, AcceptInviteSchema } from '@/lib/validations/schemas';
import { safeError, getAppUrl } from '@/lib/security';

/**
 * Send an invitation to join an organization
 */
export async function sendInvitation(formData: FormData) {
    try {
        const raw = {
            organizationId: formData.get('organizationId') as string,
            email: formData.get('email') as string,
            role: formData.get('role') as string,
        };

        const validated = CreateInviteSchema.parse(raw);
        const ctx = await requirePermission(validated.organizationId, 'invitations:create');

        const supabase = await createClient();

        // Check if user is already a member
        const { data: existingMember } = await supabase
            .from('organization_members')
            .select('id')
            .eq('organization_id', validated.organizationId)
            .eq('user_id', (
                await supabase.from('auth.users').select('id').eq('email', validated.email).single()
            ).data?.id ?? '00000000-0000-0000-0000-000000000000')
            .single();

        if (existingMember) {
            return { error: 'This user is already a member of the organization' };
        }

        // Check for existing pending invite
        const { data: existingInvite } = await supabase
            .from('organization_invitations')
            .select('id')
            .eq('organization_id', validated.organizationId)
            .eq('email', validated.email)
            .eq('status', 'pending')
            .single();

        if (existingInvite) {
            return { error: 'A pending invitation already exists for this email' };
        }

        // Create invitation
        const { data: invitation, error } = await supabase
            .from('organization_invitations')
            .insert({
                organization_id: validated.organizationId,
                email: validated.email,
                role: validated.role,
                invited_by: ctx.userId,
            })
            .select('id, token')
            .single();

        if (error) throw error;

        // Generate invite link
        const inviteLink = `${getAppUrl()}/invite/accept?token=${invitation.token}`;

        // Audit log
        await createAuditLog({
            organizationId: validated.organizationId,
            actorId: ctx.userId,
            action: 'invitation.create',
            entityType: 'invitation',
            entityId: invitation.id,
            changes: { after: { email: validated.email, role: validated.role } },
        });

        // TODO: Send email via Resend
        // await sendInviteEmail({ to: validated.email, inviteLink, orgName: ... });

        return { success: true, inviteLink };
    } catch (error) {
        return safeError(error);
    }
}

/**
 * Accept an invitation using the invite token.
 * Called by the invited user after signing up / logging in.
 */
export async function acceptInvitation(token: string) {
    try {
        const validated = AcceptInviteSchema.parse({ token });

        const supabase = await createClient();

        // Use the security-definer function in the DB
        const { data, error } = await supabase.rpc('accept_invitation', {
            invite_token: validated.token,
        });

        if (error) throw error;

        const result = data as any;
        if (result?.error) {
            return { error: result.error };
        }

        return {
            success: true,
            organizationId: result.organization_id,
            organizationName: result.organization_name,
            role: result.role,
        };
    } catch (error) {
        return safeError(error);
    }
}

/**
 * Revoke a pending invitation
 */
export async function revokeInvitation(organizationId: string, invitationId: string) {
    try {
        const ctx = await requirePermission(organizationId, 'invitations:delete');

        const supabase = await createClient();

        const { error } = await supabase
            .from('organization_invitations')
            .update({ status: 'revoked' })
            .eq('id', invitationId)
            .eq('organization_id', organizationId)
            .eq('status', 'pending');

        if (error) throw error;

        await createAuditLog({
            organizationId,
            actorId: ctx.userId,
            action: 'invitation.revoke',
            entityType: 'invitation',
            entityId: invitationId,
        });

        return { success: true };
    } catch (error) {
        return safeError(error);
    }
}

/**
 * List all invitations for an organization
 */
export async function listInvitations(organizationId: string) {
    try {
        await requirePermission(organizationId, 'invitations:read');

        const supabase = await createClient();

        const { data, error } = await supabase
            .from('organization_invitations')
            .select('*')
            .eq('organization_id', organizationId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        return { success: true, invitations: data ?? [] };
    } catch (error) {
        return safeError(error);
    }
}
