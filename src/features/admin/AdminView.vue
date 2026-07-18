<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { state, addAdminUser, addHabitCatalogItem, removeHabitCatalogItem, resetAll, resetAiAgents, resetHabitCatalog, seedDemoAdminUsers, updateAiAgent, updateHabitCatalogItem } from '../../lib/state.js'
import { agentTelemetry } from '../../lib/aiAgents.js'
import { isFirebaseConfigured, signInWithGoogle, signInGuest, logout } from '../../lib/firebase.js'

const router = useRouter()
const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || 'admin@unhook.local'
const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || 'PromptWars@2026'
const ADMIN_SESSION_KEY = 'unhook:admin:v1'

const newHabit = ref('')
const newHabitCode = ref('')
const newHabitDescription = ref('')
const adminNote = ref('')
const newUserName = ref('')
const newUserHabit = ref('')
const newUserRisk = ref('Medium')
const adminEmail = ref('')
const adminPassword = ref('')
const adminError = ref('')
const isAdminAuthed = ref(sessionStorage.getItem(ADMIN_SESSION_KEY) === 'true')
const activeSection = ref('overview')

const navItems = [
  { key: 'overview', label: 'Overview', meta: 'Command center' },
  { key: 'users', label: 'Users', meta: 'Usage and progress' },
  { key: 'rewards', label: 'Rewards', meta: 'Badges and motivation' },
  { key: 'frontend', label: 'Frontend', meta: 'Routes and surfaces' },
  { key: 'identity', label: 'Identity', meta: 'Guest and sync' },
  { key: 'habits', label: 'Habit controls', meta: 'Tracks and templates' },
  { key: 'analytics', label: 'Analytics', meta: 'Progress signals' },
  { key: 'agents', label: 'AI agents', meta: 'Plan and coach models' },
  { key: 'operations', label: 'Operations', meta: 'Notes and reset' },
]

const frontendModules = [
  { name: 'Enterprise Home', route: '/start', status: 'Live', owner: 'Onboarding', description: 'Habit selection, custom habit entry, and intake launch.' },
  { name: 'Today Cockpit', route: '/today', status: 'Plan gated', owner: 'Daily use', description: 'Streak ring, check-in capture, plan progress, SOS and coach launch.' },
  { name: 'Craving SOS', route: '/today', status: 'Overlay', owner: 'Support', description: 'Urgent replacement actions when a craving hits.' },
  { name: 'AI Coach', route: '/today', status: 'Overlay', owner: 'Generative AI', description: 'Adaptive chat around the active habit and check-in history.' },
  { name: 'Watch Library', route: '/watch', status: 'Live', owner: 'Content', description: 'Habit-change videos filtered against the active habit category.' },
  { name: 'Reading Library', route: '/read', status: 'Live', owner: 'Content', description: 'Evidence-based articles plus AI-generated personalized reading.' },
  { name: 'Insights', route: '/insights', status: 'Live', owner: 'Analytics', description: 'Heatmap, mood trend, win rate, milestones, and weekly AI insight.' },
  { name: 'Admin Console', route: '/admin', status: 'Secured', owner: 'Operations', description: 'Identity controls, habit controls, routing, notes, reset operations.' },
]

const rewardRules = computed(() => [
  { name: 'First Check-in', trigger: 'Complete 1 daily check-in', unlocked: state.checkins.length >= 1, progress: Math.min(100, state.checkins.length * 100) },
  { name: 'Three-Day Streak', trigger: 'Hold a 3 day streak', unlocked: state.streak >= 3, progress: Math.min(100, Math.round((state.streak / 3) * 100)) },
  { name: 'Seven-Day Reset', trigger: 'Hold a 7 day streak', unlocked: state.streak >= 7, progress: Math.min(100, Math.round((state.streak / 7) * 100)) },
  { name: 'Ten Wins', trigger: 'Log 10 resisted days', unlocked: state.resisted >= 10, progress: Math.min(100, Math.round((state.resisted / 10) * 100)) },
  { name: 'Reflection Builder', trigger: 'Add notes to 3 check-ins', unlocked: state.checkins.filter((c) => c.note).length >= 3, progress: Math.min(100, Math.round((state.checkins.filter((c) => c.note).length / 3) * 100)) },
])

const identityLabel = computed(() => {
  if (!isFirebaseConfigured) return 'Local private mode'
  if (!state.user) return 'Not signed in'
  return state.user.isAnonymous ? 'Guest anonymous session' : state.user.displayName || state.user.email
})

const telemetry = computed(() => [
  { label: 'Total users', value: userSummary.value.total },
  { label: 'Active users', value: userSummary.value.active },
  { label: 'Needs support', value: userSummary.value.needsSupport },
  { label: 'Avg win rate', value: `${userSummary.value.avgWinRate}%` },
  { label: 'Check-ins captured', value: userSummary.value.checkins },
  { label: 'Rewards unlocked', value: userSummary.value.rewardsUnlocked },
  { label: 'AI agents', value: state.aiAgents.filter((a) => a.enabled).length },
])

