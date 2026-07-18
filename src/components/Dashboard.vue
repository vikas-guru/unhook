<script setup>
import { ref, computed, onMounted } from 'vue'
import { todayKey } from '../lib/store.js'
import { dailyNudge, relapseReframe } from '../lib/coach.js'
import CravingSOS from './CravingSOS.vue'
import CoachChat from './CoachChat.vue'

const props = defineProps({ state: Object, user: Object })
const emit = defineEmits(['checkin', 'reset'])

const showSOS = ref(false)
const showCoach = ref(false)
const nudge = ref('')
const mood = ref(4)
const note = ref('')
const reframe = ref('')

const moods = ['😣', '😕', '😐', '🙂', '😄']
const today = todayKey()
const todayEntry = computed(() => props.state.checkins.find((c) => c.day === today))

const nextMilestone = computed(() => {
  const ms = props.state.plan?.milestones || []
  return ms.find((m) => m.day > props.state.streak) || ms[ms.length - 1] || { day: 21 }
})
const ringPct = computed(() => Math.min(100, Math.round((props.state.streak / (nextMilestone.value.day || 21)) * 100)))
const dash = computed(() => `${(ringPct.value / 100) * 264} 264`) // r=42 → circumference ≈ 264

function log(status) {
  const n = note.value.trim()
  if (status === 'relapsed') {
    reframe.value = '…'
    relapseReframe(props.state.profile, props.state, n)
      .then((t) => (reframe.value = t))
      .catch(() => (reframe.value = ''))
  } else {
    reframe.value = ''
  }
  emit('checkin', { status, mood: mood.value, note: n })
  note.value = ''
}

onMounted(async () => {
  try { nudge.value = await dailyNudge(props.state.profile, props.state) } catch { nudge.value = '' }
})
</script>

