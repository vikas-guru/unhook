<script setup>
// "Today" — the home view: streak ring, AI nudge, daily check-in, plan, stats.
// Reads the shared store; opens global SOS/Coach overlays via the ui store.
import { ref, computed, onMounted } from 'vue'
import { state, addCheckin, resetAll, todayEntry } from '../../lib/state.js'
import { openSOS, openCoach } from '../../lib/ui.js'
import { dailyNudge, relapseReframe } from '../../lib/coach.js'

const nudge = ref('')
const mood = ref(4)
const note = ref('')
const reframe = ref('')
const moods = ['😣', '😕', '😐', '🙂', '😄']

const done = computed(() => todayEntry())
const nextMilestone = computed(() => {
  const ms = state.plan?.milestones || []
  return ms.find((m) => m.day > state.streak) || ms[ms.length - 1] || { day: 21 }
})
const ringPct = computed(() => Math.min(100, Math.round((state.streak / (nextMilestone.value.day || 21)) * 100)))
const dash = computed(() => `${(ringPct.value / 100) * 264} 264`)

async function log(status) {
  const n = note.value.trim()
  if (status === 'relapsed') {
    reframe.value = '…'
    relapseReframe(state.profile, state, n).then((t) => (reframe.value = t)).catch(() => (reframe.value = ''))
  } else {
    reframe.value = ''
  }
  await addCheckin({ status, mood: mood.value, note: n })
  note.value = ''
}

onMounted(async () => {
  try { nudge.value = await dailyNudge(state.profile, state) } catch { nudge.value = '' }
})
</script>

