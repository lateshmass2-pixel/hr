/**
 * Match Score Calculator Utility
 * Calculates candidate match percentage based on skills vs job requirements.
 */

// Default job requirements (used as fallback when no specific job is selected)
const DEFAULT_JOB_REQUIREMENTS = {
    mustHave: ["React", "TypeScript", "Node.js"],
    niceToHave: ["AWS", "Tailwind", "GraphQL", "Docker", "PostgreSQL"]
};

export interface ScoreResult {
    score: number;
    color: string;
    matchedMustHaves: string[];
    matchedNiceToHaves: string[];
    missingMustHaves: string[];
}

export interface JobRequirements {
    mustHave: string[];
    niceToHave: string[];
}

/**
 * Calculates a match score by comparing candidate skills against job requirements.
 * Must-haves are weighted at 70%, nice-to-haves at 30%.
 * 
 * @param candidateSkills - Array of skills the candidate has
 * @param jobRequirements - Optional custom job requirements (defaults to standard requirements)
 * @returns ScoreResult with score, color styling, and detailed matches
 */
export function calculateMatchScore(
    candidateSkills: string[],
    jobRequirements: JobRequirements = DEFAULT_JOB_REQUIREMENTS
): ScoreResult {
    let score = 0;

    // Normalize to lowercase for comparison
    const skills = candidateSkills.map(s => s.toLowerCase());
    const mustHaves = jobRequirements.mustHave.map(s => s.toLowerCase());
    const niceToHaves = jobRequirements.niceToHave.map(s => s.toLowerCase());

    const matchedMustHaves: string[] = [];
    const matchedNiceToHaves: string[] = [];
    const missingMustHaves: string[] = [];

    // Must-haves are worth 70% of the score
    const mustHaveWeight = mustHaves.length > 0 ? 70 / mustHaves.length : 0;
    mustHaves.forEach((req, idx) => {
        const matches = skills.some(skill =>
            skill.includes(req) || req.includes(skill)
        );
        if (matches) {
            score += mustHaveWeight;
            matchedMustHaves.push(jobRequirements.mustHave[idx]);
        } else {
            missingMustHaves.push(jobRequirements.mustHave[idx]);
        }
    });

    // Nice-to-haves are worth 30% of the score
    const niceToHaveWeight = niceToHaves.length > 0 ? 30 / niceToHaves.length : 0;
    niceToHaves.forEach((req, idx) => {
        const matches = skills.some(skill =>
            skill.includes(req) || req.includes(skill)
        );
        if (matches) {
            score += niceToHaveWeight;
            matchedNiceToHaves.push(jobRequirements.niceToHave[idx]);
        }
    });

    // Round to nearest integer
    const finalScore = Math.round(score);

    // Determine color based on score
    let color = "text-red-600 bg-red-50 border-red-200"; // Low (0-40)
    if (finalScore > 75) {
        color = "text-green-600 bg-green-50 border-green-200"; // High (75+)
    } else if (finalScore > 40) {
        color = "text-orange-600 bg-orange-50 border-orange-200"; // Medium (41-75)
    }

    return {
        score: finalScore,
        color,
        matchedMustHaves,
        matchedNiceToHaves,
        missingMustHaves
    };
}

/**
 * Quick score calculation that returns just score and color.
 * 
 * @param candidateSkills - Array of skills the candidate has
 * @returns Object with score and color
 */
export function getQuickScore(candidateSkills: string[]): { score: number; color: string } {
    const result = calculateMatchScore(candidateSkills);
    return { score: result.score, color: result.color };
}

/**
 * Parses job description text to extract requirements.
 * 
 * @param jobDescription - Raw job description text
 * @returns JobRequirements object
 */
export function parseJobRequirements(jobDescription: string): JobRequirements {
    const SKILL_KEYWORDS = [
        "React", "Angular", "Vue", "Next.js", "Node.js", "Express",
        "TypeScript", "JavaScript", "Python", "Django", "Flask",
        "Java", "Spring Boot", "Go", "Rust", "C++", "C#", ".NET",
        "AWS", "Azure", "Google Cloud", "Docker", "Kubernetes",
        "SQL", "PostgreSQL", "MongoDB", "Redis", "GraphQL",
        "Tailwind", "CSS", "HTML", "Git", "CI/CD"
    ];

    const lowerDesc = jobDescription.toLowerCase();
    const foundSkills: string[] = [];

    SKILL_KEYWORDS.forEach(skill => {
        if (lowerDesc.includes(skill.toLowerCase())) {
            foundSkills.push(skill);
        }
    });

    // First 3 found skills are must-haves, rest are nice-to-haves
    return {
        mustHave: foundSkills.slice(0, 3),
        niceToHave: foundSkills.slice(3, 8)
    };
}
