import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendAssessmentInvite(email: string, candidateId: string, candidateName: string) {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const assessmentLink = `${baseUrl}/assessment/${candidateId}`;

    try {
        const { data, error } = await resend.emails.send({
            from: process.env.RESEND_FROM_EMAIL || 'HR Team <hr@yourdomain.com>',
            to: email,
            subject: '🎯 Complete Your Technical Assessment',
            html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f4f4f5;">
    <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="background: linear-gradient(135deg, #0066FF 0%, #0052CC 100%); border-radius: 16px 16px 0 0; padding: 40px 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">Technical Assessment</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">Your application has been shortlisted!</p>
        </div>
        
        <div style="background: white; padding: 40px 30px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Hi <strong>${candidateName}</strong>,
            </p>
            
            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Congratulations! Our AI-powered screening has identified you as a strong candidate. 
                The next step is to complete a short technical assessment.
            </p>
            
            <div style="background: #f8fafc; border-radius: 12px; padding: 20px; margin: 30px 0;">
                <p style="color: #64748b; font-size: 14px; margin: 0 0 10px 0;">📝 <strong>What to expect:</strong></p>
                <ul style="color: #64748b; font-size: 14px; margin: 0; padding-left: 20px;">
                    <li>10-15 multiple choice questions (MCQs)</li>
                    <li>Takes approximately 10-15 minutes</li>
                    <li>Questions tailored to your resume skills</li>
                    <li>70% or above to proceed to interview</li>
                    <li>Instant results after submission</li>
                </ul>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="${assessmentLink}" style="display: inline-block; background: linear-gradient(135deg, #0066FF 0%, #0052CC 100%); color: white; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                    Start Assessment →
                </a>
            </div>
            
            <p style="color: #9ca3af; font-size: 14px; text-align: center; margin: 30px 0 0 0;">
                If the button doesn't work, copy this link:<br>
                <a href="${assessmentLink}" style="color: #0066FF; word-break: break-all;">${assessmentLink}</a>
            </p>
        </div>
        
        <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 20px;">
            This is an automated message from our HR system.
        </p>
    </div>
</body>
</html>
            `,
        });

        if (error) {
            console.error('Email send error:', error);
            return { success: false, error: error.message };
        }

        console.log('Assessment invite sent:', data);
        return { success: true, data };
    } catch (err: any) {
        console.error('Email service error:', err);
        return { success: false, error: err.message };
    }
}

export async function sendRejectionEmail(email: string, candidateName: string) {
    try {
        const { data, error } = await resend.emails.send({
            from: process.env.RESEND_FROM_EMAIL || 'HR Team <hr@yourdomain.com>',
            to: email,
            subject: 'Update on Your Application',
            html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f4f4f5;">
    <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="background: white; padding: 40px 30px; border-radius: 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Dear <strong>${candidateName}</strong>,
            </p>
            
            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Thank you for your interest in joining our team and for taking the time to apply.
            </p>
            
            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                After careful consideration, we have decided to move forward with other candidates 
                whose qualifications more closely match our current needs.
            </p>
            
            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                We encourage you to apply for future positions that match your skills. 
                We wish you the best in your job search and future endeavors.
            </p>
            
            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 20px 0 0 0;">
                Best regards,<br>
                <strong>The HR Team</strong>
            </p>
        </div>
    </div>
</body>
</html>
            `,
        });

        if (error) {
            console.error('Rejection email error:', error);
            return { success: false, error: error.message };
        }

        return { success: true, data };
    } catch (err: any) {
        console.error('Email service error:', err);
        return { success: false, error: err.message };
    }
}

