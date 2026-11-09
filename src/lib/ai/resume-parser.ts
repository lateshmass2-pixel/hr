import { generateText } from "ai"
import { groq, AI_MODEL } from "@/lib/ai"

export interface ParsedResume {
    name: string | null
    email: string | null
    phone: string | null
    title: string | null
    skills: string[]
}

/**
 * Fast structured field extraction from resume text using Groq
 * (llama-3.1-8b-instant is low-latency, so this stays snappy).
 *
 * This is used for DISPLAY fields only — name, email, title, and skills.
 * The candidate↔JD match score is still computed purely from embeddings
 * (cosine similarity), so AI never influences scoring.
 *
 * Returns null if the model is unavailable or the output can't be parsed,
 * letting callers fall back to regex heuristics.
 */
export async function parseResumeWithAI(resumeText: string): Promise<ParsedResume | null> {
    const text = (resumeText || "").slice(0, 8000) // header + skills fit comfortably; keeps it fast
    if (!text.trim()) return null

    try {
        const { text: out } = await generateText({
            model: groq(AI_MODEL),
            system: `You extract structured data from a resume. Respond with ONLY valid JSON (no markdown, no commentary), exactly this shape:
{
  "name": "candidate full name, or null if not found",
  "email": "primary email address, or null",
  "phone": "primary phone number, or null",
  "title": "the candidate's current or most recent job title, or null",
  "skills": ["concrete technical skills, tools, languages, frameworks"]
}
Rules:
- "name" is the person's name — never a section header, company, or job title.
- "skills": up to 15 specific items (e.g. "React.js", "PostgreSQL", "AWS"); exclude soft skills.
- Use null (not an empty string) when a field is genuinely absent.`,
            prompt: `Resume:\n${text}`,
        })

        const clean = out.replace(/```json\n?|```/g, "").trim()
        const parsed = JSON.parse(clean) as Record<string, unknown>

        const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null)

        return {
            name: str(parsed.name),
            email: str(parsed.email),
            phone: str(parsed.phone),
            title: str(parsed.title),
            skills: Array.isArray(parsed.skills)
                ? parsed.skills
                    .filter((s): s is string => typeof s === "string" && s.trim().length > 0)
                    .map((s) => s.trim())
                    .slice(0, 15)
                : [],
        }
    } catch (err) {
        console.error("⚠️ AI resume parse failed, falling back to regex:", err)
        return null
    }
}
