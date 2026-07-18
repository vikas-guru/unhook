<script setup>
import { ref, computed } from 'vue'
import { state } from '../../lib/state.js'
import { VIDEOS, CATEGORIES, searchUrl, categoryForHabit } from './videos.js'

// The category most relevant to this user's habit (null if none matched).
const recommendedCategory = computed(() => categoryForHabit(state.profile?.habit))

// Filter: 'all' or one category key.
const active = ref('all')

// Categories ordered so the recommended lane leads, then the rest.
const orderedCategories = computed(() => {
  const rec = recommendedCategory.value
  if (!rec) return CATEGORIES
  return [rec, ...CATEGORIES.filter((c) => c !== rec)]
})

// Visible cards: apply the chip filter, then sort the recommended lane to the top.
const visibleVideos = computed(() => {
  const rec = recommendedCategory.value
  const list = active.value === 'all' ? VIDEOS : VIDEOS.filter((v) => v.category === active.value)
  const rank = (v) => (rec && v.category === rec ? 0 : 1)
  return [...list].sort((a, b) => rank(a) - rank(b))
})

function isRecommended(video) {
  return recommendedCategory.value === video.category
}

// A calm gradient tile per category — no external images, purely CSS.
const CATEGORY_STYLE = {
  'Screen time & focus': {
    tile: 'linear-gradient(135deg, rgba(224,120,90,.35), rgba(226,161,58,.22))',
    glyph: '📵',
  },
  'Quitting nicotine/vaping': {
    tile: 'linear-gradient(135deg, rgba(213,98,79,.34), rgba(224,120,90,.20))',
    glyph: '🚭',
  },
  'Craving & urge-surfing': {
    tile: 'linear-gradient(135deg, rgba(95,178,127,.34), rgba(226,161,58,.20))',
    glyph: '🌊',
  },
  'Motivation & identity': {
    tile: 'linear-gradient(135deg, rgba(226,161,58,.34), rgba(224,120,90,.20))',
    glyph: '🔥',
  },
  'Calm & breathing': {
    tile: 'linear-gradient(135deg, rgba(95,178,127,.32), rgba(240,236,225,.10))',
    glyph: '🍃',
  },
}
const styleFor = (cat) => CATEGORY_STYLE[cat] || CATEGORY_STYLE['Calm & breathing']
</script>

<template>
  <main class="mx-auto max-w-2xl px-4 pb-24 pt-6">
    <!-- Header -->
    <header class="rise rise-1">
      <p class="text-xs font-medium uppercase tracking-widest text-[var(--muted)]">Watch · redirect the urge</p>
      <h1 class="mt-1 font-display text-3xl font-semibold leading-tight">A quieter thing to reach for</h1>
      <p class="mt-2 text-[15px] leading-relaxed text-[var(--muted)]">
        When the pull hits, swap the scroll for something restorative. These are hand-picked talks and
        guided practices to ride out a craving, steady your breath, and remember why you started.
      </p>
    </header>

    <!-- Personalized note -->
    <p
      v-if="recommendedCategory"
      class="soft rise rise-2 mt-4 flex items-center gap-2 px-4 py-3 text-sm text-[var(--ink)]"
    >
      <span aria-hidden="true">✦</span>
      <span>
        Based on your habit, we floated
        <span class="font-medium text-[var(--accent)]">{{ recommendedCategory }}</span>
        to the top.
      </span>
    </p>

    <!-- Category filter chips -->
    <div class="rise rise-2 mt-5 flex flex-wrap gap-2" role="group" aria-label="Filter videos by category">
      <button
        type="button"
        class="chip px-3.5 py-1.5 text-sm"
        :data-on="active === 'all'"
        :aria-pressed="active === 'all'"
        @click="active = 'all'"
      >
        All
      </button>
      <button
        v-for="cat in orderedCategories"
        :key="cat"
        type="button"
        class="chip px-3.5 py-1.5 text-sm"
        :data-on="active === cat"
        :aria-pressed="active === cat"
        @click="active = cat"
      >
        {{ cat }}
      </button>
    </div>

    <!-- Card grid -->
    <section class="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
      <a
        v-for="video in visibleVideos"
        :key="video.title"
        :href="searchUrl(video)"
        target="_blank"
        rel="noopener noreferrer"
        class="card group flex flex-col overflow-hidden transition duration-200 hover:-translate-y-1 hover:shadow-[var(--shadow-lg)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
        :aria-label="`Watch: ${video.title} by ${video.channel} (opens YouTube search in a new tab)`"
      >
        <!-- Gradient thumbnail with play affordance -->
        <div
          class="relative flex h-28 items-center justify-center"
          :style="{ background: styleFor(video.category).tile }"
        >
          <span class="text-3xl opacity-80" aria-hidden="true">{{ styleFor(video.category).glyph }}</span>
          <span
            class="absolute grid h-12 w-12 place-items-center rounded-full bg-black/45 backdrop-blur-sm transition group-hover:scale-110 group-hover:bg-black/60"
            aria-hidden="true"
          >
            <svg viewBox="0 0 24 24" class="h-5 w-5 translate-x-[1px] fill-white">
              <path d="M8 5v14l11-7z" />
            </svg>
          </span>
          <span
            v-if="isRecommended(video)"
            class="absolute left-2 top-2 rounded-full bg-[var(--accent)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white shadow"
          >
            Recommended for you
          </span>
          <span class="absolute bottom-2 right-2 rounded-full bg-black/50 px-2 py-0.5 text-[11px] font-medium text-white/90">
            {{ video.minutes }} min
          </span>
        </div>

        <!-- Body -->
        <div class="flex flex-1 flex-col p-4">
          <p class="text-[11px] font-medium uppercase tracking-wide text-[var(--muted)]">{{ video.category }}</p>
          <h3 class="mt-1 font-display text-lg font-semibold leading-snug text-[var(--ink)] group-hover:text-[var(--accent)]">
            {{ video.title }}
          </h3>
          <p class="mt-0.5 text-sm text-[var(--muted)]">{{ video.channel }}</p>
          <p class="mt-2 flex-1 text-[13px] leading-relaxed text-[var(--muted)]">{{ video.blurb }}</p>
          <p class="mt-3 inline-flex items-center gap-1 text-sm font-medium text-[var(--accent)]">
            Watch now
            <svg viewBox="0 0 24 24" class="h-3.5 w-3.5 fill-current" aria-hidden="true">
              <path d="M14 3h7v7h-2V6.41l-9.29 9.3-1.42-1.42 9.3-9.29H14V3zM5 5h5v2H7v10h10v-3h2v5H5V5z" />
            </svg>
          </p>
        </div>
      </a>
    </section>

    <!-- Empty state (defensive; every category has items) -->
    <p v-if="visibleVideos.length === 0" class="mt-10 text-center text-sm text-[var(--muted)]">
      Nothing here yet. Try another category.
    </p>

    <p class="mt-8 text-center text-xs text-[var(--muted)]">
      Links open a YouTube search in a new tab — pick the official upload.
    </p>
  </main>
</template>