const userRows = computed(() =>
  state.adminUsers.map((user) => ({
    ...user,
    winRate: user.checkins ? Math.round((user.resisted / user.checkins) * 100) : 0,
  })),
)

const selectedUserId = ref('')

const selectedUser = computed(() => {
  return userRows.value.find((user) => user.id === selectedUserId.value) || userRows.value[0] || null
})

const userSummary = computed(() => ({
  total: userRows.value.length,
  active: userRows.value.filter((u) => u.status === 'Active journey').length,
  needsSupport: userRows.value.filter((u) => u.status === 'Needs support' || u.risk === 'High').length,
  guests: userRows.value.filter((u) => u.identity.includes('Guest')).length,
  checkins: userRows.value.reduce((sum, u) => sum + u.checkins, 0),
  rewardsUnlocked: userRows.value.reduce((sum, u) => sum + rewardCountForUser(u), 0),
  avgWinRate: userRows.value.length
    ? Math.round(userRows.value.reduce((sum, u) => sum + u.winRate, 0) / userRows.value.length)
    : 0,
}))

const riskDistribution = computed(() => ['Low', 'Medium', 'High'].map((risk) => ({
  risk,
  count: userRows.value.filter((u) => u.risk === risk).length,
  pct: userRows.value.length ? Math.round((userRows.value.filter((u) => u.risk === risk).length / userRows.value.length) * 100) : 0,
})))

