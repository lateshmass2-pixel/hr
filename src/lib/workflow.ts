import { db } from "@/lib/db";
import { ApplicationStatus } from "@prisma/client";

// Simulation of AI Service
async function analyzeResume(text: string) {
    // Call OpenAI/Gemini here
    return { score: 85, summary: "Strong candidate" };
}

export async function processApplicationWorkflow(applicationId: string) {
    const application = await db.jobApplication.findUnique({
        where: { id: applicationId },
    });

    if (!application) throw new Error("Application not found");

    switch (application.status) {
        case "NEW":
            // AUTO: Move to Screening
            await updateStatus(applicationId, "SCREENING");
            // Trigger Screening
            await runScreening(applicationId);
            break;

        case "SCREENING":
            // AUTO: Check Score
            if (application.score && application.score >= 70) {
                await updateStatus(applicationId, "SHORTLISTED");
            } else if (application.score && application.score < 70) {
                await updateStatus(applicationId, "REJECTED"); // Auto-Reject
            }
            break;

        case "SHORTLISTED":
            // AUTO: Schedule Interview (Mock)
            // await sendInterviewInvite(application.email);
            await updateStatus(applicationId, "INTERVIEW");
            break;

        case "INTERVIEW":
            // MANUAL: Interviewer must score/pass. 
            // If passed, move to Offer Pending
            // This step is NOT fully automated, waits for feedback.
            break;

        case "OFFER_PENDING":
            // CRITICAL: HUMAN-IN-THE-LOOP
            // System pauses here.
            // Admin must call `approveHiring(id)` explicitly.
            break;

        case "HIRED":
            // Onboarding logic
            break;
    }
}

async function runScreening(appId: string) {
    const app = await db.jobApplication.findUnique({ where: { id: appId } });
    if (!app?.resumeText) return;

    const analysis = await analyzeResume(app.resumeText);

    await db.jobApplication.update({
        where: { id: appId },
        data: { score: analysis.score }
    });

    // Re-trigger workflow to check score
    await processApplicationWorkflow(appId);
}

async function updateStatus(id: string, status: ApplicationStatus) {
    await db.jobApplication.update({
        where: { id },
        data: { status }
    });
}

// Admin Action
export async function approveHiring(applicationId: string) {
    const app = await db.jobApplication.findUnique({ where: { id: applicationId } });
    if (app?.status !== "OFFER_PENDING") {
        throw new Error("Application is not in Offer Pending stage.");
    }

    // Generate Offer Letter (AI)
    // await generateOfferLetter(app);

    await db.jobApplication.update({
        where: { id: applicationId },
        data: { status: "HIRED" }
    });

    // Send Email
}
