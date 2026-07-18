// Unhook — the AI coaching brain. Every function here makes a REAL Gemini call
// (no mocks, no canned text). Grounded in evidence-based behaviour-change:
// CBT reframing, urge-surfing, implementation intentions, and self-compassion.
import { Type } from '@google/genai'
import { ask, askStream, askJson } from './gemini.js'
import { agentSystemAppendix } from './aiAgents.js'

const SYSTEM = `You are Unhook, a warm, sharp habit-change coach.
You help people reduce or quit harmful habits (screen time, doom-scrolling, vaping,
smoking, junk food, gambling, etc.). You draw on CBT, urge-surfing, implementation
intentions ("when X, I will Y"), and self-compassion.
Rules: never shame or lecture. Be concrete, brief, and human. Prefer a single next
action over a wall of advice. You are a coach, not a doctor — for crisis or medical
withdrawal, gently suggest professional help.`

/** Turn a person's habit profile into a personalised quit plan. Structured JSON. */
export async function generatePlan(profile) {
  const schema = {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING, description: 'Short motivating plan name, 2-5 words' },
      summary: { type: Type.STRING, description: 'One warm sentence framing the journey' },
      milestones: {
        type: Type.ARRAY,
        description: '3-4 escalating milestones',
        items: {
          type: Type.OBJECT,
          properties: {
            day: { type: Type.INTEGER, description: 'Day number, e.g. 1, 3, 7, 21' },
            label: { type: Type.STRING, description: 'What success looks like by then' },
          },
          required: ['day', 'label'],
        },
      },
      replacements: {
        type: Type.ARRAY,
        description: '3 concrete replacement actions for the moment of craving',
        items: { type: Type.STRING },
      },
      ifThen: { type: Type.STRING, description: 'One implementation-intention: "When <trigger>, I will <action>."' },
      mantra: { type: Type.STRING, description: 'A short personal mantra, under 8 words' },
    },
    required: ['title', 'summary', 'milestones', 'replacements', 'ifThen', 'mantra'],
  }

  const prompt = `Create a quit plan for this person.
Habit to break: ${profile.habit}
Main trigger: ${profile.trigger || 'not specified'}
Their reason (their "why"): ${profile.why || 'not specified'}
Make the if-then and replacements specifically fit their trigger.`

  return askJson(prompt, schema, { systemInstruction: SYSTEM + agentSystemAppendix('plan') })
}

/** In-the-moment craving intervention. Streamed for a calming, unfolding feel. */
export function cravingSOS(profile, state) {
  const prompt = `The person is having a craving RIGHT NOW and tapped the SOS button.
Habit: ${profile.habit}. Trigger: ${profile.trigger || 'unknown'}.
Current streak: ${state.streak} day(s). Their mantra: "${state.plan?.mantra || '—'}".
Coach them through the next 60 seconds. Use urge-surfing: acknowledge the wave,
remind them it peaks and passes in minutes. Give ONE grounding action to do now and
ONE of their replacement moves. Warm, present-tense, second person. Keep it under 120 words.`
  return askStream(prompt, { systemInstruction: SYSTEM + agentSystemAppendix('coach') })
}

/** Adaptive coach chat — knows the profile, plan, and current stats. */
export function coachReply(profile, state, history, userMessage) {
  const convo = history
    .slice(-6)
    .map((m) => `${m.role === 'user' ? 'Person' : 'Coach'}: ${m.text}`)
    .join('\n')
  const prompt = `Context — Habit: ${profile.habit}; Trigger: ${profile.trigger || '—'};
Why: ${profile.why || '—'}; Streak: ${state.streak}; Best: ${state.best}; Relapses: ${state.relapsed}.
Recent conversation:
${convo || '(none yet)'}
Person: ${userMessage}
Reply as their coach — adaptive, specific to their situation and stats. Keep it under 90 words.`
  return askStream(prompt, { systemInstruction: SYSTEM + agentSystemAppendix('coach') })
}

/** Compassionate reframe after a relapse + one plan adjustment. */
export async function relapseReframe(profile, state, note) {
  const prompt = `The person just logged a slip with their habit "${profile.habit}".
They were on a ${state.streak}-day streak (best ever: ${state.best}).
What they said: "${note || '(nothing)'}".
Respond with zero shame. Normalise the slip, extract ONE lesson from what triggered it,
and give ONE small adjustment to their plan for next time. Under 80 words.`
  return ask(prompt, { systemInstruction: SYSTEM + agentSystemAppendix('coach') })
}

/** A short daily nudge for the dashboard. */
export async function dailyNudge(profile, state) {
  const prompt = `Write a single-sentence encouraging nudge for someone on a ${state.streak}-day
streak away from "${profile.habit}". Fresh, specific, under 20 words. No emoji spam (max one).`
  return ask(prompt, { systemInstruction: SYSTEM + agentSystemAppendix('coach') })
}