<template>
  <div class="space-y-5">
    <!-- Hero -->
    <section class="card rise flex flex-col items-center gap-5 p-6 sm:flex-row">
      <div class="relative grid h-32 w-32 shrink-0 place-items-center">
        <svg viewBox="0 0 100 100" class="h-32 w-32 -rotate-90">
          <circle cx="50" cy="50" r="42" fill="none" stroke="var(--hair)" stroke-width="8" />
          <circle cx="50" cy="50" r="42" fill="none" stroke="var(--accent-2)" stroke-width="8" stroke-linecap="round" :stroke-dasharray="dash" style="transition: stroke-dasharray .6s cubic-bezier(.2,.7,.2,1)" />
        </svg>
        <div class="absolute text-center">
          <p class="font-display text-4xl font-semibold leading-none">{{ state.streak }}</p>
          <p class="text-[11px] text-[var(--muted)]">day streak</p>
        </div>
      </div>
      <div class="min-w-0 text-center sm:text-left">
        <p class="text-xs uppercase tracking-wide text-[var(--muted)]">Breaking free from</p>
        <p class="font-display text-2xl font-semibold">{{ state.profile.habit }}</p>
        <p v-if="state.plan?.mantra" class="mt-1 text-[var(--accent)]">“{{ state.plan.mantra }}”</p>
        <p v-if="nudge" class="mt-3 soft px-3 py-2 text-sm text-[var(--ink)]">💡 {{ nudge }}</p>
      </div>
    </section>

    <!-- Actions -->
    <section class="rise rise-1 grid grid-cols-2 gap-4">
      <button class="card p-4 text-center transition hover:-translate-y-0.5" @click="openSOS">
        <p class="text-2xl">🆘</p>
        <p class="mt-1 font-semibold">Craving SOS</p>
        <p class="text-xs text-[var(--muted)]">Ride out the urge</p>
      </button>
      <button class="card p-4 text-center transition hover:-translate-y-0.5" @click="openCoach">
        <p class="text-2xl">💬</p>
        <p class="mt-1 font-semibold">Talk to coach</p>
        <p class="text-xs text-[var(--muted)]">Adaptive &amp; personal</p>
      </button>
    </section>

    <!-- Check-in -->
    <section class="card rise rise-2 p-6">
      <p class="font-display text-lg font-semibold">Today's check-in</p>
      <template v-if="!done">
        <div class="mt-4 flex flex-wrap items-center gap-2">
          <span class="text-sm text-[var(--muted)]">How are you feeling?</span>
          <button
            v-for="(m, i) in moods"
            :key="i"
            class="grid h-9 w-9 place-items-center rounded-lg text-lg transition"
            :class="mood === i + 1 ? 'bg-[var(--accent)]/25 ring-1 ring-[var(--accent)]' : 'soft'"
            :aria-label="`Mood ${i + 1} of 5`"
            @click="mood = i + 1"
          >{{ m }}</button>
        </div>
        <input v-model="note" placeholder="Anything on your mind? (optional)" class="field mt-4 px-3.5 py-2.5 text-sm" />
        <div class="mt-4 grid grid-cols-2 gap-3">
          <button class="btn py-3 font-semibold text-white" style="background: var(--accent-2)" @click="log('resisted')">✅ Stayed on track</button>
          <button class="btn btn-ghost py-3" @click="log('relapsed')">💧 I slipped</button>
        </div>
      </template>
      <p v-else class="mt-3 text-sm text-[var(--muted)]">
        Logged today: <span class="font-medium text-[var(--ink)]">{{ done.status === 'resisted' ? 'stayed on track ✅' : 'a slip 💧' }}</span>
        <span class="ml-1">{{ moods[done.mood - 1] }}</span>
      </p>

      <div v-if="reframe" class="mt-4 rounded-[var(--radius-sm)] border border-[var(--accent)]/30 bg-[var(--accent)]/10 p-4 text-sm whitespace-pre-wrap">
        <p class="mb-1 text-xs uppercase tracking-wide text-[var(--accent)]">Coach</p>{{ reframe }}
      </div>
    </section>

    <!-- Plan + stats -->
    <section class="rise rise-3 grid gap-4 sm:grid-cols-2">
      <div class="card p-5">
        <p class="text-xs uppercase tracking-wide text-[var(--muted)]">{{ state.plan.title }} · milestones</p>
        <ul class="mt-3 space-y-2.5">
          <li v-for="m in state.plan.milestones" :key="m.day" class="flex items-start gap-3 text-sm">
            <span class="grid h-6 w-6 shrink-0 place-items-center rounded-lg text-xs font-semibold"
              :class="state.streak >= m.day ? 'text-white' : 'soft text-[var(--muted)]'"
              :style="state.streak >= m.day ? 'background: var(--accent-2)' : ''">{{ state.streak >= m.day ? '✓' : 'D' + m.day }}</span>
            <span :class="state.streak >= m.day ? 'text-[var(--muted)] line-through' : ''">{{ m.label }}</span>
          </li>
        </ul>
      </div>
      <div class="card p-5">
        <p class="text-xs uppercase tracking-wide text-[var(--muted)]">Your progress</p>
        <div class="mt-3 grid grid-cols-2 gap-3 text-center">
          <div class="soft py-3"><p class="font-display text-2xl font-semibold">{{ state.streak }}</p><p class="text-xs text-[var(--muted)]">current</p></div>
          <div class="soft py-3"><p class="font-display text-2xl font-semibold">{{ state.best }}</p><p class="text-xs text-[var(--muted)]">best</p></div>
          <div class="soft py-3"><p class="font-display text-2xl font-semibold text-[var(--accent-2)]">{{ state.resisted }}</p><p class="text-xs text-[var(--muted)]">days won</p></div>
          <div class="soft py-3"><p class="font-display text-2xl font-semibold text-[var(--muted)]">{{ state.relapsed }}</p><p class="text-xs text-[var(--muted)]">slips</p></div>
        </div>
        <button class="mt-4 w-full rounded-lg border border-[var(--hair)] px-3 py-2 text-xs text-[var(--muted)] hover:bg-white/5" @click="resetAll">Start over</button>
      </div>
    </section>
  </div>
</template>
