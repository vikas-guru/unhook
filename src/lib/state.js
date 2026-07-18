// Shared reactive app store — single source of truth across all routes.
// Reads/writes go through store.js (Firestore-or-localStorage). Feature modules
// import { state } to read, and the action functions to mutate.
import { reactive } from 'vue'
import { loadState, saveState, todayKey } from './store.js'
import { isFirebaseConfigured, watchAuth } from './firebase.js'

export const state = reactive({
  user: null,
  loading: true,
  profile: null,   // { habit, trigger, why }
  plan: null,      // { title, summary, milestones:[{day,label}], replacements:[], ifThen, mantra }
  checkins: [],    // [{ day:'YYYY-MM-DD', status:'resisted'|'relapsed', mood:1-5, note }]
  customHabits: [], // admin-managed habit tracks shown in controls
  adminUsers: [], // admin/demo user progress rows
  aiAgents: [], // admin-managed multi-agent orchestration config
  habitCatalog: [], // admin-controlled frontend habit cards
  streak: 0,
  best: 0,
  resisted: 0,
  relapsed: 0,
})

export const demoAdminUsers = [
  { id: 'usr-001', name: 'Aarav Mehta', identity: 'Signed in', habit: 'Doom-scrolling', checkins: 18, streak: 6, best: 8, resisted: 15, relapsed: 3, moodAvg: 4.1, status: 'Active journey', risk: 'Low', lastAction: 'Completed morning check-in', nextReward: 'Seven-Day Reset' },
  { id: 'usr-002', name: 'Maya Srinivas', identity: 'Guest/private', habit: 'Phone overuse', checkins: 9, streak: 2, best: 4, resisted: 7, relapsed: 2, moodAvg: 3.7, status: 'Active journey', risk: 'Medium', lastAction: 'Opened Craving SOS', nextReward: 'Three-Day Streak' },
  { id: 'usr-003', name: 'Jordan Lee', identity: 'Signed in', habit: 'Vaping', checkins: 24, streak: 11, best: 11, resisted: 21, relapsed: 3, moodAvg: 4.3, status: 'Active journey', risk: 'Low', lastAction: 'Asked AI coach for stress plan', nextReward: 'Reflection Builder' },
  { id: 'usr-004', name: 'Priya Nair', identity: 'Guest/private', habit: 'Junk food', checkins: 6, streak: 0, best: 3, resisted: 3, relapsed: 3, moodAvg: 2.9, status: 'Needs support', risk: 'High', lastAction: 'Logged a slip after dinner', nextReward: 'Three-Day Streak' },
  { id: 'usr-005', name: 'Sam Carter', identity: 'Signed in', habit: 'Smoking', checkins: 31, streak: 14, best: 14, resisted: 28, relapsed: 3, moodAvg: 4.5, status: 'Active journey', risk: 'Low', lastAction: 'Read relapse prevention article', nextReward: 'Ten Wins' },
  { id: 'usr-006', name: 'Nisha Patel', identity: 'Guest/private', habit: 'Alcohol', checkins: 13, streak: 5, best: 5, resisted: 10, relapsed: 3, moodAvg: 3.8, status: 'Active journey', risk: 'Medium', lastAction: 'Watched urge surfing video', nextReward: 'Seven-Day Reset' },
  { id: 'usr-007', name: 'Diego Ramos', identity: 'Signed in', habit: 'Gambling', checkins: 4, streak: 1, best: 2, resisted: 2, relapsed: 2, moodAvg: 3.1, status: 'Needs support', risk: 'High', lastAction: 'Used SOS during boredom trigger', nextReward: 'Three-Day Streak' },
  { id: 'usr-008', name: 'Hannah Kim', identity: 'Signed in', habit: 'Late-night shopping', checkins: 16, streak: 7, best: 7, resisted: 13, relapsed: 3, moodAvg: 4.0, status: 'Active journey', risk: 'Low', lastAction: 'Added trigger note: lying in bed', nextReward: 'Ten Wins' },
  { id: 'usr-009', name: 'Omar Khan', identity: 'Guest/private', habit: 'Gaming binges', checkins: 11, streak: 3, best: 5, resisted: 8, relapsed: 3, moodAvg: 3.5, status: 'Active journey', risk: 'Medium', lastAction: 'Completed evening reflection', nextReward: 'Seven-Day Reset' },
  { id: 'usr-010', name: 'Elena Brooks', identity: 'Signed in', habit: 'Social media checking', checkins: 21, streak: 9, best: 10, resisted: 18, relapsed: 3, moodAvg: 4.2, status: 'Active journey', risk: 'Low', lastAction: 'Refreshed weekly AI insight', nextReward: 'Ten Wins' },
]

export const defaultAiAgents = [
  { id: 'gemini', name: 'Gemini', role: 'Fast plan generator', enabled: true, plan: true, coach: true, mode: 'live', model: 'gemini-2.5-flash' },
  { id: 'claude', name: 'Claude', role: 'Empathy and wording reviewer', enabled: true, plan: true, coach: true, mode: 'orchestrated', model: 'admin-configured' },
  { id: 'codex', name: 'Codex', role: 'Structure, safety, and action design', enabled: true, plan: true, coach: false, mode: 'orchestrated', model: 'admin-configured' },
  { id: 'opencode', name: 'OpenCode', role: 'Alternative strategy generator', enabled: false, plan: true, coach: false, mode: 'needs backend key', model: 'admin-configured' },
]

