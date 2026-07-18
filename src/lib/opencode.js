// OpenCode (Zen) wrapper — the OpenAI-compatible brain used as the PRIMARY
// generator (Claude via Anthropic, proxied through the Zen gateway).
// Gemini (gemini.js) is the automatic fallback.
//
// The gateway speaks the OpenAI /chat/completions shape, so any
// OpenAI-compatible endpoint works here.
//
// .env:
//   VITE_OPENCODE_API_KEY=sk-...
//   VITE_OPENCODE_BASE_URL=https://opencode.ai/zen/v1   (optional, default)
//   VITE_OPENCODE_MODEL=claude-haiku-4-5                (optional, fast default)

const apiKey = import.meta.env.VITE_OPENCODE_API_KEY
const BASE_URL = (import.meta.env.VITE_OPENCODE_BASE_URL || 'https://opencode.ai/zen/v1').replace(/\/$/, '')
const DEFAULT_MODEL = import.meta.env.VITE_OPENCODE_MODEL || 'claude-haiku-4-5'

export const openCodeConfigured = Boolean(apiKey)

function ensureKey() {
  if (!apiKey) {
    throw new Error('OpenCode unavailable — set VITE_OPENCODE_API_KEY in .env.')
  }
}

// Map our simple { systemInstruction } opts + prompt to OpenAI chat messages.
function toMessages(prompt, opts = {}) {
  const messages = []
  if (opts.systemInstruction) messages.push({ role: 'system', content: opts.systemInstruction })
  messages.push({ role: 'user', content: prompt })
  return messages
}

async function postChat(body) {
  ensureKey()
  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    let detail = ''
    try {
      const err = await res.json()
      detail = err?.error?.message || err?.message || JSON.stringify(err)
    } catch {
      detail = await res.text().catch(() => '')
    }
    throw new Error(`OpenCode ${res.status}: ${detail}`)
  }
  return res
}

/** One-shot prompt → text. */
export async function ocAsk(prompt, opts = {}) {
  const res = await postChat({
    model: opts.model || DEFAULT_MODEL,
    messages: toMessages(prompt, opts),
  })
  const data = await res.json()
  return data?.choices?.[0]?.message?.content ?? ''
}

/** Structured JSON output. Gemini's responseSchema is passed as a prompt hint
 *  since the OpenAI shape uses json_object mode rather than a typed schema. */
export async function ocAskJson(prompt, responseSchema, opts = {}) {
  const schemaHint = responseSchema
    ? `\n\nReturn ONLY valid JSON matching this schema (no prose, no markdown fences):\n${JSON.stringify(responseSchema)}`
    : '\n\nReturn ONLY valid JSON (no prose, no markdown fences).'
  const res = await postChat({
    model: opts.model || DEFAULT_MODEL,
    messages: toMessages(prompt + schemaHint, opts),
    response_format: { type: 'json_object' },
  })
  const data = await res.json()
  const text = data?.choices?.[0]?.message?.content ?? '{}'
  // Strip accidental markdown fences before parsing.
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  return JSON.parse(cleaned)
}

/** Streaming version — yields text deltas via Server-Sent Events. */
export async function* ocAskStream(prompt, opts = {}) {
  const res = await postChat({
    model: opts.model || DEFAULT_MODEL,
    messages: toMessages(prompt, opts),
    stream: true,
  })
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || '' // keep the trailing partial line
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed.startsWith('data:')) continue
      const payload = trimmed.slice(5).trim()
      if (payload === '[DONE]') return
      try {
        const json = JSON.parse(payload)
        const delta = json?.choices?.[0]?.delta?.content
        if (delta) yield delta
      } catch {
        // ignore keep-alive / non-JSON lines
      }
    }
  }
}