export async function sendInterviewReadyEmail(email: string, candidateName: string) {
    try {
        const { data, error } = await resend.emails.send({
            from: process.env.RESEND_FROM_EMAIL || 'HR Team <hr@yourdomain.com>',
            to: email,
            subject: '🎉 Great News - Interview Invitation!',
            html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f4f4f5;">
    <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="background: linear-gradient(135deg, #10B981 0%, #059669 100%); border-radius: 16px 16px 0 0; padding: 40px 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">🎉 Congratulations!</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">You passed the technical assessment!</p>
        </div>
        
        <div style="background: white; padding: 40px 30px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Hi <strong>${candidateName}</strong>,
            </p>
            
            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                We're impressed with your technical assessment results! You've demonstrated 
                strong skills and we'd love to move forward with an interview.
            </p>
            
            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Our HR team will reach out shortly to schedule a convenient time for your interview.
            </p>
            
            <div style="background: #ecfdf5; border-left: 4px solid #10B981; padding: 15px 20px; margin: 20px 0;">
                <p style="color: #065f46; margin: 0; font-size: 14px;">
                    <strong>Next Steps:</strong><br>
                    Expect an email from our team within 2-3 business days with interview details.
                </p>
            </div>
            
            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 20px 0 0 0;">
                Best regards,<br>
                <strong>The HR Team</strong>
            </p>
        </div>
    </div>
</body>
</html>
            `,
        });

        if (error) {
            console.error('Interview ready email error:', error);
            return { success: false, error: error.message };
        }

        return { success: true, data };
    } catch (err: any) {
        console.error('Email service error:', err);
        return { success: false, error: err.message };
    }
}

export async function sendOfferEmail(email: string, candidateName: string, offerContent: string, role: string) {
    try {
        const { data, error } = await resend.emails.send({
            from: process.env.RESEND_FROM_EMAIL || 'HR Team <hr@yourdomain.com>',
            to: email,
            subject: `🎉 Job Offer - ${role} Position`,
            html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f4f4f5;">
    <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="background: linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%); border-radius: 16px 16px 0 0; padding: 40px 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">🎉 Congratulations!</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">You've received a job offer!</p>
        </div>
        
        <div style="background: white; padding: 40px 30px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Dear <strong>${candidateName}</strong>,
            </p>
            
            <div style="background: #f8fafc; border-radius: 12px; padding: 20px; margin: 20px 0; white-space: pre-wrap; font-size: 15px; line-height: 1.8; color: #374151;">
${offerContent}
            </div>
            
            <div style="background: #f3e8ff; border-left: 4px solid #8B5CF6; padding: 15px 20px; margin: 20px 0;">
                <p style="color: #6D28D9; margin: 0; font-size: 14px;">
                    <strong>Next Steps:</strong><br>
                    Please reply to this email to accept or discuss this offer. We're excited to potentially have you on our team!
                </p>
            </div>
            
            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 20px 0 0 0;">
                Best regards,<br>
                <strong>The HR Team</strong>
            </p>
        </div>
        
        <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 20px;">
            This is an official offer letter from our company.
        </p>
    </div>
</body>
</html>
            `,
        });

        if (error) {
            console.error('Offer email error:', error);
            return { success: false, error: error.message };
        }

        console.log('Offer email sent:', data);
        return { success: true, data };
    } catch (err: any) {
        console.error('Email service error:', err);
        return { success: false, error: err.message };
    }
}

