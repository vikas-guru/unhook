<script setup>
// Insights — an analytics dashboard computed entirely from the user's real
// check-in data, with an AI-written "Insight of the week". All chart math lives
// in ./charts.js (pure, testable); this component only reads the store and
// renders SVG. No chart libraries, no new deps.
import { computed, ref, onMounted } from 'vue'
import { state } from '../../lib/state.js'
import { ask } from '../../lib/gemini.js'
import {
  summaryStats,
  buildHeatmap,
  moodSeries,
  winsDonut,
  milestoneProgress,
  statsDigest,
  parseDay,
} from './charts.js'

// ---- Derived data (reactive) ------------------------------------------------
const hasData = computed(() => state.checkins.length > 0)

const stats = computed(() =>
  summaryStats({
    streak: state.streak,
    best: state.best,
    resisted: state.resisted,
    relapsed: state.relapsed,
  }),
)

const heatmap = computed(() => buildHeatmap(state.checkins, { weeks: 8 }))
const mood = computed(() => moodSeries(state.checkins, { count: 14 }))
const donut = computed(() => winsDonut(stats.value))
const milestone = computed(() => milestoneProgress(state.plan?.milestones || [], state.streak))

const tiles = computed(() => [
  { key: 'streak', label: 'Current streak', value: stats.value.streak, unit: 'days', tone: 'accent-2' },
  { key: 'best', label: 'Best streak', value: stats.value.best, unit: 'days', tone: 'accent' },
  { key: 'won', label: 'Days won', value: stats.value.resisted, unit: '', tone: 'accent-2' },
  { key: 'slips', label: 'Slips', value: stats.value.relapsed, unit: '', tone: 'muted' },
  { key: 'rate', label: 'Win rate', value: stats.value.winRate, unit: '%', tone: 'accent' },
])

// Heatmap layout constants (viewBox units).
const CELL = 15
const GAP = 4
const DOW = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const hmWidth = computed(() => heatmap.value.columns * (CELL + GAP) - GAP)
const hmHeight = 7 * (CELL + GAP) - GAP

function cellFill(cell) {
  if (cell.status === 'resisted') return 'var(--accent-2)'
  if (cell.status === 'relapsed') return 'var(--danger)'
  return 'rgba(240,236,225,0.05)'
}
function cellLabel(cell) {
  const nice = parseDay(cell.day).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  if (cell.status === 'resisted') return `${nice}: resisted, mood ${cell.mood}/5`
  if (cell.status === 'relapsed') return `${nice}: slip`
  return `${nice}: no check-in`
}

// Mood dot y for the average guide line.
const moodAvgY = computed(() => {
  const m = mood.value
  if (m.avg == null) return null
  const pad = 8
  return pad + (1 - (m.avg - m.min) / (m.max - m.min)) * (m.height - pad * 2)
})

// ---- AI Insight of the week -------------------------------------------------
const insight = ref('')
const insightState = ref('idle') // idle | loading | done | error
const SYSTEM =
  'You are a warm, grounded coach helping someone break a bad habit. ' +
  'Given their stats, reply with 1-2 short sentences of specific, encouraging insight. ' +
  'Reference a real number from their data. No preamble, no lists, no emojis.'

async function loadInsight() {
  if (!hasData.value) return
  insightState.value = 'loading'
  try {
    const digest = statsDigest({
      stats: stats.value,
      milestone: milestone.value,
      mood: mood.value,
      profile: state.profile,
    })
    const text = await ask(`Here are my recovery stats. ${digest}\nWrite my insight of the week.`, {
      systemInstruction: SYSTEM,
    })
    const clean = (text || '').trim()
    if (clean) {
      insight.value = clean
      insightState.value = 'done'
    } else {
      insightState.value = 'error'
    }
  } catch (e) {
    // Rate-limited / offline / missing key — degrade softly, never crash.
    console.warn('Insight generation failed:', e?.message || e)
    insightState.value = 'error'
  }
}

onMounted(() => {
  if (hasData.value) loadInsight()
})
</script>

