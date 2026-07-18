<script setup>
// "Today" — the home view: streak ring, AI nudge, daily check-in, plan, stats.
// Reads the shared store; opens global SOS/Coach overlays via the ui store.
import { ref, computed, onMounted } from 'vue'
import confetti from 'canvas-confetti'
import { usePreferredReducedMotion } from '@vueuse/core'
import { Activity, Bot, CheckCircle2, Flame, HeartPulse, LifeBuoy, RotateCcw, ShieldCheck, Sparkles, Target, TrendingUp } from '@lucide/vue'
import { state, addCheckin, resetAll, todayEntry } from '../../lib/state.js'
import { openSOS, openCoach } from '../../lib/ui.js'
import { dailyNudge, relapseReframe } from '../../lib/coach.js'

const nudge = ref('')
const mood = ref(4)
const note = ref('')
const reframe = ref('')
const moods = ['😣', '😕', '😐', '🙂', '😄']
const reducedMotion = usePreferredReducedMotion()

const done = computed(() => todayEntry())
const nextMilestone = computed(() => {
  const ms = state.plan?.milestones || []
  return ms.find((m) => m.day > state.streak) || ms[ms.length - 1] || { day: 21 }
})
const ringPct = computed(() => Math.min(100, Math.round((state.streak / (nextMilestone.value.day || 21)) * 100)))
const dash = computed(() => `${(ringPct.value / 100) * 264} 264`)
const winsRate = computed(() => {
  const total = state.resisted + state.relapsed
  return total ? Math.round((state.resisted / total) * 100) : 0
})
const remainingDays = computed(() => Math.max(0, (nextMilestone.value.day || 0) - state.streak))
const moodLabel = computed(() => ['Heavy', 'Low', 'Steady', 'Good', 'Clear'][mood.value - 1])

async function log(status) {
  const n = note.value.trim()
  if (status === 'relapsed') {
    reframe.value = '…'
    relapseReframe(state.profile, state, n).then((t) => (reframe.value = t)).catch(() => (reframe.value = ''))
  } else {
    reframe.value = ''
  }
  await addCheckin({ status, mood: mood.value, note: n })
  if (status === 'resisted' && reducedMotion.value !== 'reduce') {
    confetti({
      particleCount: 70,
      spread: 58,
      origin: { y: 0.82 },
      colors: ['#5fb27f', '#e0785a', '#ece7db'],
      scalar: 0.8,
    })
  }
  note.value = ''
}

onMounted(async () => {
  try { nudge.value = await dailyNudge(state.profile, state) } catch { nudge.value = '' }
})
</script>

