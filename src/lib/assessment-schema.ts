import { z } from 'zod';

export const QuestionSchema = z.object({
    id: z.string().describe("Unique identifier for the question"),
    question: z.string().min(10, "Question too short"),
    options: z.array(z.string()).length(4, "Must have exactly 4 options"),
    correctOptionIndex: z.number().int().min(0).max(3).describe("0-based index of the correct option"),
    explanation: z.string().describe("Explain why this is the correct answer")
});

export const AssessmentSchema = z.object({
    aptitude: z.array(QuestionSchema).length(5).describe("5 Logic/Math/Reasoning questions"),
    technical: z.array(QuestionSchema).length(5).describe("5 Role-specific technical questions")
});

export type Question = z.infer<typeof QuestionSchema>;
export type Assessment = z.infer<typeof AssessmentSchema>;
