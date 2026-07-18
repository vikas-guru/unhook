<script setup>
// Read — an editorial library of evidence-based articles on breaking habits,
// plus an AI writer that streams a fresh personalized piece on demand.
// Standalone view: no props required, reads what it needs from the shared store.
import { ref, computed, nextTick } from 'vue'
import { state } from '../../lib/state.js'
import { askStream } from '../../lib/gemini.js'
import { articles } from './articles.js'

// ── view state ──────────────────────────────────────────────
// mode: 'list' | 'reader'  ·  reader shows either a curated or an AI article
const mode = ref('list')
const active = ref(null)          // the article object being read
const readerEl = ref(null)

// ── AI writer state ─────────────────────────────────────────
const topic = ref('')
const writing = ref(false)        // stream in progress
const writeError = ref('')
const draft = ref('')             // streamed markdown-ish text

const habit = computed(() => state.profile?.habit?.trim() || '')
const canWrite = computed(() => topic.value.trim().length > 1 && !writing.value)

const SYSTEM = `You are a warm, evidence-based habit-change coach writing for someone working to break a habit.
Write ONE short, genuinely helpful article (about 250–350 words) on the reader's requested topic.
Voice: calm, encouraging, grounded in behavioral science (habit loops, cravings as waves, systems over willpower, environment design) — never preachy, never hype, no medical claims.
Format as plain paragraphs separated by blank lines. You may use at most two "## " subheadings and short "- " bullet lists. Start directly with the article — no title line, no preamble, no sign-off.`

function openArticle(a) {
  active.value = a
  mode.value = 'reader'
  scrollTop()
}

function backToList() {
  mode.value = 'list'
  active.value = null
  scrollTop()
}

async function scrollTop() {
  await nextTick()
  readerEl.value?.scrollIntoView?.({ behavior: 'smooth', block: 'start' })
}

async function write() {
  if (!canWrite.value) return
  const t = topic.value.trim()
  writeError.value = ''
  draft.value = ''
  writing.value = true

  // Open the reader immediately with a live "AI" article shell.
  active.value = {
    id: 'ai',
    ai: true,
    title: t.replace(/^(write me |an article about |about )/i, '').trim() || t,
    dek: habit.value ? `Personalized for breaking ${habit.value}.` : 'Written just now, just for you.',
    minutes: null,
    tags: ['for you', 'ai'],
    get body() { return draft.value },
  }
  mode.value = 'reader'
  scrollTop()

  const context = habit.value
    ? `The reader is working to break this habit: "${habit.value}". Where natural, make the article relevant to that.`
    : `The reader has not named a specific habit yet; keep it broadly useful.`
  const prompt = `${context}\n\nWrite the article on: "${t}".`

  try {
    for await (const chunk of askStream(prompt, { systemInstruction: SYSTEM })) {
      draft.value += chunk
    }
    if (!draft.value.trim()) {
      writeError.value = 'The writer came back empty. Try rephrasing your topic.'
    }
  } catch (e) {
    // Friendly, non-crashing degradation — rate limits (429) are common in dev.
    writeError.value = /429|rate|quota|exhaust/i.test(e?.message || '')
      ? 'The AI writer is catching its breath (rate limit). Give it a moment and try again.'
      : 'Something interrupted the writer. Check your connection and try again.'
  } finally {
    writing.value = false
  }
}

function retryWrite() {
  if (active.value?.title) topic.value = topic.value || active.value.title
  write()
}

// ── tiny markdown-ish renderer → structured blocks for the template ──
// Supports: "## " subheads, "- " bullet groups, blank-line paragraphs.
function blocks(src) {
  const out = []
  const lines = (src || '').replace(/\r/g, '').split('\n')
  let para = []
  let bullets = []
  const flushPara = () => { if (para.length) { out.push({ t: 'p', text: para.join(' ') }); para = [] } }
  const flushBullets = () => { if (bullets.length) { out.push({ t: 'ul', items: bullets.slice() }); bullets = [] } }
  for (const raw of lines) {
    const line = raw.trim()
    if (!line) { flushPara(); flushBullets(); continue }
    if (line.startsWith('## ')) { flushPara(); flushBullets(); out.push({ t: 'h', text: line.slice(3).trim() }); continue }
    if (/^[-*]\s+/.test(line)) { flushPara(); bullets.push(line.replace(/^[-*]\s+/, '')); continue }
    flushBullets(); para.push(line)
  }
  flushPara(); flushBullets()
  return out
}

const readerBlocks = computed(() => blocks(active.value?.body))
</script>

