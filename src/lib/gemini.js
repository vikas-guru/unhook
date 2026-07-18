// Gemini (Google AI) wrapper — the AI brain of the scaffold.
// Docs: https://ai.google.dev/gemini-api/docs
// Get a key at https://aistudio.google.com/apikey and put it in .env as VITE_GEMINI_API_KEY
import { GoogleGenAI } from '@google/genai'

const apiKey = import.meta.env.VITE_GEMINI_API_KEY

// NOTE: this key is exposed client-side. Fine for a hackathon; for anything
// public, proxy through a Firebase Function instead (see README).
export const ai = apiKey ? new GoogleGenAI({ apiKey }) : null

const DEFAULT_MODEL = 'gemini-2.5-flash'

/**
 * One-shot prompt → text. The workhorse for hack day.
 * @param {string} prompt
 * @param {object} [opts] - { model, systemInstruction }
 * @returns {Promise<string>}
 */
export async function ask(prompt, opts = {}) {
  if (!ai) throw new Error('Missing VITE_GEMINI_API_KEY — copy .env.example to .env and add your key.')
  const res = await ai.models.generateContent({
    model: opts.model || DEFAULT_MODEL,
    contents: prompt,
    config: opts.systemInstruction ? { systemInstruction: opts.systemInstruction } : undefined,
  })
  return res.text
}

/**
 * Streaming version — yields text chunks as they arrive (nicer UX for chat).
 * for await (const chunk of askStream('...')) { ... }
 */
export async function* askStream(prompt, opts = {}) {
  if (!ai) throw new Error('Missing VITE_GEMINI_API_KEY — copy .env.example to .env and add your key.')
  const stream = await ai.models.generateContentStream({
    model: opts.model || DEFAULT_MODEL,
    contents: prompt,
    config: opts.systemInstruction ? { systemInstruction: opts.systemInstruction } : undefined,
  })
  for await (const chunk of stream) {
    if (chunk.text) yield chunk.text
  }
}

/**
 * Structured JSON output — pass a responseSchema and get typed data back.
 * Great when the problem needs the model to fill a form / extract fields.
 */
export async function askJson(prompt, responseSchema, opts = {}) {
  if (!ai) throw new Error('Missing VITE_GEMINI_API_KEY — copy .env.example to .env and add your key.')
  const res = await ai.models.generateContent({
    model: opts.model || DEFAULT_MODEL,
    contents: prompt,
    config: { responseMimeType: 'application/json', responseSchema },
  })
  return JSON.parse(res.text)
}
