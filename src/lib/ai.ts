import OpenAI from "openai"
import { createOpenAI } from "@ai-sdk/openai"

export const openai = new OpenAI({
    apiKey: process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY,
    baseURL: "https://api.groq.com/openai/v1"
})

export const groq = createOpenAI({
    baseURL: 'https://api.groq.com/openai/v1',
    apiKey: process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY,
});

export const AI_MODEL = "llama-3.3-70b-versatile"

