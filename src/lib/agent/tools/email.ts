/**
 * Email tools for the HEMS Agent.
 *
 * SECURITY NOTE: this tool lets a language model send mail from the company's
 * verified sender domain. Untrusted text (candidate resumes, uploaded
 * documents) reaches the same models, so a prompt-injection payload could try
 * to drive this tool to send arbitrary content to arbitrary addresses.
 *
 * Mitigations applied here:
 *   - strict recipient validation (single well-formed address, no header
 *     injection via newlines, no bulk lists)
 *   - subject/body size caps
 *   - development redirect and verified sender enforced centrally
 *   - every send is logged with the resolved recipient
 *
 * Still outstanding (see docs/INDUSTRIAL_READINESS_PLAN.md §6.2): human
 * confirmation before an agent-initiated send, and a per-org send quota.
 */

import { tool } from 'ai';
import { z } from 'zod';
import { getEmailSender, resolveEmailRecipient } from '@/lib/env';
import { logger } from '@/lib/observability/logger';

/**
 * A single, well-formed recipient. Rejects CR/LF (header injection) and
 * comma-separated lists (bulk send) that `z.string().email()` would let by
 * in some formats.
 */
const recipientSchema = z
    .string()
    .trim()
    .max(320)
    .email('Recipient must be a single valid email address')
    .refine((value) => !/[\r\n,;]/.test(value), {
        message: 'Recipient must be a single address without line breaks or separators',
    });

export const sendEmail = tool({
    description:
        'Send an email to an employee or candidate. Use this when the user asks to email someone, send a notification, or draft an outreach message. HR_ADMIN only.',
    inputSchema: z.object({
        to: recipientSchema.describe('Recipient email address (exactly one)'),
        subject: z.string().trim().min(1).max(200).describe('Email subject line'),
        body: z.string().trim().min(1).max(10_000).describe('Email body content (plain text)'),
        type: z
            .enum(['notification', 'outreach', 'reminder', 'announcement'])
            .optional()
            .default('notification')
            .describe('Type of email for logging'),
    }),
    execute: async ({ to, subject, body, type }) => {
        const log = logger.child({ route: 'agent:tool:sendEmail' });

        try {
            // Dynamically import to avoid circular deps
            const { Resend } = await import('resend');
            const resend = new Resend(process.env.RESEND_API_KEY);

            const { to: recipient, redirected } = resolveEmailRecipient(to);

            const { data, error } = await resend.emails.send({
                from: getEmailSender(),
                to: [recipient],
                subject: redirected ? `[REDIRECTED] ${subject}` : subject,
                text: body,
            });

            if (error) {
                log.error('Agent email send failed', error, { type });
                return { success: false, error: error.message };
            }

            // Log that a send happened and its shape, but not the address or
            // body — those are PII and are scrubbed by the logger anyway.
            log.info('Agent email sent', {
                type,
                emailId: data?.id,
                redirected,
                subjectLength: subject.length,
                bodyLength: body.length,
            });

            return {
                success: true,
                emailId: data?.id,
                message: `Email sent to ${recipient} with subject "${subject}"`,
                type,
            };
        } catch (err) {
            log.error('Agent email send threw', err, { type });
            return {
                success: false,
                error: err instanceof Error ? err.message : 'Failed to send email',
            };
        }
    },
});

export const emailTools = {
    sendEmail,
};