<template>
  <div class="today-console space-y-5">
    <section class="premium-hero rise">
      <div class="premium-hero__copy">
        <div class="flex flex-wrap items-center gap-2">
          <span class="status-pill"><span class="status-dot"></span> live recovery plan</span>
          <span class="mono-chip">Protocol {{ state.plan?.title || 'Reset' }}</span>
        </div>
        <p class="mt-6 text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Breaking free from</p>
        <h1 class="mt-2 font-display text-[clamp(2.5rem,10vw,5.3rem)] font-black leading-[0.92] tracking-[-0.045em]">
          {{ state.profile.habit }}
        </h1>
        <p v-if="state.plan?.mantra" class="mt-5 max-w-xl text-lg leading-7 text-[var(--ink)]/85">
          "{{ state.plan.mantra }}"
        </p>
        <p v-if="nudge" class="ai-nudge mt-5">
          <Sparkles class="h-4 w-4 shrink-0 text-[var(--accent)]" />
          <span>{{ nudge }}</span>
        </p>
        <div class="mt-6 flex flex-wrap gap-3">
          <button class="btn btn-primary premium-btn px-5 py-3" @click="openSOS">
            <LifeBuoy class="h-4 w-4" />
            Craving SOS
          </button>
          <button class="btn btn-ghost premium-btn px-5 py-3" @click="openCoach">
            <Bot class="h-4 w-4" />
            Coach
          </button>
        </div>
      </div>

      <div class="command-panel">
        <div class="flex items-center justify-between gap-4">
          <div>
            <p class="mono-label">Streak engine</p>
            <p class="mt-1 text-sm text-[var(--muted)]">Next lock: day {{ nextMilestone.day }}</p>
          </div>
          <ShieldCheck class="h-6 w-6 text-[var(--accent-2)]" />
        </div>

        <div class="relative mx-auto mt-7 grid h-44 w-44 place-items-center">
          <svg viewBox="0 0 100 100" class="h-44 w-44 -rotate-90">
            <circle cx="50" cy="50" r="42" fill="none" stroke="var(--hair)" stroke-width="7" />
            <circle cx="50" cy="50" r="42" fill="none" stroke="var(--accent-2)" stroke-width="7" stroke-linecap="round" :stroke-dasharray="dash" class="streak-ring" />
          </svg>
          <div class="absolute text-center">
            <p class="font-display text-6xl font-black leading-none">{{ state.streak }}</p>
            <p class="mono-label mt-1">day streak</p>
          </div>
        </div>

        <div class="telemetry-grid mt-7">
          <div>
            <Flame class="h-4 w-4 text-[var(--accent)]" />
            <span>{{ state.best }}</span>
            <small>best</small>
          </div>
          <div>
            <TrendingUp class="h-4 w-4 text-[var(--accent-2)]" />
            <span>{{ winsRate }}%</span>
            <small>win rate</small>
          </div>
          <div>
            <Target class="h-4 w-4 text-[var(--accent)]" />
            <span>{{ remainingDays }}</span>
            <small>days left</small>
          </div>
        </div>
      </div>
    </section>

    <section class="card premium-section rise rise-2 p-6">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p class="mono-label">Today's check-in</p>
          <h2 class="font-display text-3xl font-black tracking-[-0.035em]">Close the loop</h2>
        </div>
        <HeartPulse class="h-6 w-6 text-[var(--accent)]" />
      </div>
      <template v-if="!done">
        <div class="mt-5 flex flex-wrap items-center gap-2">
          <span class="mr-1 text-sm text-[var(--muted)]">Mood: <span class="text-[var(--ink)]">{{ moodLabel }}</span></span>
          <button
            v-for="(m, i) in moods"
            :key="i"
            class="mood-button"
            :class="{ 'is-active': mood === i + 1 }"
            :aria-label="`Mood ${i + 1} of 5`"
            @click="mood = i + 1"
          >{{ m }}</button>
        </div>
        <input v-model="note" placeholder="Anything on your mind? (optional)" class="field mt-4 px-3.5 py-2.5 text-sm" />
        <div class="mt-4 grid grid-cols-2 gap-3">
          <button class="btn premium-btn py-3 text-white" style="background: var(--accent-2)" @click="log('resisted')">
            <CheckCircle2 class="h-4 w-4" />
            Stayed on track
          </button>
          <button class="btn btn-ghost premium-btn py-3" @click="log('relapsed')">
            <Activity class="h-4 w-4" />
            I slipped
          </button>
        </div>
      </template>
      <p v-else class="mt-3 text-sm text-[var(--muted)]">
        Logged today: <span class="font-medium text-[var(--ink)]">{{ done.status === 'resisted' ? 'stayed on track' : 'a slip' }}</span>
        <span class="ml-1">{{ moods[done.mood - 1] }}</span>
      </p>

      <div v-if="reframe" class="mt-4 rounded-[var(--radius-sm)] border border-[var(--accent)]/30 bg-[var(--accent)]/10 p-4 text-sm whitespace-pre-wrap">
        <p class="mb-1 text-xs uppercase tracking-wide text-[var(--accent)]">Coach</p>{{ reframe }}
      </div>
    </section>

    <!-- Plan + stats -->
    <section class="rise rise-3 grid gap-4 sm:grid-cols-2">
      <div class="card premium-section p-5">
        <p class="mono-label">{{ state.plan.title }} / milestones</p>
        <ul class="mt-3 space-y-2.5">
          <li v-for="m in state.plan.milestones" :key="m.day" class="flex items-start gap-3 text-sm">
            <span class="grid h-6 w-6 shrink-0 place-items-center rounded-lg text-xs font-semibold"
              :class="state.streak >= m.day ? 'text-white' : 'soft text-[var(--muted)]'"
              :style="state.streak >= m.day ? 'background: var(--accent-2)' : ''">{{ state.streak >= m.day ? '✓' : 'D' + m.day }}</span>
            <span :class="state.streak >= m.day ? 'text-[var(--muted)] line-through' : ''">{{ m.label }}</span>
          </li>
        </ul>
      </div>
      <div class="card premium-section p-5">
        <p class="mono-label">Your progress</p>
        <div class="mt-3 grid grid-cols-2 gap-3 text-center">
          <div class="soft py-3"><p class="font-display text-2xl font-semibold">{{ state.streak }}</p><p class="text-xs text-[var(--muted)]">current</p></div>
          <div class="soft py-3"><p class="font-display text-2xl font-semibold">{{ state.best }}</p><p class="text-xs text-[var(--muted)]">best</p></div>
          <div class="soft py-3"><p class="font-display text-2xl font-semibold text-[var(--accent-2)]">{{ state.resisted }}</p><p class="text-xs text-[var(--muted)]">days won</p></div>
          <div class="soft py-3"><p class="font-display text-2xl font-semibold text-[var(--muted)]">{{ state.relapsed }}</p><p class="text-xs text-[var(--muted)]">slips</p></div>
        </div>
        <button class="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--hair)] px-3 py-2 text-xs text-[var(--muted)] hover:bg-white/5" @click="resetAll">
          <RotateCcw class="h-3.5 w-3.5" />
          Start over
        </button>
      </div>
    </section>
  </div>
</template>
