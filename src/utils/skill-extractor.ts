/**
 * NLP Skill Extractor Utility
 * Scans text against a predefined dictionary of tech skills
 * and returns extracted skills found in the content.
 */

// A comprehensive dictionary of common tech skills to scan for
const SKILL_DICTIONARY = [
    // Frontend Frameworks
    "React", "Angular", "Vue", "Svelte", "Next.js", "Nuxt", "Remix", "Gatsby",
    // Backend Frameworks
    "Node.js", "Express", "NestJS", "Fastify", "Koa",
    "Python", "Django", "Flask", "FastAPI",
    "Java", "Spring Boot", "Spring",
    "Ruby", "Rails", "Ruby on Rails",
    "PHP", "Laravel", "Symfony",
    "Go", "Golang", "Gin",
    "Rust", "Actix",
    "C++", "C#", ".NET", "ASP.NET",
    "Scala", "Kotlin",
    // Languages
    "JavaScript", "TypeScript", "HTML", "CSS", "SASS", "SCSS", "Less",
    // CSS Frameworks
    "Tailwind", "TailwindCSS", "Bootstrap", "Material UI", "Chakra UI", "Styled Components",
    // Cloud & DevOps
    "AWS", "Amazon Web Services", "Azure", "Google Cloud", "GCP", "Heroku", "Vercel", "Netlify",
    "Docker", "Kubernetes", "K8s", "Terraform", "Ansible", "Jenkins", "CircleCI", "GitHub Actions",
    "CI/CD", "DevOps",
    // Databases
    "SQL", "PostgreSQL", "MySQL", "SQLite", "Oracle",
    "MongoDB", "Redis", "DynamoDB", "Cassandra", "Elasticsearch",
    "GraphQL", "REST", "RESTful", "gRPC",
    "Prisma", "Sequelize", "TypeORM",
    // Mobile
    "React Native", "Flutter", "Swift", "SwiftUI", "iOS", "Android", "Kotlin",
    "Expo", "Ionic",
    // Data & ML
    "Machine Learning", "ML", "Deep Learning", "TensorFlow", "PyTorch", "Keras",
    "Pandas", "NumPy", "Scikit-learn", "Data Science", "AI", "Artificial Intelligence",
    "NLP", "Natural Language Processing", "Computer Vision",
    // Tools
    "Git", "GitHub", "GitLab", "Bitbucket", "Jira", "Confluence",
    "Figma", "Adobe XD", "Sketch", "Photoshop", "Illustrator",
    // Testing
    "Jest", "Mocha", "Cypress", "Playwright", "Selenium", "Testing Library",
    "Unit Testing", "E2E Testing", "TDD", "BDD",
    // Other
    "Agile", "Scrum", "Kanban",
    "Microservices", "Serverless", "Lambda",
    "WebSocket", "Socket.io", "RabbitMQ", "Kafka",
    "OAuth", "JWT", "Authentication", "Security",
];

/**
 * Extracts skills from a given text by matching against the skill dictionary.
 * 
 * @param text - The resume text or description to analyze
 * @param maxSkills - Maximum number of skills to return (default: 4)
 * @returns Array of skill strings found in the text
 */
export function extractSkills(text: string, maxSkills: number = 4): string[] {
    if (!text || text.trim() === '') {
        return ["General"];
    }

    const lowerText = text.toLowerCase();

    // Find all skills that exist in the text
    const foundSkills = SKILL_DICTIONARY.filter(skill => {
        // Use word boundary matching for more accurate detection
        const skillLower = skill.toLowerCase();
        // Create a regex that matches the skill as a whole word or phrase
        const regex = new RegExp(`\\b${skillLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
        return regex.test(lowerText) || lowerText.includes(skillLower);
    });

    // Remove duplicates and return top N skills
    const uniqueSkills = Array.from(new Set(foundSkills));

    return uniqueSkills.length > 0
        ? uniqueSkills.slice(0, maxSkills)
        : ["General"];
}

/**
 * Categorizes skills into different domains
 * 
 * @param skills - Array of skill strings
 * @returns Object with categorized skills
 */
export function categorizeSkills(skills: string[]): Record<string, string[]> {
    const categories: Record<string, string[]> = {
        frontend: [],
        backend: [],
        database: [],
        cloud: [],
        mobile: [],
        other: [],
    };

    const frontendKeywords = ["React", "Angular", "Vue", "Svelte", "Next.js", "CSS", "HTML", "TypeScript", "JavaScript", "Tailwind"];
    const backendKeywords = ["Node.js", "Express", "Python", "Django", "Java", "Spring", "Go", "Rust", "PHP"];
    const databaseKeywords = ["SQL", "PostgreSQL", "MongoDB", "Redis", "GraphQL", "Prisma"];
    const cloudKeywords = ["AWS", "Azure", "Google Cloud", "Docker", "Kubernetes", "DevOps", "CI/CD"];
    const mobileKeywords = ["React Native", "Flutter", "Swift", "iOS", "Android"];

    skills.forEach(skill => {
        if (frontendKeywords.some(k => skill.toLowerCase().includes(k.toLowerCase()))) {
            categories.frontend.push(skill);
        } else if (backendKeywords.some(k => skill.toLowerCase().includes(k.toLowerCase()))) {
            categories.backend.push(skill);
        } else if (databaseKeywords.some(k => skill.toLowerCase().includes(k.toLowerCase()))) {
            categories.database.push(skill);
        } else if (cloudKeywords.some(k => skill.toLowerCase().includes(k.toLowerCase()))) {
            categories.cloud.push(skill);
        } else if (mobileKeywords.some(k => skill.toLowerCase().includes(k.toLowerCase()))) {
            categories.mobile.push(skill);
        } else {
            categories.other.push(skill);
        }
    });

    return categories;
}

/**
 * Calculates a skill match score between required skills and candidate skills
 * 
 * @param requiredSkills - Skills required for the job
 * @param candidateSkills - Skills the candidate has
 * @returns Match percentage (0-100)
 */
export function calculateSkillMatch(requiredSkills: string[], candidateSkills: string[]): number {
    if (requiredSkills.length === 0) return 100;

    const requiredLower = requiredSkills.map(s => s.toLowerCase());
    const candidateLower = candidateSkills.map(s => s.toLowerCase());

    const matchCount = requiredLower.filter(skill =>
        candidateLower.some(cs => cs.includes(skill) || skill.includes(cs))
    ).length;

    return Math.round((matchCount / requiredSkills.length) * 100);
}
