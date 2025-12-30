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
