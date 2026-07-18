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
  profileContact: null, // { name, email, consent }
  reminderSettings: null, // { enabled, cadence, time, channel }
  smtpSettings: null, // admin mail delivery settings; password lives outside frontend
  feedback: [], // user journey feedback submissions
  engagementEvents: [], // generated registration, milestone, reminder email events
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

export const defaultReminderSettings = {
  enabled: false,
  cadence: 'Daily',
  time: '20:30',
  channel: 'Email',
}

export const defaultSmtpSettings = {
  enabled: true,
  host: 'smtp.office365.com',
  port: '587',
  secure: false,
  username: 'notify@eshipjet.ai',
  fromEmail: 'notify@eshipjet.ai',
  fromName: 'Unhook Coach',
  provider: 'Office365 SMTP',
}

const milestoneDays = [1, 3, 7, 10, 14, 21]

function eventId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`
}

function currentContact() {
  const email = state.profileContact?.email || state.user?.email || ''
  const name = state.profileContact?.name || state.user?.displayName || 'there'
  return { email, name }
}

function emailTemplate(type, data = {}) {
  const habit = state.profile?.habit || data.habit || 'your habit'
  const name = currentContact().name
  if (type === 'registration') {
    return {
      subject: `Welcome to Unhook, ${name}`,
      preheader: 'Your private recovery plan is ready to begin.',
      body: `Hi ${name}, your Unhook journey for ${habit} is ready. Start with one honest check-in today, use SOS when an urge hits, and let the coach help you adjust the plan step by step.`,
    }
  }
  if (type === 'milestone') {
    return {
      subject: `You reached day ${data.day} on Unhook`,
      preheader: `A small win against ${habit} is now visible.`,
      body: `Hi ${name}, you reached day ${data.day} while working on ${habit}. Keep the next step small: notice the cue, use your replacement action, and record what happens today.`,
    }
  }
  if (type === 'reminder') {
    return {
      subject: `Your Unhook check-in reminder`,
      preheader: `A gentle ${state.reminderSettings?.cadence?.toLowerCase() || 'daily'} nudge for ${habit}.`,
      body: `Hi ${name}, this is your reminder to check in on ${habit}. Open Today, log what happened, and choose one replacement action before the day ends.`,
    }
  }
  return {
    subject: 'Unhook update',
    preheader: 'A recovery journey update is ready.',
    body: `Hi ${name}, your Unhook journey has a new update.`,
  }
}

function queueEmail(type, data = {}) {
  const contact = currentContact()
  const template = emailTemplate(type, data)
  const hasConsent = contact.email && state.profileContact?.consent !== false
  const hasSmtp = !!(state.smtpSettings?.enabled && state.smtpSettings?.host && state.smtpSettings?.fromEmail)
  const event = {
    id: eventId(type),
    type,
    status: hasConsent && hasSmtp ? 'SMTP ready' : hasConsent ? 'Needs SMTP setup' : 'Needs email consent',
    to: contact.email,
    from: state.smtpSettings?.fromEmail || '',
    provider: state.smtpSettings?.provider || 'Custom SMTP',
    createdAt: new Date().toISOString(),
    ...data,
    ...template,
  }
  state.engagementEvents.unshift(event)
  state.engagementEvents = state.engagementEvents.slice(0, 40)
  return event
}

function hasEmailEvent(type, match = {}) {
  return state.engagementEvents.some((event) => (
    event.type === type &&
    Object.entries(match).every(([key, value]) => event[key] === value)
  ))
}

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
  state.profileContact = data?.profileContact || null
  state.reminderSettings = data?.reminderSettings || { ...defaultReminderSettings }
  state.smtpSettings = data?.smtpSettings || { ...defaultSmtpSettings }
  state.feedback = Array.isArray(data?.feedback) ? data.feedback : []
  state.engagementEvents = Array.isArray(data?.engagementEvents) ? data.engagementEvents : []
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
    profileContact: state.profileContact,
    reminderSettings: state.reminderSettings,
    smtpSettings: state.smtpSettings,
    feedback: state.feedback,
    engagementEvents: state.engagementEvents,
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
      try {
        hydrate(await loadState(u?.uid))
      } catch (e) {
        console.warn('State hydrate failed, starting fresh:', e?.message)
        hydrate(null)
      } finally {
        state.loading = false
      }
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
  if (!hasEmailEvent('registration')) queueEmail('registration', { habit: profile.habit })
  await persist()
}

export async function addCheckin({ status, mood, note }) {
  const day = todayKey()
  const ex = state.checkins.find((c) => c.day === day)
  if (ex) Object.assign(ex, { status, mood, note })
  else state.checkins.push({ day, status, mood, note })
  recompute()
  for (const milestone of milestoneDays) {
    if (state.streak >= milestone && !hasEmailEvent('milestone', { day: milestone })) {
      queueEmail('milestone', { day: milestone, habit: state.profile?.habit })
    }
  }
  await persist()
}

export async function updateProfileContact(contact) {
  state.profileContact = {
    name: String(contact.name || '').trim(),
    email: String(contact.email || '').trim(),
    consent: !!contact.consent,
  }
  state.engagementEvents = state.engagementEvents.map((event) => {
    if (!state.profileContact.email || !state.profileContact.consent) {
      return { ...event, status: 'Needs email consent' }
    }
    const smtpReady = state.smtpSettings?.enabled && state.smtpSettings?.host && state.smtpSettings?.fromEmail
    return {
      ...event,
      to: event.to || state.profileContact.email,
      status: smtpReady ? 'SMTP ready' : 'Needs SMTP setup',
      from: state.smtpSettings?.fromEmail || event.from || '',
      provider: state.smtpSettings?.provider || event.provider || 'Custom SMTP',
    }
  })
  if (state.profile && state.profileContact.email && state.profileContact.consent && !hasEmailEvent('registration')) {
    queueEmail('registration', { habit: state.profile.habit })
  }
  await persist()
}

export async function updateReminderSettings(settings) {
  state.reminderSettings = { ...state.reminderSettings, ...settings }
  if (state.reminderSettings.enabled && !hasEmailEvent('reminder')) {
    queueEmail('reminder', { cadence: state.reminderSettings.cadence, time: state.reminderSettings.time })
  }
  await persist()
}

export async function updateSmtpSettings(settings) {
  state.smtpSettings = {
    ...state.smtpSettings,
    ...settings,
    host: String(settings.host ?? state.smtpSettings?.host ?? '').trim(),
    port: String(settings.port ?? state.smtpSettings?.port ?? '587').trim(),
    username: String(settings.username ?? state.smtpSettings?.username ?? '').trim(),
    fromEmail: String(settings.fromEmail ?? state.smtpSettings?.fromEmail ?? '').trim(),
    fromName: String(settings.fromName ?? state.smtpSettings?.fromName ?? '').trim(),
    provider: String(settings.provider ?? state.smtpSettings?.provider ?? 'Custom SMTP').trim(),
    enabled: !!settings.enabled,
    secure: !!settings.secure,
  }
  state.engagementEvents = state.engagementEvents.map((event) => {
    if (!event.to) return { ...event, status: 'Needs email consent' }
    if (!state.smtpSettings.enabled || !state.smtpSettings.host || !state.smtpSettings.fromEmail) {
      return { ...event, status: 'Needs SMTP setup', from: state.smtpSettings.fromEmail, provider: state.smtpSettings.provider }
    }
    return { ...event, status: 'SMTP ready', from: state.smtpSettings.fromEmail, provider: state.smtpSettings.provider }
  })
  await persist()
}

export async function queueTestEmail() {
  queueEmail('smtp-test', { habit: state.profile?.habit || 'SMTP setup' })
  await persist()
}

export async function submitFeedback(feedback) {
  state.feedback.unshift({
    id: eventId('feedback'),
    createdAt: new Date().toISOString(),
    habit: state.profile?.habit || '',
    streak: state.streak,
    ...feedback,
  })
  state.feedback = state.feedback.slice(0, 20)
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
  state.profileContact = null
  state.reminderSettings = { ...defaultReminderSettings }
  state.smtpSettings = { ...defaultSmtpSettings }
  state.feedback = []
  state.engagementEvents = []
  recompute()
  await persist()
}