<template>
  <main class="mx-auto max-w-2xl px-4 pt-6 pb-24">
    <header class="rise rise-1 mb-5">
      <p class="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Your progress</p>
      <h1 class="font-display text-3xl mt-1">Insights</h1>
    </header>

    <!-- Empty state ---------------------------------------------------------->
    <section v-if="!hasData" class="card rise rise-2 p-8 text-center">
      <div
        class="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full"
        style="background: rgba(95, 178, 127, 0.14)"
        aria-hidden="true"
      >
        <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="var(--accent-2)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 3v18h18" />
          <path d="M7 14l4-4 3 3 5-6" />
        </svg>
      </div>
      <h2 class="font-display text-xl">Start checking in to see your insights</h2>
      <p class="mx-auto mt-2 max-w-sm text-sm text-[var(--muted)]">
        Every daily check-in adds to your streak, mood trend, and win rate. Come back here to
        watch the story of your progress take shape.
      </p>
    </section>

    <template v-else>
      <!-- Stat tiles --------------------------------------------------------->
      <section class="rise rise-1 mb-4 grid grid-cols-3 gap-3" aria-label="Key stats">
        <div
          v-for="t in tiles"
          :key="t.key"
          class="soft p-3"
          :class="t.key === 'rate' ? 'col-span-3 flex items-center justify-between sm:col-span-1' : ''"
        >
          <div class="flex items-baseline gap-1">
            <span
              class="font-display text-2xl leading-none"
              :style="{
                color:
                  t.tone === 'accent-2'
                    ? 'var(--accent-2)'
                    : t.tone === 'accent'
                      ? 'var(--accent)'
                      : 'var(--ink)',
              }"
              >{{ t.value }}</span
            >
            <span v-if="t.unit" class="text-xs text-[var(--muted)]">{{ t.unit }}</span>
          </div>
          <p class="mt-1 text-[11px] uppercase tracking-wide text-[var(--muted)]">{{ t.label }}</p>
        </div>
      </section>

      <!-- Calendar heatmap --------------------------------------------------->
      <section class="card rise rise-2 mb-4 p-5">
        <div class="mb-3 flex items-center justify-between">
          <h2 class="font-display text-lg">Last 8 weeks</h2>
          <div class="flex items-center gap-3 text-[11px] text-[var(--muted)]">
            <span class="flex items-center gap-1">
              <span class="inline-block h-2.5 w-2.5 rounded-[3px]" style="background: var(--accent-2)"></span>
              resisted
            </span>
            <span class="flex items-center gap-1">
              <span class="inline-block h-2.5 w-2.5 rounded-[3px]" style="background: var(--danger)"></span>
              slip
            </span>
          </div>
        </div>
        <div class="overflow-x-auto">
          <svg
            :viewBox="`-16 0 ${hmWidth + 16} ${hmHeight}`"
            width="100%"
            role="img"
            aria-label="Calendar heatmap of daily check-ins over the last eight weeks"
            style="min-width: 320px"
          >
            <text
              v-for="(d, i) in DOW"
              :key="'dow' + i"
              v-show="i % 2 === 1"
              x="-6"
              :y="i * (CELL + GAP) + CELL / 2 + 3"
              text-anchor="end"
              font-size="8"
              fill="var(--muted)"
            >
              {{ d }}
            </text>
            <rect
              v-for="cell in heatmap.cells"
              :key="cell.day"
              :x="cell.col * (CELL + GAP)"
              :y="cell.row * (CELL + GAP)"
              :width="CELL"
              :height="CELL"
              rx="3"
              :fill="cellFill(cell)"
              :fill-opacity="cell.status === 'none' ? 1 : cell.intensity"
              :stroke="cell.isToday ? 'var(--accent)' : 'none'"
              :stroke-width="cell.isToday ? 1.5 : 0"
              :opacity="cell.inFuture ? 0.25 : 1"
            >
              <title>{{ cellLabel(cell) }}</title>
            </rect>
          </svg>
        </div>
      </section>

      <!-- Mood trend --------------------------------------------------------->
      <section class="card rise rise-2 mb-4 p-5">
        <div class="mb-1 flex items-center justify-between">
          <h2 class="font-display text-lg">Mood trend</h2>
          <span v-if="mood.avg != null" class="text-xs text-[var(--muted)]"
            >avg {{ mood.avg }}/5 · last {{ mood.count }}</span
          >
        </div>
        <p v-if="mood.count < 2" class="py-6 text-center text-sm text-[var(--muted)]">
          A couple more check-ins and your mood line appears here.
        </p>
        <svg
          v-else
          :viewBox="`0 0 ${mood.width} ${mood.height}`"
          width="100%"
          role="img"
          :aria-label="`Mood trend over the last ${mood.count} check-ins, averaging ${mood.avg} out of 5`"
        >
          <line
            v-for="lvl in [1, 3, 5]"
            :key="'g' + lvl"
            x1="8"
            :x2="mood.width - 8"
            :y1="8 + (1 - (lvl - 1) / 4) * (mood.height - 16)"
            :y2="8 + (1 - (lvl - 1) / 4) * (mood.height - 16)"
            stroke="var(--hair)"
            stroke-width="1"
          />
          <line
            v-if="moodAvgY != null"
            x1="8"
            :x2="mood.width - 8"
            :y1="moodAvgY"
            :y2="moodAvgY"
            stroke="var(--accent)"
            stroke-width="1"
            stroke-dasharray="3 4"
            opacity="0.6"
          />
          <path
            :d="mood.path"
            fill="none"
            stroke="var(--accent-2)"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          <g v-for="(p, i) in mood.points" :key="'p' + i">
            <circle :cx="p.x" :cy="p.y" r="3" fill="var(--bg)" stroke="var(--accent-2)" stroke-width="2">
              <title>{{ parseDay(p.day).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) }}: mood {{ p.mood }}/5</title>
            </circle>
          </g>
        </svg>
      </section>

      <!-- Wins donut + Milestone progress ------------------------------------>
      <div class="mb-4 grid gap-4 sm:grid-cols-2">
        <section class="card rise rise-3 p-5">
          <h2 class="font-display text-lg mb-2">Wins vs slips</h2>
          <div class="flex items-center gap-4">
            <svg viewBox="0 0 100 100" width="104" height="104" role="img" :aria-label="`${stats.winRate}% win rate: ${stats.resisted} resisted, ${stats.relapsed} slips`">
              <circle cx="50" cy="50" :r="donut.radius" fill="none" stroke="var(--hair)" stroke-width="12" />
              <circle
                v-for="seg in donut.segments"
                :key="seg.key"
                v-show="seg.value > 0"
                cx="50"
                cy="50"
                :r="donut.radius"
                fill="none"
                :stroke="seg.color"
                stroke-width="12"
                stroke-linecap="round"
                :stroke-dasharray="`${seg.dash} ${donut.circumference - seg.dash}`"
                :stroke-dashoffset="seg.offset"
                transform="rotate(-90 50 50)"
              >
                <title>{{ seg.label }}: {{ seg.value }}</title>
              </circle>
              <text x="50" y="48" text-anchor="middle" class="font-display" font-size="20" fill="var(--ink)">
                {{ stats.winRate }}%
              </text>
              <text x="50" y="63" text-anchor="middle" font-size="8" fill="var(--muted)">win rate</text>
            </svg>
            <ul class="space-y-2 text-sm">
              <li v-for="seg in donut.segments" :key="seg.key" class="flex items-center gap-2">
                <span class="inline-block h-3 w-3 rounded-full" :style="{ background: seg.color }"></span>
                <span class="text-[var(--muted)]">{{ seg.label }}</span>
                <span class="ml-auto font-medium">{{ seg.value }}</span>
              </li>
            </ul>
          </div>
        </section>

        <section class="card rise rise-3 p-5">
          <h2 class="font-display text-lg mb-2">Next milestone</h2>
          <template v-if="milestone">
            <div v-if="milestone.allDone" class="py-2">
              <p class="text-[var(--accent-2)] font-medium">All milestones reached</p>
              <p class="mt-1 text-sm text-[var(--muted)]">
                You cleared every step of your plan. Keep the streak alive.
              </p>
            </div>
            <template v-else>
              <div class="flex items-baseline justify-between">
                <p class="text-sm text-[var(--ink)]">{{ milestone.label }}</p>
                <p class="text-xs text-[var(--muted)]">{{ milestone.current }}/{{ milestone.target }} days</p>
              </div>
              <div
                class="mt-3 h-2.5 w-full overflow-hidden rounded-full"
                style="background: rgba(240, 236, 225, 0.07)"
                role="progressbar"
                :aria-valuenow="Math.round(milestone.fraction * 100)"
                aria-valuemin="0"
                aria-valuemax="100"
                :aria-label="`Progress to ${milestone.label}`"
              >
                <div
                  class="h-full rounded-full transition-all"
                  :style="{ width: `${Math.round(milestone.fraction * 100)}%`, background: 'var(--accent)' }"
                ></div>
              </div>
              <p class="mt-2 text-sm text-[var(--muted)]">
                <span class="text-[var(--accent)] font-medium">{{ milestone.remaining }}</span>
                more {{ milestone.remaining === 1 ? 'day' : 'days' }} to go
              </p>
            </template>
          </template>
          <p v-else class="py-2 text-sm text-[var(--muted)]">No milestones set in your plan yet.</p>
        </section>
      </div>

      <!-- AI Insight of the week --------------------------------------------->
      <section
        v-if="insightState !== 'error'"
        class="card rise rise-4 p-5"
        style="background: linear-gradient(180deg, rgba(224, 120, 90, 0.1), var(--panel))"
        aria-live="polite"
      >
        <div class="mb-2 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M12 3l1.9 4.8L18.5 9l-4.6 1.2L12 15l-1.9-4.8L5.5 9l4.6-1.2z" />
            </svg>
            <h2 class="font-display text-lg">Insight of the week</h2>
          </div>
          <button
            v-if="insightState === 'done'"
            type="button"
            class="chip px-2.5 py-1 text-xs"
            @click="loadInsight"
          >
            Refresh
          </button>
        </div>

        <p v-if="insightState === 'loading'" class="animate-pulse text-sm text-[var(--muted)]">
          Reading your progress…
        </p>
        <p v-else-if="insightState === 'done'" class="text-[15px] leading-relaxed text-[var(--ink)]">
          {{ insight }}
        </p>
      </section>
    </template>
  </main>
</template>