export const defaultHabitCatalog = [
  { id: 'digital-doom-scroll', code: 'DIGITAL', name: 'Doom-scrolling', description: 'Late-night feeds, reels, short-video loops, compulsive refreshes.', active: true },
  { id: 'screen-phone-overuse', code: 'SCREEN', name: 'Phone overuse', description: 'Unlock checking, notification chasing, distracted presence.', active: true },
  { id: 'nicotine-vaping', code: 'NICOTINE', name: 'Vaping', description: 'Cue-driven urges, stress loops, social or post-meal pulls.', active: true },
  { id: 'tobacco-smoking', code: 'TOBACCO', name: 'Smoking', description: 'Routine cigarettes, craving windows, replacement planning.', active: true },
  { id: 'food-junk-food', code: 'FOOD', name: 'Junk food', description: 'Impulse snacking, sugar loops, evening comfort eating.', active: true },
  { id: 'risk-gambling', code: 'RISK', name: 'Gambling', description: 'Betting urges, chasing losses, boredom-triggered sessions.', active: true },
]

function recompute() {
  const sorted = [...state.checkins].sort((a, b) => a.day.localeCompare(b.day))
  let run = 0, best = 0, resisted = 0, relapsed = 0
  for (const c of sorted) {
    if (c.status === 'resisted') { resisted++; run++; best = Math.max(best, run) }
    else { relapsed++; run = 0 }
  }
  state.streak = run; state.best = best; state.resisted = resisted; state.relapsed = relapsed
}

function hydrate(data) {
  state.profile = data?.profile || null
  state.plan = data?.plan || null
  state.checkins = data?.checkins || []
  state.customHabits = Array.isArray(data?.customHabits) ? data.customHabits : []
  state.adminUsers = Array.isArray(data?.adminUsers) && data.adminUsers.length ? data.adminUsers : [...demoAdminUsers]
  state.aiAgents = Array.isArray(data?.aiAgents) && data.aiAgents.length ? data.aiAgents : [...defaultAiAgents]
  state.habitCatalog = Array.isArray(data?.habitCatalog) && data.habitCatalog.length ? data.habitCatalog : [...defaultHabitCatalog]
  recompute()
}

async function persist() {
  await saveState(state.user?.uid, {
    profile: state.profile,
    plan: state.plan,
    checkins: state.checkins,
    customHabits: state.customHabits,
    adminUsers: state.adminUsers,
    aiAgents: state.aiAgents,
    habitCatalog: state.habitCatalog,
  })
}

export function hasPlan() { return !!(state.profile && state.plan) }
export function todayEntry() { return state.checkins.find((c) => c.day === todayKey()) }

let booted = false
export function boot() {
  if (booted) return
  booted = true
  if (isFirebaseConfigured) {
    watchAuth(async (u) => {
      state.user = u
      state.loading = true
      hydrate(await loadState(u?.uid))
      state.loading = false
    })
  } else {
    ;(async () => {
      state.loading = true
      hydrate(await loadState(null))
      state.loading = false
    })()
  }
}

export async function setPlan(profile, plan) {
  state.profile = profile
  state.plan = plan
  await persist()
}

export async function addCheckin({ status, mood, note }) {
  const day = todayKey()
  const ex = state.checkins.find((c) => c.day === day)
  if (ex) Object.assign(ex, { status, mood, note })
  else state.checkins.push({ day, status, mood, note })
  recompute()
  await persist()
}

export async function addCustomHabit(habit) {
  const clean = String(habit || '').trim()
  if (!clean) return
  const exists = state.customHabits.some((h) => h.toLowerCase() === clean.toLowerCase())
  if (!exists) state.customHabits.push(clean)
  await persist()
}

export async function removeCustomHabit(habit) {
  const clean = String(habit || '').trim().toLowerCase()
  state.customHabits = state.customHabits.filter((h) => h.toLowerCase() !== clean)
  await persist()
}

export async function seedDemoAdminUsers() {
  state.adminUsers = [...demoAdminUsers]
  await persist()
}

export async function addAdminUser(user) {
  state.adminUsers.push({ ...user, id: `usr-${Date.now()}` })
  await persist()
}

export async function updateAiAgent(id, patch) {
  state.aiAgents = state.aiAgents.map((agent) => (agent.id === id ? { ...agent, ...patch } : agent))
  await persist()
}

export async function resetAiAgents() {
  state.aiAgents = [...defaultAiAgents]
  await persist()
}

export async function addHabitCatalogItem(item) {
  state.habitCatalog.push({
    id: `habit-${Date.now()}`,
    code: item.code,
    name: item.name,
    description: item.description,
    active: true,
  })
  await persist()
}

export async function updateHabitCatalogItem(id, patch) {
  state.habitCatalog = state.habitCatalog.map((item) => (item.id === id ? { ...item, ...patch } : item))
  await persist()
}

export async function removeHabitCatalogItem(id) {
  state.habitCatalog = state.habitCatalog.filter((item) => item.id !== id)
  await persist()
}

export async function resetHabitCatalog() {
  state.habitCatalog = [...defaultHabitCatalog]
  await persist()
}

export async function resetAll() {
  state.profile = null
  state.plan = null
  state.checkins = []
  state.customHabits = []
  state.adminUsers = [...demoAdminUsers]
  state.aiAgents = [...defaultAiAgents]
  state.habitCatalog = [...defaultHabitCatalog]
  recompute()
  await persist()
}
