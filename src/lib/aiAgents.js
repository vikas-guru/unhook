import { state } from './state.js'

const roleGuidance = {
  gemini: 'Generate the primary response quickly and keep it practical.',
  claude: 'Review for warmth, empathy, shame-free language, and emotional safety.',
  codex: 'Review structure, concrete next actions, edge cases, and plan consistency.',
  opencode: 'Suggest one alternative strategy and check if the plan is implementable.',
}

export function enabledAgents(task = 'plan') {
  const key = task === 'coach' ? 'coach' : 'plan'
  return (state.aiAgents || []).filter((agent) => agent.enabled && agent[key])
}

export function agentSystemAppendix(task = 'plan') {
  const agents = enabledAgents(task)
  if (!agents.length) return ''
  const rows = agents.map((agent) => {
    const mode = agent.mode === 'live' ? 'live model' : 'admin-orchestrated role'
    return `- ${agent.name} (${mode}): ${agent.role}. ${roleGuidance[agent.id] || ''}`
  })
  return `

Multi-agent orchestration is enabled. Before finalizing, synthesize these agent perspectives:
${rows.join('\n')}
Return one cohesive answer; do not mention internal agents unless the user asks.`
}

export function agentTelemetry(task = 'plan') {
  return enabledAgents(task).map((agent) => agent.name).join(', ') || 'None enabled'
}
