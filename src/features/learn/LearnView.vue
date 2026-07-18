<script setup>
// Learn — a personalized hub that gathers the human help (coaches), the
// watchable talks, and the readable field notes into one calm library.
// Gated behind having a plan by the router guard. Reads the shared store and
// reuses the REAL video/article catalogs — no fabricated content or links.
import { computed } from 'vue'
import { state } from '../../lib/state.js'
import { openCoach } from '../../lib/ui.js'
import { rankCoaches } from './coaches.js'
import { VIDEOS, searchUrl, categoryForHabit } from '../videos/videos.js'
import { articles } from '../blogs/articles.js'

// ── personalization ─────────────────────────────────────────
const habit = computed(() => state.profile?.habit?.trim() || '')
const heroHabit = computed(() => (habit.value ? `loosening ${habit.value}` : 'loosening the habit that has your attention'))

// ── coaches: recommend + sort the best match to the front ────
const ranked = computed(() => rankCoaches(habit.value))
const coaches = computed(() => ranked.value.ordered)
const isRecommendedCoach = (coach) => coach.id === ranked.value.recommendedId

function talkToCoach(/* coach */) {
  // openCoach() currently takes no argument (see src/lib/ui.js), so we open
  // the shared coach chat as-is. The persona is ready to seed once it accepts one.
  // TODO: seed persona once openCoach supports it — pass `coach.systemSeed`.
  openCoach()
}

// ── watch: float the habit-matched category up, show a handful ─
const videoCategory = computed(() => categoryForHabit(habit.value))
const watchPicks = computed(() => {
  const cat = videoCategory.value
  const rank = (v) => (cat && v.category === cat ? 0 : 1)
  return [...VIDEOS].sort((a, b) => rank(a) - rank(b)).slice(0, 4)
})
const isRecommendedVideo = (video) => !!videoCategory.value && video.category === videoCategory.value

// A calm CSS-only tile per video category (mirrors the Watch view — no images).
const VIDEO_TILE = {
  'Screen time & focus': { bg: 'linear-gradient(135deg, rgba(224,120,90,.35), rgba(226,161,58,.22))', glyph: '📵' },
  'Quitting nicotine/vaping': { bg: 'linear-gradient(135deg, rgba(213,98,79,.34), rgba(224,120,90,.20))', glyph: '🚭' },
  'Craving & urge-surfing': { bg: 'linear-gradient(135deg, rgba(95,178,127,.34), rgba(226,161,58,.20))', glyph: '🌊' },
  'Motivation & identity': { bg: 'linear-gradient(135deg, rgba(226,161,58,.34), rgba(224,120,90,.20))', glyph: '🔥' },
  'Calm & breathing': { bg: 'linear-gradient(135deg, rgba(95,178,127,.32), rgba(240,236,225,.10))', glyph: '🍃' },
}
const tileFor = (cat) => VIDEO_TILE[cat] || VIDEO_TILE['Calm & breathing']

// ── read: float articles whose tags/topic echo the habit ─────
function articleScore(a, tokens) {
  if (!tokens.length) return 0
  const hay = `${a.title} ${a.dek} ${a.tags.join(' ')}`.toLowerCase()
  return tokens.reduce((n, t) => (hay.includes(t) ? n + 1 : n), 0)
}
const readPicks = computed(() => {
  const tokens = habit.value ? habit.value.toLowerCase().split(/\s+/).filter((t) => t.length > 2) : []
  // Digital habits map cleanly onto the dopamine/feed piece; nudge that token in.
  if (videoCategory.value === 'Screen time & focus') tokens.push('digital', 'scroll')
  return articles
    .map((a, i) => ({ a, i, score: articleScore(a, tokens) }))
    .sort((x, y) => y.score - x.score || x.i - y.i)
    .slice(0, 3)
    .map((s) => s.a)
})
</script>