export async function sendInterviewScheduleEmail(
    email: string,
    candidateName: string,
    role: string,
    interviewType: string,
    date: string,
    time: string,
    meetingLink?: string
) {
    const typeLabel = interviewType === 'video' ? 'video call' :
        interviewType === 'in-person' ? 'in-person' : 'phone';

    const linkSection = meetingLink
        ? `<div style="background: #eff6ff; border-radius: 8px; padding: 15px; margin: 20px 0; text-align: center;">
                <p style="color: #1e40af; margin: 0 0 10px 0; font-size: 14px;"><strong>📹 Video Meeting Link:</strong></p>
                <a href="https://${meetingLink}" style="color: #2563eb; font-size: 14px; word-break: break-all;">https://${meetingLink}</a>
           </div>`
        : '';

    try {
        const { data, error } = await resend.emails.send({
            from: process.env.RESEND_FROM_EMAIL || 'HR Team <hr@yourdomain.com>',
            to: email,
            subject: `📅 Interview Invitation - ${role} at HEMS`,
            html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f4f4f5;">
    <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); border-radius: 16px 16px 0 0; padding: 40px 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">📅 Interview Scheduled!</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">You're one step closer to joining our team</p>
        </div>
        
        <div style="background: white; padding: 40px 30px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Hi <strong>${candidateName}</strong>,
            </p>
            
            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                We were impressed by your profile and would like to invite you to a <strong>${typeLabel}</strong> interview for the <strong>${role}</strong> position.
            </p>
            
            <div style="background: #fff7ed; border-radius: 12px; padding: 20px; margin: 25px 0;">
                <p style="color: #9a3412; margin: 0 0 15px 0; font-size: 14px; font-weight: 600;">📋 Interview Details:</p>
                <table style="width: 100%; font-size: 14px;">
                    <tr>
                        <td style="color: #78716c; padding: 5px 0;">Date:</td>
                        <td style="color: #1c1917; font-weight: 600;">${date}</td>
                    </tr>
                    <tr>
                        <td style="color: #78716c; padding: 5px 0;">Time:</td>
                        <td style="color: #1c1917; font-weight: 600;">${time}</td>
                    </tr>
                    <tr>
                        <td style="color: #78716c; padding: 5px 0;">Type:</td>
                        <td style="color: #1c1917; font-weight: 600; text-transform: capitalize;">${typeLabel}</td>
                    </tr>
                </table>
            </div>
            
            ${linkSection}
            
            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Please confirm your availability by replying to this email. If you need to reschedule, let us know as soon as possible.
            </p>
            
            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 20px 0 0 0;">
                Best regards,<br>
                <strong>The HEMS HR Team</strong>
            </p>
        </div>
        
        <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 20px;">
            This is an automated message from our HR system.
        </p>
    </div>
</body>
</html>
            `,
        });

        if (error) {
            console.error('Interview schedule email error:', error);
            return { success: false, error: error.message };
        }

        console.log('Interview schedule email sent:', data);
        return { success: true, data };
    } catch (err: any) {
        console.error('Email service error:', err);
        return { success: false, error: err.message };
    }
}

export async function sendWelcomeEmail(
    email: string,
    candidateName: string,
    role: string,
    joiningDate: string
) {
    try {
        const { data, error } = await resend.emails.send({
            from: process.env.RESEND_FROM_EMAIL || 'HR Team <hr@yourdomain.com>',
            to: email,
            subject: `🎉 Welcome to the Team! Your start date is ${joiningDate}`,
            html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f4f4f5;">
    <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); border-radius: 16px 16px 0 0; padding: 40px 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">🎉 Welcome Aboard!</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">You're officially part of the team!</p>
        </div>
        
        <div style="background: white; padding: 40px 30px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Dear <strong>${candidateName}</strong>,
            </p>
            
            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                We are thrilled to offer you the position of <strong>${role}</strong> at our company!
            </p>
            
            <div style="background: #f0fdf4; border-radius: 12px; padding: 20px; margin: 25px 0;">
                <p style="color: #166534; margin: 0 0 15px 0; font-size: 14px; font-weight: 600;">📅 Your Start Date:</p>
                <p style="color: #15803d; font-size: 20px; font-weight: 700; margin: 0;">${joiningDate}</p>
                <p style="color: #166534; font-size: 13px; margin: 10px 0 0 0;">Please arrive at 9:00 AM</p>
            </div>
            
            <div style="background: #fefce8; border-left: 4px solid #eab308; padding: 15px 20px; margin: 20px 0;">
                <p style="color: #854d0e; margin: 0; font-size: 14px;">
                    <strong>What to bring on your first day:</strong><br>
                    • Government-issued ID for verification<br>
                    • Banking details for payroll setup<br>
                    • Any pending documentation
                </p>
            </div>
            
            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Our HR team will be there to welcome you and guide you through the onboarding process.
                We're excited to have you on board and look forward to your contributions!
            </p>
            
            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 20px 0 0 0;">
                Best regards,<br>
                <strong>The HEMS HR Team</strong>
            </p>
        </div>
        
        <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 20px;">
            This is an official onboarding message from our company.
        </p>
    </div>
</body>
</html>
            `,
        });

        if (error) {
            console.error('Welcome email error:', error);
            return { success: false, error: error.message };
        }

        console.log('Welcome email sent:', data);
        return { success: true, data };
    } catch (err: any) {
        console.error('Email service error:', err);
        return { success: false, error: err.message };
    }
}