const habitDistribution = computed(() => {
  const counts = userRows.value.reduce((acc, user) => {
    acc[user.habit] = (acc[user.habit] || 0) + 1
    return acc
  }, {})
  return Object.entries(counts)
    .map(([habit, count]) => ({ habit, count, pct: Math.round((count / userRows.value.length) * 100) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6)
})

const topStreakUsers = computed(() =>
  [...userRows.value].sort((a, b) => b.streak - a.streak).slice(0, 5),
)

const opsSignals = computed(() => [
  { label: 'Identity status', value: identityLabel.value, tone: state.user && !state.user.isAnonymous ? 'sync' : 'private' },
  { label: 'Journey health', value: state.plan ? 'Plan active' : 'Needs onboarding', tone: state.plan ? 'sync' : 'warn' },
  { label: 'AI coverage', value: 'Plan, nudge, coach, insight', tone: 'sync' },
  { label: 'Plan agents', value: agentTelemetry('plan'), tone: 'sync' },
])

const recentActivity = computed(() => {
  return userRows.value.slice(0, 5).map((user) => ({
    day: user.name,
    status: user.lastAction,
    mood: user.moodAvg,
  }))
})

const selectedUserStats = computed(() => {
  if (!selectedUser.value) return []
  const user = selectedUser.value
  return [
    { label: 'Check-ins', value: user.checkins },
    { label: 'Current streak', value: `${user.streak}d` },
    { label: 'Best streak', value: `${user.best}d` },
    { label: 'Win rate', value: `${user.winRate}%` },
    { label: 'Wins', value: user.resisted },
    { label: 'Slips', value: user.relapsed },
  ]
})

function rewardCountForUser(user) {
  return [
    user.checkins >= 1,
    user.streak >= 3,
    user.streak >= 7,
    user.resisted >= 10,
    user.checkins >= 3,
  ].filter(Boolean).length
}

function selectUser(id) {
  selectedUserId.value = id
}

function habitFocusForUser(user) {
  const habit = (user?.habit || '').toLowerCase()
  if (habit.includes('doom')) return ['Late-night feeds', 'Short-video loops', 'Compulsive refreshes', 'Bedtime scrolling']
  if (habit.includes('phone')) return ['Unlock checking', 'Notification chasing', 'Distracted presence', 'Idle screen pickups']
  if (habit.includes('vaping')) return ['Stress cues', 'Post-meal pulls', 'Social vaping', 'Replacement breathing']
  if (habit.includes('smoking')) return ['Routine cigarettes', 'Craving windows', 'Trigger locations', 'Replacement planning']
  if (habit.includes('junk')) return ['Impulse snacks', 'Sugar loops', 'Evening comfort eating', 'Pantry triggers']
  if (habit.includes('gambling')) return ['Betting urges', 'Chasing losses', 'Boredom sessions', 'Deposit blocks']
  return [user?.habit || 'Habit loop', 'Trigger response', 'Replacement routine', 'Daily check-in']
}

function adminActionsForUser(user) {
  if (!user) return []
  const actions = []
  if (user.risk === 'High') actions.push('Schedule coach check-in', 'Review trigger plan')
  if (user.streak === 0) actions.push('Send restart nudge')
  if (user.winRate < 65) actions.push('Assign SOS practice')
  if (user.moodAvg && user.moodAvg < 3) actions.push('Ask for mood reflection')
  if (user.nextReward) actions.push(`Nudge toward ${user.nextReward}`)
  return actions.slice(0, 4)
}

async function saveHabitCatalogItem() {
  const name = newHabit.value.trim()
  const code = newHabitCode.value.trim().toUpperCase()
  const description = newHabitDescription.value.trim()
  if (!name || !code || !description) return
  await addHabitCatalogItem({ name, code, description })
  newHabit.value = ''
  newHabitCode.value = ''
  newHabitDescription.value = ''
}

async function saveAdminUser() {
  const name = newUserName.value.trim()
  const habit = newUserHabit.value.trim()
  if (!name || !habit) return
  await addAdminUser({
    name,
    identity: 'Guest/private',
    habit,
    checkins: 0,
    streak: 0,
    best: 0,
    resisted: 0,
    relapsed: 0,
    moodAvg: 0,
    status: 'Needs onboarding',
    risk: newUserRisk.value,
    lastAction: 'Created from admin panel',
    nextReward: 'First Check-in',
  })
  newUserName.value = ''
  newUserHabit.value = ''
  newUserRisk.value = 'Medium'
}

function loginAdmin() {
  const emailOk = adminEmail.value.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase()
  const passwordOk = adminPassword.value === ADMIN_PASSWORD
  if (!emailOk || !passwordOk) {
    adminError.value = 'Admin credentials do not match.'
    return
  }
  sessionStorage.setItem(ADMIN_SESSION_KEY, 'true')
  isAdminAuthed.value = true
  adminEmail.value = ''
  adminPassword.value = ''
  adminError.value = ''
}

function logoutAdmin() {
  sessionStorage.removeItem(ADMIN_SESSION_KEY)
  isAdminAuthed.value = false
}

async function confirmReset() {
  if (window.confirm('Reset this user journey, plan, check-ins, and custom habit controls?')) {
    await resetAll()
    router.push('/start')
  }
}
</script>

<template>
  <main class="w-full pb-24 pt-2">
    <section v-if="!isAdminAuthed" class="admin-login rise">
      <div>
        <p class="eyebrow">ADMIN LOGIN</p>
        <h1 class="mt-3 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
          Secure the operations console.
        </h1>
        <p class="mt-4 max-w-xl text-sm leading-6 text-[var(--muted)]">
          User identity remains separate from admin access. Users can stay private as guests;
          admins sign in here only to manage analytics, habit controls, and reset operations.
        </p>
      </div>

      <form class="admin-login-card" @submit.prevent="loginAdmin">
        <label class="block">
          <span class="control-kicker">Admin email</span>
          <input
            v-model="adminEmail"
            type="email"
            autocomplete="username"
            class="field mt-2 px-4 py-3 text-sm"
            placeholder="admin@unhook.local"
          />
        </label>
        <label class="mt-4 block">
          <span class="control-kicker">Password</span>
          <input
            v-model="adminPassword"
            type="password"
            autocomplete="current-password"
            class="field mt-2 px-4 py-3 text-sm"
            placeholder="Enter admin password"
          />
        </label>
        <p v-if="adminError" class="mt-3 text-sm text-[var(--danger)]" role="alert">{{ adminError }}</p>
        <button type="submit" class="btn btn-primary mt-5 w-full px-5 py-3 text-sm">
          Login to admin
        </button>
      </form>
    </section>

    <template v-else>
    <section class="admin-shell rise">
      <aside class="admin-sidebar">
        <div>
          <p class="eyebrow">UNHOOK ADMIN</p>
          <h1 class="mt-3 font-display text-3xl font-semibold leading-tight">Operations console</h1>
          <p class="mt-2 text-xs leading-5 text-[var(--muted)]">Privacy, analytics, habit controls, and recovery support wiring.</p>
        </div>

        <nav class="mt-7 space-y-2" aria-label="Admin sections">
          <button
            v-for="item in navItems"
            :key="item.key"
            type="button"
            class="admin-nav-item"
            :data-active="activeSection === item.key"
            @click="activeSection = item.key"
          >
            <span>{{ item.label }}</span>
            <small>{{ item.meta }}</small>
          </button>
        </nav>

        <div class="admin-sidebar-footer">
          <p class="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Session</p>
          <p class="mt-1 text-sm">{{ identityLabel }}</p>
          <button type="button" class="mt-4 w-full rounded-xl border border-[var(--hair)] px-3 py-2 text-xs text-[var(--muted)] hover:bg-white/5" @click="logoutAdmin">
            Admin logout
          </button>
        </div>
      </aside>

      <div class="admin-workspace">
        <header class="admin-workspace-header">
          <div>
            <p class="eyebrow">{{ activeSection === 'overview' ? 'COMMAND CENTER' : activeSection.toUpperCase() }}</p>
            <h2 class="mt-2 font-display text-3xl font-semibold sm:text-4xl">
              {{ navItems.find((item) => item.key === activeSection)?.label }}
            </h2>
          </div>
          <div class="flex flex-col gap-2 sm:flex-row">
            <RouterLink to="/insights" class="btn btn-primary px-5 py-3 text-xs">Analytics</RouterLink>
            <RouterLink to="/start" class="btn btn-ghost px-5 py-3 text-xs">New journey</RouterLink>
          </div>
        </header>

        <section v-if="activeSection === 'overview'" class="admin-panel-grid">
          <div class="admin-card admin-card-wide">
            <p class="eyebrow">SYSTEM SNAPSHOT</p>
            <div class="mt-4 grid gap-3 sm:grid-cols-5">
              <div v-for="item in telemetry" :key="item.label" class="metric-tile">
                <p class="text-xs uppercase tracking-[0.14em] text-[var(--muted)]">{{ item.label }}</p>
                <p class="mt-2 font-display text-2xl font-semibold">{{ item.value }}</p>
              </div>
            </div>
          </div>

          <div class="admin-card">
            <p class="eyebrow">USER RISK GRAPH</p>
            <h3 class="mt-2 font-display text-2xl font-semibold">Support load by risk level.</h3>
            <div class="chart-list mt-5">
              <div v-for="item in riskDistribution" :key="item.risk" class="chart-bar-row">
                <div class="flex items-center justify-between text-sm">
                  <span>{{ item.risk }}</span>
                  <strong>{{ item.count }} users</strong>
                </div>
                <div class="chart-track"><span :style="{ width: item.pct + '%' }" :data-risk="item.risk" /></div>
              </div>
            </div>
          </div>

          <div class="admin-card">
            <p class="eyebrow">HABIT MIX</p>
            <h3 class="mt-2 font-display text-2xl font-semibold">What users are working on.</h3>
            <div class="chart-list mt-5">
              <div v-for="item in habitDistribution" :key="item.habit" class="chart-bar-row">
                <div class="flex items-center justify-between text-sm">
                  <span>{{ item.habit }}</span>
                  <strong>{{ item.count }}</strong>
                </div>
                <div class="chart-track"><span :style="{ width: item.pct + '%' }" /></div>
              </div>
            </div>
          </div>

          <div class="admin-card admin-card-wide">
            <div class="flex items-end justify-between gap-4">
              <div>
                <p class="eyebrow">USER PROGRESS</p>
                <h3 class="mt-2 font-display text-2xl font-semibold">Usage, onboarding, and recovery progress.</h3>
              </div>
              <button type="button" class="btn btn-ghost px-4 py-2.5 text-xs" @click="activeSection = 'users'">View users</button>
            </div>
            <div class="user-progress-grid mt-5">
              <div class="progress-meter">
                <span>{{ userSummary.avgWinRate }}%</span>
                <small>average win rate</small>
              </div>
              <div class="user-progress-table">
                <div v-for="user in userRows.slice(0, 5)" :key="user.id" class="user-row">
                  <div>
                    <strong>{{ user.name }}</strong>
                    <small>{{ user.identity }} · {{ user.habit }}</small>
                  </div>
                  <span>{{ user.checkins }} check-ins</span>
                  <span>{{ user.streak }} day streak</span>
                  <span>{{ user.winRate }}%</span>
                </div>
              </div>
            </div>
          </div>

          <div class="admin-card admin-card-wide">
            <div class="flex items-end justify-between gap-4">
              <div>
                <p class="eyebrow">STREAK LEADERBOARD</p>
                <h3 class="mt-2 font-display text-2xl font-semibold">Top progress this week.</h3>
              </div>
              <button type="button" class="btn btn-ghost px-4 py-2.5 text-xs" @click="activeSection = 'users'">Open users</button>
            </div>
            <div class="leaderboard-grid mt-5">
              <div v-for="user in topStreakUsers" :key="user.id" class="leaderboard-card">
                <span>{{ user.streak }}</span>
                <strong>{{ user.name }}</strong>
                <small>{{ user.habit }} · {{ user.winRate }}% win</small>
              </div>
            </div>
          </div>

          <div class="admin-card admin-card-wide">
            <div class="flex items-end justify-between gap-4">
              <div>
                <p class="eyebrow">REWARD ENGINE</p>
                <h3 class="mt-2 font-display text-2xl font-semibold">Badges that keep behavior change visible.</h3>
              </div>
              <button type="button" class="btn btn-ghost px-4 py-2.5 text-xs" @click="activeSection = 'rewards'">Manage rewards</button>
            </div>
            <div class="reward-strip mt-5">
              <div v-for="reward in rewardRules.slice(0, 5)" :key="reward.name" class="reward-chip" :data-unlocked="reward.unlocked">
                <span>{{ reward.unlocked ? 'Unlocked' : reward.progress + '%' }}</span>
                <strong>{{ reward.name }}</strong>
              </div>
            </div>
          </div>

          <div class="admin-card">
            <p class="eyebrow">OPERATION SIGNALS</p>
            <div class="mt-4 space-y-3">
              <div v-for="signal in opsSignals" :key="signal.label" class="signal-row compact">
                <div>
                  <p class="text-xs uppercase tracking-[0.14em] text-[var(--muted)]">{{ signal.label }}</p>
                  <p class="mt-1 text-sm">{{ signal.value }}</p>
                </div>
                <span class="status-dot" :data-tone="signal.tone" />
              </div>
            </div>
          </div>

          <div class="admin-card">
            <p class="eyebrow">RECENT ACTIVITY</p>
            <div class="mt-4 overflow-hidden rounded-2xl border border-[var(--hair)]">
              <div v-for="row in recentActivity" :key="row.day" class="activity-row">
                <span>{{ row.day }}</span>
                <strong>{{ row.status }}</strong>
                <small>Mood {{ row.mood }}</small>
              </div>
            </div>
          </div>

          <div class="admin-card admin-card-wide">
            <div class="flex items-end justify-between gap-4">
              <div>
                <p class="eyebrow">FRONTEND SURFACES</p>
                <h3 class="mt-2 font-display text-2xl font-semibold">Everything visible to users, controlled from admin.</h3>
              </div>
              <button type="button" class="btn btn-ghost px-4 py-2.5 text-xs" @click="activeSection = 'frontend'">Manage surfaces</button>
            </div>
            <div class="frontend-strip mt-5">
              <RouterLink v-for="module in frontendModules" :key="module.name" :to="module.route" class="frontend-chip">
                <span>{{ module.name }}</span>
                <small>{{ module.status }}</small>
              </RouterLink>
            </div>
          </div>
        </section>

        <section v-else-if="activeSection === 'users'" class="admin-users-layout">
          <div class="admin-card">
            <p class="eyebrow">USER MANAGEMENT</p>
            <h3 class="mt-2 font-display text-2xl font-semibold">User usage and progress monitor.</h3>
            <div class="mt-5 grid gap-3 sm:grid-cols-4">
              <div class="metric-tile"><p class="text-xs uppercase tracking-[0.14em] text-[var(--muted)]">Total users</p><p class="mt-2 font-display text-2xl font-semibold">{{ userSummary.total }}</p></div>
              <div class="metric-tile"><p class="text-xs uppercase tracking-[0.14em] text-[var(--muted)]">Active journeys</p><p class="mt-2 font-display text-2xl font-semibold">{{ userSummary.active }}</p></div>
              <div class="metric-tile"><p class="text-xs uppercase tracking-[0.14em] text-[var(--muted)]">Needs support</p><p class="mt-2 font-display text-2xl font-semibold">{{ userSummary.needsSupport }}</p></div>
              <div class="metric-tile"><p class="text-xs uppercase tracking-[0.14em] text-[var(--muted)]">Avg win rate</p><p class="mt-2 font-display text-2xl font-semibold">{{ userSummary.avgWinRate }}%</p></div>
            </div>

            <form class="admin-add-user mt-5" @submit.prevent="saveAdminUser">
              <input v-model="newUserName" class="field px-4 py-3 text-sm" placeholder="User name" aria-label="User name" />
              <input v-model="newUserHabit" class="field px-4 py-3 text-sm" placeholder="Habit or addiction" aria-label="User habit" />
              <select v-model="newUserRisk" class="field px-4 py-3 text-sm" aria-label="Risk level">
                <option>Low</option>
                <option>Medium</option>
                <option>High</option>
              </select>
              <button type="submit" class="btn btn-primary px-5 py-3 text-sm">Add user</button>
              <button type="button" class="btn btn-ghost px-5 py-3 text-sm" @click="seedDemoAdminUsers">Seed 10</button>
            </form>

            <div class="mt-5 overflow-hidden rounded-2xl border border-[var(--hair)]">
              <div class="user-table-head">
                <span>User</span><span>Habit</span><span>Progress</span><span>Risk</span><span>Last action</span>
              </div>
              <button
                v-for="user in userRows"
                :key="user.id"
                type="button"
                class="user-table-row user-table-row-button"
                :data-active="selectedUser?.id === user.id"
                @click="selectUser(user.id)"
              >
                <span>{{ user.name }}<small>{{ user.identity }}</small></span>
                <span>{{ user.habit }}</span>
                <span>{{ user.checkins }} check-ins<small>{{ user.streak }} day streak · {{ user.winRate }}% win</small></span>
                <span><strong class="risk-pill" :data-risk="user.risk">{{ user.risk }}</strong></span>
                <span>{{ user.lastAction }}</span>
              </button>
            </div>
          </div>

          <aside v-if="selectedUser" class="admin-card user-detail-panel">
            <div class="flex items-start justify-between gap-3">
              <div>
                <p class="eyebrow">USER LEVEL VIEW</p>
                <h3 class="mt-2 font-display text-2xl font-semibold">{{ selectedUser.name }}</h3>
                <p class="mt-1 text-sm text-[var(--muted)]">{{ selectedUser.identity }} · {{ selectedUser.status }}</p>
              </div>
              <strong class="risk-pill" :data-risk="selectedUser.risk">{{ selectedUser.risk }}</strong>
            </div>

            <div class="user-detail-stats mt-5">
              <div v-for="stat in selectedUserStats" :key="stat.label" class="user-detail-stat">
                <span>{{ stat.label }}</span>
                <strong>{{ stat.value }}</strong>
              </div>
            </div>

            <div class="mt-5">
              <p class="control-kicker">Habits to reduce</p>
              <div class="focus-pill-grid mt-3">
                <span v-for="focus in habitFocusForUser(selectedUser)" :key="focus">{{ focus }}</span>
              </div>
            </div>

            <div class="mt-5 grid gap-3">
              <div class="detail-progress">
                <div class="flex items-center justify-between text-sm">
                  <span>Recovery win rate</span>
                  <strong>{{ selectedUser.winRate }}%</strong>
                </div>
                <div class="chart-track mt-2"><span :style="{ width: selectedUser.winRate + '%' }" /></div>
              </div>
              <div class="detail-progress">
                <div class="flex items-center justify-between text-sm">
                  <span>Streak vs best</span>
                  <strong>{{ selectedUser.streak }}/{{ selectedUser.best }} days</strong>
                </div>
                <div class="chart-track mt-2">
                  <span :style="{ width: Math.min(100, Math.round((selectedUser.streak / Math.max(selectedUser.best, 1)) * 100)) + '%' }" data-risk="Low" />
                </div>
              </div>
            </div>

            <div class="user-detail-timeline mt-5">
              <p class="control-kicker">Latest signal</p>
              <div class="timeline-row mt-3">
                <strong>{{ selectedUser.lastAction }}</strong>
                <small>Next reward: {{ selectedUser.nextReward }}</small>
              </div>
              <div class="timeline-row">
                <strong>Mood average {{ selectedUser.moodAvg }}/5</strong>
                <small>{{ selectedUser.resisted }} resisted · {{ selectedUser.relapsed }} slips</small>
              </div>
            </div>

            <div class="mt-5">
              <p class="control-kicker">Admin next steps</p>
              <div class="action-chip-grid mt-3">
                <span v-for="action in adminActionsForUser(selectedUser)" :key="action">{{ action }}</span>
              </div>
            </div>
          </aside>
        </section>

        <section v-else-if="activeSection === 'rewards'" class="admin-panel-grid">
          <div class="admin-card admin-card-wide">
            <p class="eyebrow">REWARDS AND MOTIVATION</p>
            <h3 class="mt-2 font-display text-2xl font-semibold">Admin-visible reward rules for habit progress.</h3>
            <div class="mt-5 grid gap-3 sm:grid-cols-5">
              <div class="metric-tile"><p class="text-xs uppercase tracking-[0.14em] text-[var(--muted)]">Rules</p><p class="mt-2 font-display text-2xl font-semibold">{{ rewardRules.length }}</p></div>
              <div class="metric-tile"><p class="text-xs uppercase tracking-[0.14em] text-[var(--muted)]">Unlocked</p><p class="mt-2 font-display text-2xl font-semibold">{{ rewardRules.filter((r) => r.unlocked).length }}</p></div>
              <div class="metric-tile"><p class="text-xs uppercase tracking-[0.14em] text-[var(--muted)]">Next reward</p><p class="mt-2 font-display text-xl font-semibold">{{ rewardRules.find((r) => !r.unlocked)?.name || 'All done' }}</p></div>
              <div class="metric-tile"><p class="text-xs uppercase tracking-[0.14em] text-[var(--muted)]">Wins</p><p class="mt-2 font-display text-2xl font-semibold">{{ state.resisted }}</p></div>
              <div class="metric-tile"><p class="text-xs uppercase tracking-[0.14em] text-[var(--muted)]">Notes</p><p class="mt-2 font-display text-2xl font-semibold">{{ state.checkins.filter((c) => c.note).length }}</p></div>
            </div>
            <div class="reward-grid mt-5">
              <article v-for="reward in rewardRules" :key="reward.name" class="reward-card" :data-unlocked="reward.unlocked">
                <div class="flex items-start justify-between gap-3">
                  <div>
                    <p class="control-kicker">{{ reward.unlocked ? 'Reward earned' : 'In progress' }}</p>
                    <h4 class="mt-2 font-display text-xl font-semibold">{{ reward.name }}</h4>
                  </div>
                  <span class="reward-badge">{{ reward.unlocked ? '✓' : reward.progress + '%' }}</span>
                </div>
                <p class="mt-3 text-sm leading-6 text-[var(--muted)]">{{ reward.trigger }}</p>
                <div class="mt-4 h-2 overflow-hidden rounded-full bg-white/[0.06]">
                  <div class="h-full rounded-full bg-[var(--accent)]" :style="{ width: reward.progress + '%' }" />
                </div>
              </article>
            </div>
          </div>
        </section>

        <section v-else-if="activeSection === 'frontend'" class="admin-panel-grid">
          <div class="admin-card admin-card-wide">
            <p class="eyebrow">FRONTEND CONTROL MAP</p>
            <h3 class="mt-2 font-display text-2xl font-semibold">Launch, inspect, and explain every user-facing surface.</h3>
            <div class="frontend-module-grid mt-5">
              <article v-for="module in frontendModules" :key="module.name" class="frontend-module-card">
                <div class="flex items-start justify-between gap-3">
                  <div>
                    <p class="control-kicker">{{ module.owner }}</p>
                    <h4 class="mt-2 font-display text-xl font-semibold">{{ module.name }}</h4>
                  </div>
                  <span class="module-status">{{ module.status }}</span>
                </div>
                <p class="mt-3 text-sm leading-6 text-[var(--muted)]">{{ module.description }}</p>
                <RouterLink :to="module.route" class="mt-5 inline-flex rounded-xl border border-[var(--hair)] px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-[var(--ink)] hover:bg-white/5">
                  Open {{ module.route }}
                </RouterLink>
              </article>
            </div>
          </div>
        </section>

        <section v-else-if="activeSection === 'identity'" class="admin-panel-grid">
          <div class="admin-card admin-card-wide">
            <div class="flex items-start justify-between gap-4">
              <div>
                <p class="eyebrow">IDENTITY MODE</p>
                <h3 class="mt-2 font-display text-2xl font-semibold">{{ identityLabel }}</h3>
              </div>
              <span class="status-pill">{{ state.user?.isAnonymous || !state.user ? 'PRIVATE' : 'SYNC' }}</span>
            </div>
            <p class="mt-3 text-sm leading-6 text-[var(--muted)]">
              Users can keep their identity secret by continuing as guest. Google sign-in is only for
              people who want cross-device sync and account recovery.
            </p>
            <div class="mt-5 grid gap-3 sm:grid-cols-2">
              <button type="button" class="soft-control" :disabled="!isFirebaseConfigured" @click="signInGuest">
                <span class="control-kicker">Private path</span>
                <strong>Continue as guest</strong>
                <small>Anonymous Firebase session when configured.</small>
              </button>
              <button type="button" class="soft-control" :disabled="!isFirebaseConfigured" @click="signInWithGoogle">
                <span class="control-kicker">Sync path</span>
                <strong>Sign in with Google</strong>
                <small>Use only when the user accepts identity sync.</small>
              </button>
            </div>
            <button v-if="state.user && isFirebaseConfigured" type="button" class="mt-3 w-full rounded-xl border border-[var(--hair)] px-4 py-3 text-sm text-[var(--muted)] hover:bg-white/5" @click="logout">
              Sign out user
            </button>
            <p v-if="!isFirebaseConfigured" class="mt-4 rounded-xl border border-[var(--hair)] bg-white/[0.03] p-3 text-xs leading-5 text-[var(--muted)]">
              Firebase is not configured in this environment, so the app is running in local private mode.
              The guest choice is already preserved locally on this device.
            </p>
          </div>
        </section>

        <section v-else-if="activeSection === 'habits'" class="admin-panel-grid">
          <div class="admin-card admin-card-wide">
            <div class="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
              <div>
                <p class="eyebrow">FRONTEND HABIT CARD CONTROL</p>
                <h3 class="mt-2 font-display text-2xl font-semibold">Control the habit cards shown on the home page.</h3>
              </div>
              <div class="flex gap-2">
                <button type="button" class="btn btn-ghost px-4 py-2.5 text-xs" @click="resetHabitCatalog">Reset defaults</button>
                <RouterLink to="/start" class="btn btn-ghost px-4 py-2.5 text-xs">Preview home</RouterLink>
              </div>
            </div>
            <form class="habit-catalog-form mt-5" @submit.prevent="saveHabitCatalogItem">
              <input v-model="newHabitCode" class="field px-4 py-3 text-sm" placeholder="Code, e.g. DIGITAL" aria-label="Habit code" />
              <input v-model="newHabit" class="field px-4 py-3 text-sm" placeholder="Card title, e.g. Doom-scrolling" aria-label="Habit title" />
              <input v-model="newHabitDescription" class="field px-4 py-3 text-sm" placeholder="Description shown on homepage" aria-label="Habit description" />
              <button type="submit" class="btn btn-primary px-5 py-3 text-sm">Add card</button>
            </form>
            <div class="habit-catalog-grid mt-5">
              <article v-for="card in state.habitCatalog" :key="card.id" class="habit-catalog-card" :data-active="card.active">
                <div class="flex items-start justify-between gap-3">
                  <div>
                    <p class="control-kicker">{{ card.code }}</p>
                    <h4 class="mt-2 font-display text-xl font-semibold">{{ card.name }}</h4>
                    <p class="mt-2 text-sm leading-6 text-[var(--muted)]">{{ card.description }}</p>
                  </div>
                  <label class="agent-toggle">
                    <input type="checkbox" :checked="card.active" @change="updateHabitCatalogItem(card.id, { active: $event.target.checked })" />
                    <span />
                  </label>
                </div>
                <div class="mt-4 grid gap-2">
                  <input class="field px-3 py-2 text-xs" :value="card.code" @change="updateHabitCatalogItem(card.id, { code: $event.target.value.toUpperCase() })" aria-label="Edit card code" />
                  <input class="field px-3 py-2 text-xs" :value="card.name" @change="updateHabitCatalogItem(card.id, { name: $event.target.value })" aria-label="Edit card title" />
                  <textarea class="field resize-none px-3 py-2 text-xs" rows="3" :value="card.description" @change="updateHabitCatalogItem(card.id, { description: $event.target.value })" aria-label="Edit card description" />
                </div>
                <button type="button" class="mt-3 w-full rounded-xl border border-[var(--hair)] px-3 py-2 text-xs text-[var(--muted)] hover:bg-white/5" @click="removeHabitCatalogItem(card.id)">
                  Remove card
                </button>
              </article>
            </div>
          </div>
        </section>

        <section v-else-if="activeSection === 'analytics'" class="admin-panel-grid">
          <div class="admin-card admin-card-wide">
            <p class="eyebrow">ANALYTICS ROUTING</p>
            <h3 class="mt-2 font-display text-2xl font-semibold">Progress signals are wired to the user check-in stream.</h3>
            <div class="mt-4 grid gap-3 sm:grid-cols-4">
              <div class="metric-tile"><p class="text-xs uppercase tracking-[0.14em] text-[var(--muted)]">Win days</p><p class="mt-2 font-display text-2xl font-semibold">{{ state.resisted }}</p></div>
              <div class="metric-tile"><p class="text-xs uppercase tracking-[0.14em] text-[var(--muted)]">Slips</p><p class="mt-2 font-display text-2xl font-semibold">{{ state.relapsed }}</p></div>
              <div class="metric-tile"><p class="text-xs uppercase tracking-[0.14em] text-[var(--muted)]">Best streak</p><p class="mt-2 font-display text-2xl font-semibold">{{ state.best }}</p></div>
              <div class="metric-tile"><p class="text-xs uppercase tracking-[0.14em] text-[var(--muted)]">Mood rows</p><p class="mt-2 font-display text-2xl font-semibold">{{ state.checkins.filter((c) => c.mood).length }}</p></div>
            </div>
            <div class="mt-5 grid gap-3 sm:grid-cols-2">
              <RouterLink to="/insights" class="soft-control">
                <span class="control-kicker">User analytics</span>
                <strong>Open full insights</strong>
                <small>Heatmap, mood trend, win rate, milestones, and AI insight.</small>
              </RouterLink>
              <RouterLink to="/today" class="soft-control">
                <span class="control-kicker">Daily cockpit</span>
                <strong>Open today view</strong>
                <small>Check-in capture, SOS, coach, and plan progress.</small>
              </RouterLink>
            </div>
          </div>
        </section>

        <section v-else-if="activeSection === 'agents'" class="admin-panel-grid">
          <div class="admin-card admin-card-wide">
            <div class="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <p class="eyebrow">MULTI-AGENT AI SYSTEM</p>
                <h3 class="mt-2 font-display text-2xl font-semibold">Enable models for plan creation and coaching.</h3>
                <p class="mt-2 text-sm leading-6 text-[var(--muted)]">
                  Gemini is live through the current app key. Claude, Codex, and OpenCode are orchestrated roles until a secure backend proxy is connected.
                </p>
              </div>
              <button type="button" class="btn btn-ghost px-5 py-3 text-sm" @click="resetAiAgents">Reset agents</button>
            </div>

            <div class="agent-grid mt-5">
              <article v-for="agent in state.aiAgents" :key="agent.id" class="agent-card" :data-enabled="agent.enabled">
                <div class="flex items-start justify-between gap-3">
                  <div>
                    <p class="control-kicker">{{ agent.mode }}</p>
                    <h4 class="mt-2 font-display text-xl font-semibold">{{ agent.name }}</h4>
                    <p class="mt-2 text-sm leading-6 text-[var(--muted)]">{{ agent.role }}</p>
                  </div>
                  <label class="agent-toggle">
                    <input type="checkbox" :checked="agent.enabled" @change="updateAiAgent(agent.id, { enabled: $event.target.checked })" />
                    <span />
                  </label>
                </div>
                <div class="mt-4 grid gap-2">
                  <label class="agent-check">
                    <input type="checkbox" :checked="agent.plan" @change="updateAiAgent(agent.id, { plan: $event.target.checked })" />
                    <span>Use for plan generation</span>
                  </label>
                  <label class="agent-check">
                    <input type="checkbox" :checked="agent.coach" @change="updateAiAgent(agent.id, { coach: $event.target.checked })" />
                    <span>Use for coach replies</span>
                  </label>
                </div>
              </article>
            </div>

            <div class="mt-5 rounded-2xl border border-[var(--hair)] bg-white/[0.03] p-4 text-sm leading-6 text-[var(--muted)]">
              Put provider keys in a backend secret or `.env`, then route Claude/OpenAI/OpenCode through a server function. Never paste production keys into chat, source files, or browser localStorage.
            </div>
          </div>
        </section>

        <section v-else-if="activeSection === 'operations'" class="admin-panel-grid">
          <div class="admin-card">
            <p class="eyebrow">ADMIN NOTES</p>
            <h3 class="mt-2 font-display text-2xl font-semibold">Session support note</h3>
            <textarea v-model="adminNote" rows="7" class="field mt-4 resize-none px-4 py-3 text-sm leading-6" placeholder="Internal note for this session, support observation, or next coaching action." />
            <button type="button" class="btn btn-ghost mt-4 w-full px-5 py-3 text-sm" @click="adminNote = ''">Clear note</button>
          </div>
          <div class="admin-card">
            <p class="eyebrow">DANGER ZONE</p>
            <h3 class="mt-2 font-display text-2xl font-semibold">Reset recovery journey</h3>
            <p class="mt-3 text-sm leading-6 text-[var(--muted)]">Clears the current profile, plan, check-ins, and custom habit controls on this device/session.</p>
            <button type="button" class="danger-action mt-5 w-full px-5 py-3 text-sm" @click="confirmReset">Reset journey</button>
          </div>
        </section>
      </div>
    </section>
    </template>
  </main>
</template>
