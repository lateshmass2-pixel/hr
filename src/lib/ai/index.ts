import OpenAI from "openai"
import { createGroq } from "@ai-sdk/groq"

export const openai = new OpenAI({
    apiKey: process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY,
    baseURL: "https://api.groq.com/openai/v1"
})

export const groq = createGroq({
    apiKey: process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY,
});

export const AI_MODEL = "llama-3.1-8b-instant"