<template>
  <div class="mx-auto w-full max-w-2xl px-4 pb-24 pt-6">
    <!-- ── LIST ─────────────────────────────────────────────── -->
    <section v-if="mode === 'list'" ref="readerEl">
      <header class="rise rise-1 mb-6">
        <p class="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">The Library</p>
        <h1 class="font-display mt-1 text-4xl leading-tight">Read</h1>
        <p class="mt-2 max-w-prose text-[var(--muted)]">
          Short, evidence-based field notes on how habits actually break — and an AI coach that will write you a fresh one on any topic.
        </p>
      </header>

      <!-- AI writer card -->
      <form
        class="card rise rise-2 mb-8 p-5"
        aria-label="Ask the AI coach to write an article"
        @submit.prevent="write"
      >
        <div class="flex items-center gap-2">
          <span class="h-2.5 w-2.5 rounded-full bg-[var(--accent-2)]" aria-hidden="true"></span>
          <h2 class="text-sm font-semibold">Write me an article about…</h2>
        </div>
        <p class="mt-1 text-sm text-[var(--muted)]">
          Your coach will write a personalized piece{{ habit ? ` around breaking ${habit}` : '' }}.
        </p>
        <div class="mt-3 flex flex-col gap-2 sm:flex-row">
          <label class="sr-only" for="ai-topic">Article topic</label>
          <input
            id="ai-topic"
            v-model="topic"
            :disabled="writing"
            type="text"
            placeholder="e.g. late-night cravings, boredom, starting over"
            class="field flex-1 px-3.5 py-3 text-sm disabled:opacity-50"
            @keydown.enter.prevent="write"
          />
          <button
            type="submit"
            class="btn btn-primary px-5 py-3 text-sm disabled:cursor-not-allowed disabled:opacity-45"
            :disabled="!canWrite"
          >
            {{ writing ? 'Writing…' : 'Write' }}
          </button>
        </div>
      </form>

      <!-- magazine list -->
      <ul class="space-y-3" role="list">
        <li v-for="(a, i) in articles" :key="a.id" class="rise" :class="`rise-${Math.min(i + 1, 4)}`">
          <button
            type="button"
            class="card group block w-full p-5 text-left transition-transform duration-150 hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            @click="openArticle(a)"
          >
            <div class="flex items-baseline justify-between gap-3 text-[11px] uppercase tracking-[0.14em] text-[var(--muted)]">
              <span class="text-[var(--accent-2)]">{{ a.tags[0] }}</span>
              <span>{{ a.minutes }} min read</span>
            </div>
            <h3 class="font-display mt-2 text-2xl leading-snug transition-colors group-hover:text-[var(--accent)]">
              {{ a.title }}
            </h3>
            <p class="mt-1.5 text-[15px] leading-relaxed text-[var(--muted)]">{{ a.dek }}</p>
            <div class="mt-3 flex flex-wrap gap-1.5">
              <span v-for="t in a.tags" :key="t" class="chip px-2.5 py-1 text-[11px]">{{ t }}</span>
            </div>
          </button>
        </li>
      </ul>
    </section>

    <!-- ── READER ───────────────────────────────────────────── -->
    <article v-else ref="readerEl" class="rise rise-1">
      <button
        type="button"
        class="btn btn-ghost mb-6 px-4 py-2 text-sm"
        @click="backToList"
      >
        <span aria-hidden="true">←</span> Back to library
      </button>

      <div class="flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-[var(--muted)]">
        <span class="text-[var(--accent-2)]">{{ active.tags?.[0] }}</span>
        <template v-if="active.minutes"><span aria-hidden="true">·</span><span>{{ active.minutes }} min read</span></template>
        <span v-else-if="active.ai && writing" class="flex items-center gap-1.5 text-[var(--accent)]">
          <span class="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--accent)]" aria-hidden="true"></span> writing…
        </span>
      </div>

      <h1 class="font-display mt-2 text-4xl leading-tight">{{ active.title }}</h1>
      <p class="mt-2 text-lg italic leading-relaxed text-[var(--muted)]">{{ active.dek }}</p>

      <div class="my-6 h-px w-full bg-[var(--hair)]"></div>

      <!-- AI error state -->
      <div v-if="active.ai && writeError" class="soft mb-5 p-4">
        <p class="text-sm text-[var(--ink)]">{{ writeError }}</p>
        <button type="button" class="btn btn-ghost mt-3 px-4 py-2 text-sm" :disabled="writing" @click="retryWrite">
          Try again
        </button>
      </div>

      <!-- body: comfortable measure + generous line-height -->
      <div class="reader max-w-[62ch] text-[17px] leading-[1.75]">
        <template v-for="(b, i) in readerBlocks" :key="i">
          <h2 v-if="b.t === 'h'" class="font-display mt-8 mb-2 text-2xl leading-snug text-[var(--ink)]">{{ b.text }}</h2>
          <ul v-else-if="b.t === 'ul'" class="my-4 space-y-2 pl-1">
            <li v-for="(it, j) in b.items" :key="j" class="flex gap-3 text-[var(--ink)]">
              <span class="mt-2.5 h-1.5 w-1.5 flex-none rounded-full bg-[var(--accent)]" aria-hidden="true"></span>
              <span>{{ it }}</span>
            </li>
          </ul>
          <p v-else class="mb-5 text-[var(--ink)]">{{ b.text }}</p>
        </template>

        <!-- streaming cursor -->
        <span
          v-if="active.ai && writing"
          class="ml-0.5 inline-block h-5 w-[3px] translate-y-0.5 animate-pulse rounded-full bg-[var(--accent)] align-middle"
          aria-hidden="true"
        ></span>
        <p v-if="active.ai && writing && !draft" class="text-[var(--muted)]">Your coach is thinking it through…</p>
      </div>
    </article>
  </div>
</template>

<style scoped>
.reader { text-wrap: pretty; }
</style>