<template>
  <main class="mx-auto max-w-5xl px-4 pb-24 pt-6">
    <!-- Personalized hero -->
    <header class="rise rise-1">
      <p class="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">Learn · your library</p>
      <h1 class="mt-2 font-display text-[clamp(2rem,7vw,3.4rem)] font-black leading-[0.98] tracking-[-0.03em]">
        Your library for <span class="text-[var(--accent-2)]">{{ heroHabit }}</span>
      </h1>
      <p class="mt-3 max-w-2xl text-[15px] leading-relaxed text-[var(--muted)]">
        Coaches to talk it through, talks to redirect an urge, and short field notes on how habits actually
        break. Gathered — and gently reordered — around where you are right now.
      </p>
    </header>

    <!-- ── COACHES ─────────────────────────────────────────── -->
    <section class="rise rise-2 mt-10" aria-labelledby="learn-coaches">
      <div class="flex items-end justify-between gap-3">
        <div>
          <h2 id="learn-coaches" class="font-display text-2xl font-semibold">Coaches</h2>
          <p class="mt-1 text-sm text-[var(--muted)]">Real, private conversations with an AI coach tuned to a kind of habit.</p>
        </div>
      </div>

      <ul role="list" class="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <li v-for="coach in coaches" :key="coach.id">
          <div
            class="card group flex h-full flex-col p-5 transition duration-200 hover:-translate-y-1 hover:shadow-[var(--shadow-lg)]"
            :style="{ '--c': `var(--${coach.accent})` }"
          >
            <div class="flex items-start gap-3">
              <span
                class="grid h-12 w-12 shrink-0 place-items-center rounded-[var(--radius-sm)] text-2xl"
                :style="{ background: 'color-mix(in srgb, var(--c) 20%, transparent)' }"
                aria-hidden="true"
              >{{ coach.avatar }}</span>
              <div class="min-w-0">
                <h3 class="font-display text-lg font-semibold leading-snug">{{ coach.name }}</h3>
                <p class="truncate text-[13px] text-[var(--muted)]">{{ coach.title }}</p>
              </div>
              <span
                v-if="isRecommendedCoach(coach)"
                class="ml-auto shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white"
                :style="{ background: 'var(--c)' }"
              >For you</span>
            </div>

            <p class="mt-3 text-sm leading-relaxed text-[var(--ink)]">{{ coach.blurb }}</p>
            <p class="mt-2 text-[13px] leading-relaxed text-[var(--muted)]">{{ coach.approach }}</p>

            <ul class="mt-3 flex flex-wrap gap-1.5" aria-label="Focus areas">
              <li v-for="s in coach.specialties.slice(0, 3)" :key="s" class="chip px-2.5 py-1 text-[11px] capitalize">{{ s }}</li>
              <li v-if="!coach.specialties.length" class="chip px-2.5 py-1 text-[11px]">any habit</li>
            </ul>

            <button
              type="button"
              class="btn mt-4 w-full py-2.5 text-sm font-semibold text-white"
              :style="{ background: 'var(--c)' }"
              :aria-label="`Talk to ${coach.name}, ${coach.title}`"
              @click="talkToCoach(coach)"
            >
              Talk to coach
            </button>
          </div>
        </li>
      </ul>
    </section>

    <!-- ── WATCH ───────────────────────────────────────────── -->
    <section class="rise rise-3 mt-12" aria-labelledby="learn-watch">
      <div class="flex items-end justify-between gap-3">
        <div>
          <h2 id="learn-watch" class="font-display text-2xl font-semibold">Watch</h2>
          <p class="mt-1 text-sm text-[var(--muted)]">A quieter thing to reach for when the pull hits.</p>
        </div>
        <RouterLink to="/watch" class="btn btn-ghost shrink-0 px-3.5 py-2 text-sm">See all</RouterLink>
      </div>

      <ul role="list" class="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <li v-for="video in watchPicks" :key="video.title">
          <a
            :href="searchUrl(video)"
            target="_blank"
            rel="noopener noreferrer"
            class="card group flex h-full flex-col overflow-hidden transition duration-200 hover:-translate-y-1 hover:shadow-[var(--shadow-lg)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            :aria-label="`Watch: ${video.title} by ${video.channel} (opens YouTube search in a new tab)`"
          >
            <div class="relative flex h-24 items-center justify-center" :style="{ background: tileFor(video.category).bg }">
              <span class="text-2xl opacity-80" aria-hidden="true">{{ tileFor(video.category).glyph }}</span>
              <span
                class="absolute grid h-10 w-10 place-items-center rounded-full bg-black/45 backdrop-blur-sm transition group-hover:scale-110 group-hover:bg-black/60"
                aria-hidden="true"
              >
                <svg viewBox="0 0 24 24" class="h-4 w-4 translate-x-[1px] fill-white"><path d="M8 5v14l11-7z" /></svg>
              </span>
              <span
                v-if="isRecommendedVideo(video)"
                class="absolute left-2 top-2 rounded-full bg-[var(--accent)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white shadow"
              >For you</span>
              <span class="absolute bottom-2 right-2 rounded-full bg-black/50 px-2 py-0.5 text-[11px] font-medium text-white/90">{{ video.minutes }} min</span>
            </div>
            <div class="flex flex-1 flex-col p-4">
              <p class="text-[11px] font-medium uppercase tracking-wide text-[var(--muted)]">{{ video.category }}</p>
              <h3 class="mt-1 font-display text-base font-semibold leading-snug group-hover:text-[var(--accent)]">{{ video.title }}</h3>
              <p class="mt-0.5 text-[13px] text-[var(--muted)]">{{ video.channel }}</p>
            </div>
          </a>
        </li>
      </ul>
    </section>

    <!-- ── READ ────────────────────────────────────────────── -->
    <section class="rise rise-4 mt-12" aria-labelledby="learn-read">
      <div class="flex items-end justify-between gap-3">
        <div>
          <h2 id="learn-read" class="font-display text-2xl font-semibold">Read</h2>
          <p class="mt-1 text-sm text-[var(--muted)]">Short, evidence-based field notes on how habits break.</p>
        </div>
        <RouterLink to="/read" class="btn btn-ghost shrink-0 px-3.5 py-2 text-sm">See all</RouterLink>
      </div>

      <ul role="list" class="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
        <li v-for="a in readPicks" :key="a.id">
          <RouterLink
            to="/read"
            class="card group flex h-full flex-col p-5 transition duration-200 hover:-translate-y-1 hover:shadow-[var(--shadow-lg)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          >
            <div class="flex items-baseline justify-between gap-3 text-[11px] uppercase tracking-[0.14em] text-[var(--muted)]">
              <span class="text-[var(--accent-2)]">{{ a.tags[0] }}</span>
              <span>{{ a.minutes }} min read</span>
            </div>
            <h3 class="mt-2 font-display text-xl leading-snug transition-colors group-hover:text-[var(--accent)]">{{ a.title }}</h3>
            <p class="mt-1.5 flex-1 text-[14px] leading-relaxed text-[var(--muted)]">{{ a.dek }}</p>
            <p class="mt-3 inline-flex items-center gap-1 text-sm font-medium text-[var(--accent)]">Read it
              <span aria-hidden="true">→</span>
            </p>
          </RouterLink>
        </li>
      </ul>
    </section>
  </main>
</template>
