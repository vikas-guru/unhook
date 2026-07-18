// Unhook — Intake plan generator. Makes a REAL Gemini call (no mocks / canned
// output). Turns a full clinician-style intake into a personalised quit plan,
// grounded in evidence-based behaviour change: CBT reframing, urge-surfing,
// and implementation intentions ("when X, I will Y").
import { Type } from '@google/genai'
import { askJson } from '../../lib/gemini.js'
import { agentSystemAppendix } from '../../lib/aiAgents.js'

// Warm, doctor-like coach. Never shames, never lectures.
const SYSTEM = `You are Unhook, a warm, evidence-based habit-change coach with the
calm bedside manner of a caring clinician. You help people reduce or quit harmful
habits (doom-scrolling, phone overuse, vaping, smoking, junk food, gambling, alcohol,
and similar). Ground everything in CBT reframing, urge-surfing (cravings peak and
pass in minutes), and implementation intentions ("when X, I will Y").
Rules: never shame, judge, or lecture. Be concrete, brief, and human. Meet the person
where their readiness is — gentler first steps for lower confidence, bolder ones for
higher. You are a coach, not a doctor: for crisis or medical withdrawal, gently
suggest professional help. Speak in warm second person.`

const planSchema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING, description: 'Short, motivating plan name, 2-5 words' },
    summary: { type: Type.STRING, description: 'One warm sentence framing their journey, referencing their own "why"' },
    milestones: {
      type: Type.ARRAY,
      description: '3-4 gently escalating milestones matched to their readiness',
      items: {
        type: Type.OBJECT,
        properties: {
          day: { type: Type.INTEGER, description: 'Day number, e.g. 1, 3, 7, 21' },
          label: { type: Type.STRING, description: 'What success looks and feels like by then' },
        },
        required: ['day', 'label'],
      },
    },
    replacements: {
      type: Type.ARRAY,
      description: '3 concrete replacement actions to do in the exact moment of craving, fitted to their trigger',
      items: { type: Type.STRING },
    },
    ifThen: { type: Type.STRING, description: 'One implementation intention: "When <their trigger>, I will <specific action>."' },
    mantra: { type: Type.STRING, description: 'A short personal mantra, under 8 words, echoing their why' },
  },
  required: ['title', 'summary', 'milestones', 'replacements', 'ifThen', 'mantra'],
}

/**
 * Generate a personalised quit plan from the full intake answers.
 * @param {object} answers
 * @param {string} answers.habit     - the habit they want to break
 * @param {string} answers.frequency - how often / severity, in their words
 * @param {string} answers.trigger   - main trigger (e.g. stress, boredom, in bed)
 * @param {string} answers.duration  - how long they've had the habit
 * @param {string} answers.why       - their motivation
 * @param {number} answers.readiness - self-rated readiness / confidence, 1-10
 * @returns {Promise<{title,summary,milestones,replacements,ifThen,mantra}>}
 */
export async function generatePlan(answers) {
  const prompt = `Build a personalised quit plan from this intake conversation.
Habit to break: ${answers.habit || 'not specified'}
How often / severity: ${answers.frequency || 'not specified'}
Main trigger (when it happens): ${answers.trigger || 'not specified'}
How long they've had it: ${answers.duration || 'not specified'}
Their reason — their "why": ${answers.why || 'not specified'}
Readiness / confidence to change (1 = very unsure, 10 = fully ready): ${answers.readiness ?? 'not specified'}

Tailor everything to THIS person: make the if-then and replacements fit their exact
trigger, and scale the milestones to their readiness — smaller, kinder steps if their
confidence is low, bolder steps if it is high. Let their "why" show through in the
summary and mantra.`

  return askJson(prompt, planSchema, { systemInstruction: SYSTEM + agentSystemAppendix('plan') })
}