<template>
  <div class="space-y-6">
    <!-- Hero: streak ring + nudge -->
    <section class="flex flex-col items-center gap-5 rounded-2xl border border-white/10 bg-[var(--panel)]/70 p-6 sm:flex-row sm:items-center">
      <div class="relative grid h-32 w-32 shrink-0 place-items-center">
        <svg viewBox="0 0 100 100" class="h-32 w-32 -rotate-90">
          <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="8" />
          <circle cx="50" cy="50" r="42" fill="none" stroke="var(--accent)" stroke-width="8" stroke-linecap="round" :stroke-dasharray="dash" />
        </svg>
        <div class="absolute text-center">
          <p class="font-display text-3xl font-bold leading-none">{{ state.streak }}</p>
          <p class="text-[11px] text-white/50">day streak</p>
        </div>
      </div>
      <div class="min-w-0 text-center sm:text-left">
        <p class="text-xs uppercase tracking-wide text-white/40">Breaking</p>
        <p class="font-display text-xl font-semibold">{{ state.profile.habit }}</p>
        <p v-if="state.plan?.mantra" class="mt-1 text-[var(--accent)]">“{{ state.plan.mantra }}”</p>
        <p v-if="nudge" class="mt-3 rounded-lg bg-white/5 px-3 py-2 text-sm text-white/75">💡 {{ nudge }}</p>
      </div>
    </section>

    <!-- Big action buttons -->
    <section class="grid grid-cols-2 gap-4">
      <button
        class="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-5 text-center transition hover:bg-red-500/20"
        @click="showSOS = true"
      >
        <p class="text-2xl">🆘</p>
        <p class="mt-1 font-semibold">Craving SOS</p>
        <p class="text-xs text-white/50">Ride out the urge now</p>
      </button>
      <button
        class="rounded-2xl border border-[var(--accent)]/30 bg-[var(--accent)]/10 px-4 py-5 text-center transition hover:bg-[var(--accent)]/20"
        @click="showCoach = true"
      >
        <p class="text-2xl">💬</p>
        <p class="mt-1 font-semibold">Talk to coach</p>
        <p class="text-xs text-white/50">Adaptive, knows your plan</p>
      </button>
    </section>

    <!-- Daily check-in -->
    <section class="rounded-2xl border border-white/10 bg-[var(--panel)]/70 p-6">
      <p class="font-display text-lg font-semibold">Today's check-in</p>
      <template v-if="!todayEntry">
        <div class="mt-4 flex items-center gap-2">
          <span class="text-sm text-white/60">How are you feeling?</span>
          <button
            v-for="(m, i) in moods"
            :key="i"
            class="grid h-9 w-9 place-items-center rounded-lg text-lg transition"
            :class="mood === i + 1 ? 'bg-[var(--accent)]/30 ring-1 ring-[var(--accent)]' : 'bg-white/5 hover:bg-white/10'"
            @click="mood = i + 1"
          >{{ m }}</button>
        </div>
        <input
          v-model="note"
          placeholder="Anything on your mind? (optional)"
          class="mt-4 w-full rounded-xl bg-white/5 border border-white/10 px-3.5 py-2.5 text-sm outline-none focus:border-[var(--accent)]"
        />
        <div class="mt-4 grid grid-cols-2 gap-3">
          <button class="rounded-xl bg-[var(--accent-2)] px-4 py-3 font-semibold text-white" @click="log('resisted')">✅ Stayed on track</button>
          <button class="rounded-xl border border-white/15 px-4 py-3 font-medium text-white/80 hover:bg-white/5" @click="log('relapsed')">💧 I slipped</button>
        </div>
      </template>
      <template v-else>
        <p class="mt-3 text-sm text-white/70">
          Logged today: <span class="font-medium text-white">{{ todayEntry.status === 'resisted' ? 'stayed on track ✅' : 'a slip 💧' }}</span>
          <span class="ml-1">{{ moods[todayEntry.mood - 1] }}</span>
        </p>
      </template>

      <div v-if="reframe" class="mt-4 rounded-xl border border-[var(--accent)]/30 bg-[var(--accent)]/10 p-4 text-sm text-white/90 whitespace-pre-wrap">
        <p class="mb-1 text-xs uppercase tracking-wide text-[var(--accent)]">Coach</p>{{ reframe }}
      </div>
    </section>

    <!-- Plan + stats -->
    <section class="grid gap-4 sm:grid-cols-2">
      <div class="rounded-2xl border border-white/10 bg-[var(--panel)]/70 p-5">
        <p class="text-xs uppercase tracking-wide text-white/40">{{ state.plan.title }} · milestones</p>
        <ul class="mt-3 space-y-2.5">
          <li v-for="m in state.plan.milestones" :key="m.day" class="flex items-start gap-3 text-sm">
            <span
              class="grid h-6 w-6 shrink-0 place-items-center rounded-lg text-xs font-semibold"
              :class="state.streak >= m.day ? 'bg-[var(--accent-2)] text-white' : 'bg-white/5 text-white/50'"
            >{{ state.streak >= m.day ? '✓' : 'D' + m.day }}</span>
            <span :class="state.streak >= m.day ? 'text-white/50 line-through' : 'text-white/80'">{{ m.label }}</span>
          </li>
        </ul>
      </div>
      <div class="rounded-2xl border border-white/10 bg-[var(--panel)]/70 p-5">
        <p class="text-xs uppercase tracking-wide text-white/40">Your progress</p>
        <div class="mt-3 grid grid-cols-2 gap-3 text-center">
          <div class="rounded-xl bg-white/5 py-3"><p class="font-display text-2xl font-bold">{{ state.streak }}</p><p class="text-xs text-white/50">current</p></div>
          <div class="rounded-xl bg-white/5 py-3"><p class="font-display text-2xl font-bold">{{ state.best }}</p><p class="text-xs text-white/50">best</p></div>
          <div class="rounded-xl bg-white/5 py-3"><p class="font-display text-2xl font-bold text-[var(--accent-2)]">{{ state.resisted }}</p><p class="text-xs text-white/50">days won</p></div>
          <div class="rounded-xl bg-white/5 py-3"><p class="font-display text-2xl font-bold text-white/60">{{ state.relapsed }}</p><p class="text-xs text-white/50">slips</p></div>
        </div>
        <button class="mt-4 w-full rounded-lg border border-white/10 px-3 py-2 text-xs text-white/40 hover:bg-white/5" @click="emit('reset')">Start over</button>
      </div>
    </section>

    <CravingSOS v-if="showSOS" :profile="state.profile" :state="state" @close="showSOS = false" />
    <CoachChat v-if="showCoach" :profile="state.profile" :state="state" @close="showCoach = false" />
  </div>
</template>
