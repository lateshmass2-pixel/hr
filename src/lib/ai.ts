import OpenAI from "openai"

export const openai = new OpenAI({
    apiKey: process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY,
    baseURL: "https://api.groq.com/openai/v1"
})

export const AI_MODEL = "llama-3.3-70b-versatile"
