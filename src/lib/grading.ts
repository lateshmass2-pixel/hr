import { Question } from "./assessment-schema";

export function calculateScore(
    userAnswers: (number | null)[],
    questions: Question[]
) {
    let correctCount = 0;
    const details = questions.map((q, idx) => {
        const userAnswerIndex = userAnswers[idx];
        const isCorrect = userAnswerIndex === q.correctOptionIndex;

        if (isCorrect) {
            correctCount++;
        }

        return {
            questionId: q.id,
            isCorrect,
            userAnswerIndex,
            correctAnswerIndex: q.correctOptionIndex
        };
    });

    const score = Math.round((correctCount / questions.length) * 100);

    return {
        score,
        correctCount,
        totalQuestions: questions.length,
        passed: score >= 70,
        details
    };
}
