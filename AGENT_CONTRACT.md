# Unhook — Feature Module Contract (read before building)

You are building ONE self-contained feature module for **Unhook**, an AI habit-breaking
coach (Vue 3 `<script setup>` + Tailwind v4). Work ONLY inside your assigned folder.
Do NOT edit shared files (App.vue, router.js, main.js, style.css, lib/*). The integrator
wires your exported view into the router.

## Design system (use these — do not invent new colors/fonts)
Theme = warm dark "Nightfall/Recovery". CSS variables (already global):
- `--bg` #13160f · `--panel` #1c211a (cards) · `--hair` hairline border · `--ink` #ece7db text · `--muted` #9aa393
- `--accent` #e0785a **terracotta = primary action** · `--accent-2` #5fb27f green (success/streaks) · `--amber` #e2a13a · `--danger` #d5624f
- Radii: `--radius` 20px, `--radius-sm` 12px. Shadows: `--shadow`, `--shadow-lg`.
Utility classes available globally: `.card`, `.soft`, `.btn .btn-primary/.btn-ghost`, `.chip`, `.field`, `.font-display` (Fraunces serif for headings), `.rise .rise-1..4` (staggered entrance).
Fonts: headings `font-display` (Fraunces). Body = Hanken Grotesk (default).
Use Tailwind utilities + `var(--token)` in `[]` (e.g. `bg-[var(--panel)]`, `text-[var(--accent)]`).
Mobile-first. Content sits in a max-w-2xl column; assume a bottom nav exists (leave bottom padding `pb-24`). Keep it calm, warm, editorial. Avoid generic AI-blue.

## Shared store — `src/lib/state.js`
```js
import { state, setPlan, addCheckin, hasPlan, todayEntry } from '../../lib/state.js'
// state.profile = { habit, trigger, why }
// state.plan    = { title, summary, milestones:[{day,label}], replacements:[string], ifThen, mantra }
// state.checkins = [{ day:'YYYY-MM-DD', status:'resisted'|'relapsed', mood:1-5, note }]
// state.streak, state.best, state.resisted, state.relapsed  (numbers)
```
Read `state.*` reactively. Mutate ONLY via exported actions.

## AI calls — `src/lib/gemini.js` (REAL Gemini; never mock/hardcode AI output)
```js
import { ask, askStream, askJson } from '../../lib/gemini.js'
import { Type } from '@google/genai' // for askJson schemas
const text = await ask(prompt, { systemInstruction })          // one-shot → string
for await (const chunk of askStream(prompt, { systemInstruction })) {...} // streaming
const obj = await askJson(prompt, responseSchema, { systemInstruction })  // structured JSON
```
Always handle errors (try/catch) and show a friendly message + retry. The Gemini key may
be rate-limited during dev — your UI must degrade gracefully, never crash.

## Your export
Export a single view component at the path given in your task (e.g. `src/features/<name>/<Name>View.vue`).
It must render standalone (no required props) and read what it needs from the store.

## Quality bar (judged)
Highest weight: **code quality** + **problem alignment** (helping break bad habits).
Then security, efficiency, testing, a11y. Ship clean, modular, accessible, real code.
