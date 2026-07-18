<script setup>
// Unhook — Intake. A guided, empathetic wizard that gently asks a person about
// their habit (the way a caring clinician would), then generates a personalised
// quit plan with REAL Gemini, saves it, and moves them into their journey.
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { state, setPlan } from '../../lib/state.js'
import { generatePlan } from './intakeAI.js'
import { useVoiceInput } from './useVoiceInput.js'

const router = useRouter()

// Voice-to-text for the free-text fields (Other habit, trigger note, why).
const voice = useVoiceInput()

// ---- intake answers --------------------------------------------------------
const habitChoice = ref('')     // a chip label, or 'Other'
const habitOther = ref('')      // free text when 'Other'
const frequency = ref('')       // severity chip
const triggerChoice = ref('')   // primary trigger chip
const triggerNote = ref('')     // optional free-text detail
const duration = ref('')        // how long they've had it
const why = ref('')             // their motivation
const readiness = ref(6)        // 1-10 confidence

// ---- flow state ------------------------------------------------------------
const stepIndex = ref(0)
const phase = ref('home')       // 'home' | 'wizard' | 'generating' | 'error'
const error = ref('')

// ---- option banks ----------------------------------------------------------
const habitChips = ['Doom-scrolling', 'Phone overuse', 'Vaping', 'Smoking', 'Junk food', 'Gambling', 'Alcohol', 'Other']
const frequencyChips = ['A few times a week', 'Once a day', 'A few times a day', 'Many times an hour', 'It feels constant']
const triggerChips = ['Boredom', 'Stress', 'Loneliness', 'After meals', 'In bed', 'Social settings']
const durationChips = ['Under a month', 'A few months', 'About a year', 'A few years', 'As long as I remember']
const outcomeRows = [
  { label: 'Assessment depth', value: '6 signals', detail: 'habit, frequency, triggers, duration, motivation, readiness' },
  { label: 'Plan cadence', value: '21 days', detail: 'daily nudges, SOS tools, milestone coaching' },
  { label: 'Privacy posture', value: 'Local first', detail: 'works without account; sign in only when you want sync' },
]
const enterpriseMetrics = [
  { value: '03', label: 'minute setup' },
  { value: '24/7', label: 'craving support' },
  { value: '1:1', label: 'adaptive coach' },
]
const habitCards = computed(() => state.habitCatalog.filter((card) => card.active))

// ---- gentle, accurate psychoeducation (no fabricated stats or citations) ----
// Short, well-established behaviour-change ideas shown to reassure during intake.
const stepLabels = ['The habit', 'How often', 'The trigger', 'How long', 'Your why', 'Readiness']
const facts = [
  { icon: '🌊', title: 'Cravings move in waves', body: 'An urge tends to rise, crest, and pass within minutes — whether or not you act on it. You can ride it out.' },
  { icon: '🌱', title: 'A slip isn’t failure', body: 'Lapses are a normal part of changing a habit. One moment doesn’t have to become a return — you simply begin again.' },
  { icon: '🪟', title: 'Design beats willpower', body: 'Making a cue harder to reach usually works better than resisting it. Shape the room around you, not just your mood.' },
  { icon: '⏳', title: 'New routines take time', body: 'A behaviour feels automatic only after weeks of gentle repetition — not days. Patience is part of the method.' },
  { icon: '🔎', title: 'Name the trigger', body: 'Noticing “this is stress, not hunger” creates a small pause — and in that pause, you get to choose.' },
  { icon: '🧭', title: 'Small plans hold up', body: 'A specific “if this, then that” plan tends to hold on hard days better than a big, vague intention.' },
]

// ---- resolved answers ------------------------------------------------------
const habit = computed(() =>
  habitChoice.value === 'Other' ? habitOther.value.trim() : habitChoice.value,
)
const trigger = computed(() =>
  [triggerChoice.value, triggerNote.value.trim()].filter(Boolean).join(' — '),
)
const readinessLabel = computed(() => {
  const v = readiness.value
  if (v <= 3) return 'Taking it one gentle step at a time'
  if (v <= 6) return 'Ready to try, with support'
  if (v <= 8) return 'Motivated and committed'
  return 'All in — let’s do this'
})

// ---- steps (warm, clinician-style prompts) ---------------------------------
const steps = [
  {
    key: 'habit',
    kicker: 'First, no judgement',
    title: 'Which habit shall we gently loosen?',
    hint: 'Pick what feels closest. There’s no wrong answer here.',
    valid: () => habit.value.length > 0,
    invalidMsg: 'Choose a habit, or tell me in your own words.',
  },
  {
    key: 'frequency',
    kicker: 'Just so I understand',
    title: 'How often does it show up right now?',
    hint: 'An honest guess is perfect — this only helps me pace your plan.',
    valid: () => !!frequency.value,
    invalidMsg: 'Pick whichever feels most true.',
  },
  {
    key: 'trigger',
    kicker: 'Let’s find the pattern',
    title: 'When does the urge tend to hit?',
    hint: 'Most habits have a moment. Name yours, and add detail if you like.',
    valid: () => trigger.value.length > 0,
    invalidMsg: 'Choose a moment, or describe it in your words.',
  },
  {
    key: 'duration',
    kicker: 'A little history',
    title: 'How long has this been part of your days?',
    hint: 'However long it’s been, change is still absolutely possible.',
    valid: () => !!duration.value,
    invalidMsg: 'Pick whichever is closest.',
  },
  {
    key: 'why',
    kicker: 'This one matters most',
    title: 'Why do you want this to change?',
    hint: 'Your reason becomes your anchor on the hard days. Speak freely.',
    valid: () => why.value.trim().length > 0,
    invalidMsg: 'Even a few words about your "why" will help.',
  },
  {
    key: 'readiness',
    kicker: 'Last one',
    title: 'How ready do you feel today?',
    hint: 'Wherever you are is okay. I’ll meet you exactly there.',
    valid: () => true,
    invalidMsg: '',
  },
]

const current = computed(() => steps[stepIndex.value])
const isLast = computed(() => stepIndex.value === steps.length - 1)
const progress = computed(() => Math.round(((stepIndex.value + 1) / steps.length) * 100))

// Live intake summary for the desktop side rail.
const summaryRows = computed(() => [
  { label: 'Habit', value: habit.value },
  { label: 'How often', value: frequency.value },
  { label: 'Trigger', value: trigger.value },
  { label: 'How long', value: duration.value },
  { label: 'Your why', value: why.value.trim() },
  { label: 'Readiness', value: stepIndex.value >= 5 ? `${readiness.value} / 10` : '' },
])

function back() {
  error.value = ''
  if (stepIndex.value > 0) stepIndex.value--
}

function next() {
  if (!current.value.valid()) {
    error.value = current.value.invalidMsg
    return
  }
  error.value = ''
  if (isLast.value) finish()
  else stepIndex.value++
}

function pickHabit(c) {
  habitChoice.value = c
  if (c !== 'Other') habitOther.value = ''
  error.value = ''
}

// Template refs auto-unwrap, so route voice toggles through here where the real
// refs are in scope. Keyed by field so only one mic is ever live.
function toggleVoice(key) {
  const refs = { habitOther, triggerNote, why }
  if (refs[key]) voice.toggle(key, refs[key])
  error.value = ''
}

function beginWithHabit(c) {
  pickHabit(c)
  stepIndex.value = 1
  phase.value = 'wizard'
}

function beginCustom() {
  habitChoice.value = 'Other'
  habitOther.value = ''
  stepIndex.value = 0
  phase.value = 'wizard'
}

async function finish() {
  phase.value = 'generating'
  error.value = ''
  try {
    const plan = await generatePlan({
      habit: habit.value,
      frequency: frequency.value,
      trigger: trigger.value,
      duration: duration.value,
      why: why.value.trim(),
      readiness: readiness.value,
    })
    await setPlan(
      { habit: habit.value, trigger: trigger.value, why: why.value.trim() },
      plan,
    )
    router.push('/today')
  } catch (e) {
    const rateLimited = /429|rate|quota|exhaust/i.test(e?.message || '')
    error.value = rateLimited
      ? 'Gemini is a little busy right now — give it a moment and try again.'
      : 'Something got in the way of building your plan. Let’s try that again.'
    phase.value = 'error'
  }
}
</script>

<template>
  <main class="min-h-full pb-24 pt-2">
    <!-- ============ HOME — "Nightfall, starting over" ============ -->
    <template v-if="phase === 'home'">
      <div class="unh-home">
        <!-- HERO -->
        <section class="unh-hero" aria-labelledby="unh-hero-title">
          <div class="unh-hero-copy">
            <p class="unh-kicker">
              <span class="unh-kicker-dot" aria-hidden="true"></span>
              You don’t have to do this alone
            </p>
            <h1 id="unh-hero-title" class="unh-title font-display">
              Loosen the grip of the habit that’s
              <span class="unh-title-accent">been holding on.</span>
            </h1>
            <p class="unh-lede">
              Choose what you want to change. Unhook shapes a personal plan around your
              real triggers — then stays beside you every day, for the cravings, the
              small wins, and the hard nights.
            </p>
            <div class="unh-cta-row">
              <button type="button" class="btn btn-primary unh-cta" @click="beginCustom">
                Start assessment
              </button>
              <a href="#habit-matrix" class="btn btn-ghost unh-cta-ghost">
                Choose a habit
              </a>
            </div>
            <p class="unh-reassure">
              <span class="unh-live" aria-hidden="true"></span>
              No account needed · private by default · about three minutes
            </p>

            <dl class="unh-stats" aria-label="What to expect">
              <div v-for="m in enterpriseMetrics" :key="m.label" class="unh-stat">
                <dt class="unh-stat-value font-display">{{ m.value }}</dt>
                <dd class="unh-stat-label">{{ m.label }}</dd>
              </div>
            </dl>
          </div>

          <!-- Companion preview — fills the space with a glimpse of the daily support -->
          <aside class="unh-hero-aside" aria-hidden="true">
            <div class="unh-preview">
              <div class="unh-preview-head">
                <span class="unh-preview-when">Tonight · 11:24 PM</span>
                <span class="unh-preview-brand">
                  <span class="unh-live" aria-hidden="true"></span>Unhook
                </span>
              </div>
              <p class="unh-preview-msg">
                Craving hitting hard right now? Let’s ride the wave together — it
                crests and passes in a few minutes. I’m right here.
              </p>
              <div class="unh-preview-actions">
                <span class="unh-preview-chip unh-preview-chip--accent">Breathe with me</span>
                <span class="unh-preview-chip">Talk it out</span>
              </div>
              <div class="unh-preview-foot">
                <div class="unh-preview-streak">
                  <span class="unh-preview-streak-num font-display">7</span>
                  <span class="unh-preview-streak-label">days<br />unhooked</span>
                </div>
                <div class="unh-preview-wave">
                  <span></span><span></span><span></span><span></span>
                  <span></span><span></span><span></span><span></span>
                </div>
              </div>
            </div>
          </aside>
        </section>

        <!-- HABIT CHOOSER — the emotional front door -->
        <section id="habit-matrix" class="unh-choose" aria-labelledby="unh-choose-title">
          <header class="unh-choose-head">
            <p class="unh-kicker unh-kicker--green">
              <span class="unh-kicker-dot" aria-hidden="true"></span>
              Pick your starting point
            </p>
            <h2 id="unh-choose-title" class="unh-choose-title font-display">
              What do you want to loosen your grip on?
            </h2>
            <p class="unh-choose-sub">
              Start with whatever feels closest. There’s no wrong door — and you can
              always tell us in your own words.
            </p>
          </header>

          <ul class="unh-habit-grid" role="list">
            <li v-for="card in habitCards" :key="card.name">
              <button
                type="button"
                class="unh-habit"
                :aria-label="`Start with ${card.name}`"
                @click="beginWithHabit(card.name)"
              >
                <span class="unh-habit-tag">{{ card.code }}</span>
                <span class="unh-habit-name font-display">{{ card.name }}</span>
                <span class="unh-habit-desc">{{ card.description }}</span>
                <span class="unh-habit-go">
                  Begin here <em class="unh-arrow" aria-hidden="true">→</em>
                </span>
              </button>
            </li>
            <li>
              <button
                type="button"
                class="unh-habit unh-habit--custom"
                aria-label="Describe a different habit in your own words"
                @click="beginCustom"
              >
                <span class="unh-habit-tag">YOUR WORDS</span>
                <span class="unh-habit-name font-display">Something else</span>
                <span class="unh-habit-desc">Not on the list? Tell us in your own words and we’ll build the plan around it.</span>
                <span class="unh-habit-go">
                  Describe it <em class="unh-arrow" aria-hidden="true">→</em>
                </span>
              </button>
            </li>
          </ul>
        </section>

        <!-- HOW IT WORKS / TRUST — warm, not boxy -->
        <section class="unh-trust" aria-labelledby="unh-trust-title">
          <header class="unh-trust-head">
            <p class="unh-kicker">
              <span class="unh-kicker-dot" aria-hidden="true"></span>
              How Unhook walks with you
            </p>
            <h2 id="unh-trust-title" class="unh-trust-title font-display">
              Honest questions first. A real plan next. Support that stays.
            </h2>
          </header>

          <ol class="unh-steps" role="list">
            <li v-for="(row, i) in outcomeRows" :key="row.label" class="unh-step">
              <span class="unh-step-num" aria-hidden="true">{{ i + 1 }}</span>
              <span class="unh-step-value font-display">{{ row.value }}</span>
              <span class="unh-step-label">{{ row.label }}</span>
              <span class="unh-step-detail">{{ row.detail }}</span>
            </li>
          </ol>

          <p class="unh-trust-foot">
            <span class="unh-live unh-live--calm" aria-hidden="true"></span>
            Your answers stay on your device. Sign in only if you’d like your plan to
            follow you across screens.
          </p>
        </section>
      </div>
    </template>

    <!-- ============ ONBOARDING WIZARD ============ -->
    <template v-else-if="phase === 'wizard'">
      <div class="unh-wiz">
        <div class="unh-wiz-grid">
        <div class="unh-wiz-main">
        <!-- brand + progress -->
        <header class="unh-wiz-head">
          <div class="unh-wiz-topline">
            <p class="unh-brand font-display">Un<span>hook</span></p>
            <p class="unh-stepcount" aria-hidden="true">
              Step {{ stepIndex + 1 }} <span>/ {{ steps.length }}</span>
            </p>
          </div>
          <div
            class="unh-progress"
            role="progressbar"
            :aria-valuenow="progress"
            aria-valuemin="0"
            aria-valuemax="100"
            :aria-label="`Intake progress: ${progress}%`"
          >
            <span
              v-for="(s, i) in steps"
              :key="s.key"
              class="unh-progress-seg"
              :data-done="i <= stepIndex"
              aria-hidden="true"
            />
          </div>
          <p class="unh-progress-caption">{{ stepLabels[stepIndex] }}</p>
        </header>

        <!-- question card -->
        <section :key="current.key" class="unh-card">
          <span class="unh-card-glow" aria-hidden="true"></span>
          <p class="unh-q-kicker">{{ current.kicker }}</p>
          <h1 class="unh-q-title font-display">{{ current.title }}</h1>
          <p class="unh-q-hint">{{ current.hint }}</p>

          <div class="unh-controls">
          <!-- STEP: habit -->
          <fieldset v-if="current.key === 'habit'">
            <legend class="sr-only">Which habit do you want to break?</legend>
            <div class="flex flex-wrap gap-2.5">
              <button
                v-for="c in habitChips"
                :key="c"
                type="button"
                class="chip px-4 py-2 text-sm font-medium"
                :data-on="habitChoice === c"
                :aria-pressed="habitChoice === c"
                @click="pickHabit(c)"
              >{{ c }}</button>
            </div>
            <label v-if="habitChoice === 'Other'" class="mt-4 block">
              <span class="sr-only">Describe your habit</span>
              <div class="unh-field-wrap">
                <input
                  v-model="habitOther"
                  type="text"
                  autofocus
                  placeholder="e.g. late-night online shopping"
                  class="field px-4 py-3 text-sm"
                  :class="voice.supported ? 'pr-14' : ''"
                  @keyup.enter="next"
                />
                <button
                  v-if="voice.supported"
                  type="button"
                  class="unh-mic"
                  :class="{ 'is-live': voice.activeKey === 'habitOther' }"
                  :aria-pressed="voice.activeKey === 'habitOther'"
                  :aria-label="voice.activeKey === 'habitOther' ? 'Stop voice input' : 'Speak your answer'"
                  @click="toggleVoice('habitOther')"
                >
                  <span class="unh-mic-ring" aria-hidden="true"></span>
                  <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><line x1="12" y1="18" x2="12" y2="21"/></svg>
                </button>
              </div>
              <p v-if="voice.activeKey === 'habitOther'" class="unh-mic-hint">
                <span class="unh-mic-wave" aria-hidden="true"><i></i><i></i><i></i></span> Listening… speak now
              </p>
            </label>
          </fieldset>

          <!-- STEP: frequency -->
          <fieldset v-else-if="current.key === 'frequency'">
            <legend class="sr-only">How often does it happen?</legend>
            <div class="flex flex-col gap-2.5">
              <button
                v-for="c in frequencyChips"
                :key="c"
                type="button"
                class="chip px-4 py-3 text-left text-sm font-medium"
                :data-on="frequency === c"
                :aria-pressed="frequency === c"
                @click="frequency = c; error = ''"
              >{{ c }}</button>
            </div>
          </fieldset>

          <!-- STEP: trigger -->
          <fieldset v-else-if="current.key === 'trigger'">
            <legend class="sr-only">What triggers the urge?</legend>
            <div class="flex flex-wrap gap-2.5">
              <button
                v-for="c in triggerChips"
                :key="c"
                type="button"
                class="chip px-4 py-2 text-sm font-medium"
                :data-on="triggerChoice === c"
                :aria-pressed="triggerChoice === c"
                @click="triggerChoice = c; error = ''"
              >{{ c }}</button>
            </div>
            <label class="mt-4 block">
              <span class="text-sm text-[var(--muted)]">Anything more you’d add? (optional)</span>
              <div class="unh-field-wrap mt-2">
                <input
                  v-model="triggerNote"
                  type="text"
                  placeholder="e.g. right after a stressful call"
                  class="field px-4 py-3 text-sm"
                  :class="voice.supported ? 'pr-14' : ''"
                  @keyup.enter="next"
                />
                <button
                  v-if="voice.supported"
                  type="button"
                  class="unh-mic"
                  :class="{ 'is-live': voice.activeKey === 'triggerNote' }"
                  :aria-pressed="voice.activeKey === 'triggerNote'"
                  :aria-label="voice.activeKey === 'triggerNote' ? 'Stop voice input' : 'Speak your answer'"
                  @click="toggleVoice('triggerNote')"
                >
                  <span class="unh-mic-ring" aria-hidden="true"></span>
                  <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><line x1="12" y1="18" x2="12" y2="21"/></svg>
                </button>
              </div>
              <p v-if="voice.activeKey === 'triggerNote'" class="unh-mic-hint">
                <span class="unh-mic-wave" aria-hidden="true"><i></i><i></i><i></i></span> Listening… speak now
              </p>
            </label>
          </fieldset>

          <!-- STEP: duration -->
          <fieldset v-else-if="current.key === 'duration'">
            <legend class="sr-only">How long have you had this habit?</legend>
            <div class="flex flex-col gap-2.5">
              <button
                v-for="c in durationChips"
                :key="c"
                type="button"
                class="chip px-4 py-3 text-left text-sm font-medium"
                :data-on="duration === c"
                :aria-pressed="duration === c"
                @click="duration = c; error = ''"
              >{{ c }}</button>
            </div>
          </fieldset>

          <!-- STEP: why -->
          <div v-else-if="current.key === 'why'">
            <label>
              <span class="sr-only">Why do you want to change?</span>
              <div class="unh-field-wrap">
                <textarea
                  v-model="why"
                  rows="4"
                  autofocus
                  placeholder="e.g. I want to sleep better, be present with the people I love, and feel like myself again."
                  class="field resize-none px-4 py-3.5 text-sm leading-relaxed"
                  :class="voice.supported ? 'pb-12' : ''"
                  @input="error = ''"
                />
                <button
                  v-if="voice.supported"
                  type="button"
                  class="unh-mic unh-mic--textarea"
                  :class="{ 'is-live': voice.activeKey === 'why' }"
                  :aria-pressed="voice.activeKey === 'why'"
                  :aria-label="voice.activeKey === 'why' ? 'Stop voice input' : 'Speak your answer'"
                  @click="toggleVoice('why')"
                >
                  <span class="unh-mic-ring" aria-hidden="true"></span>
                  <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><line x1="12" y1="18" x2="12" y2="21"/></svg>
                </button>
              </div>
            </label>
            <p v-if="voice.activeKey === 'why'" class="unh-mic-hint">
              <span class="unh-mic-wave" aria-hidden="true"><i></i><i></i><i></i></span> Listening… tell me in your own words
            </p>
          </div>

          <!-- STEP: readiness -->
          <div v-else-if="current.key === 'readiness'" class="unh-readiness">
            <div class="flex items-end justify-between">
              <span class="font-display text-5xl font-semibold text-[var(--accent)]">{{ readiness }}</span>
              <span class="pb-1 text-sm text-[var(--muted)]">out of 10</span>
            </div>
            <p class="mt-2 text-sm text-[var(--ink)]">{{ readinessLabel }}</p>
            <input
              v-model.number="readiness"
              type="range"
              min="1"
              max="10"
              step="1"
              aria-label="How ready you feel, from 1 to 10"
              class="intake-range mt-5 w-full"
            />
            <div class="mt-2 flex justify-between text-xs text-[var(--muted)]">
              <span>Unsure</span>
              <span>All in</span>
            </div>
          </div>
        </div>

          <!-- inline validation -->
          <p v-if="error" class="unh-error" role="alert">{{ error }}</p>
        </section>

        <!-- nav -->
        <div class="unh-nav">
          <button
            v-if="stepIndex > 0"
            type="button"
            class="btn btn-ghost unh-nav-back"
            @click="back"
          >Back</button>
          <button
            v-else
            type="button"
            class="btn btn-ghost unh-nav-back"
            @click="phase = 'home'"
          >Home</button>
          <button
            type="button"
            class="btn btn-primary unh-nav-next"
            @click="next"
          >
            {{ isLast ? 'Build my plan' : 'Continue' }}
          </button>
        </div>

        <!-- reminders: shown inline on mobile; the rail replaces them on desktop -->
        <section class="unh-remind unh-remind--mobile" aria-label="Gentle reminders">
          <p class="unh-remind-head">
            <span class="unh-live unh-live--calm" aria-hidden="true"></span>
            A few gentle reminders while you go
          </p>
          <ul class="unh-remind-grid" role="list">
            <li v-for="f in facts" :key="f.title" class="unh-fact">
              <span class="unh-fact-icon" aria-hidden="true">{{ f.icon }}</span>
              <strong class="unh-fact-title">{{ f.title }}</strong>
              <span class="unh-fact-body">{{ f.body }}</span>
            </li>
          </ul>
        </section>
        </div><!-- /.unh-wiz-main -->

        <!-- Desktop side rail: live intake summary + a contextual reminder. -->
        <aside class="unh-wiz-rail" aria-label="Your intake so far">
          <div class="unh-rail-card">
            <p class="unh-rail-head">
              <span class="unh-live unh-live--calm" aria-hidden="true"></span> Your intake
            </p>
            <ul class="unh-rail-list" role="list">
              <li
                v-for="(row, i) in summaryRows"
                :key="row.label"
                class="unh-rail-row"
                :data-filled="!!row.value"
                :data-active="i === stepIndex"
              >
                <span class="unh-rail-check" aria-hidden="true"></span>
                <span class="unh-rail-label">{{ row.label }}</span>
                <span class="unh-rail-value">{{ row.value || '—' }}</span>
              </li>
            </ul>
          </div>
          <div class="unh-rail-fact">
            <span class="unh-fact-icon" aria-hidden="true">{{ facts[stepIndex].icon }}</span>
            <strong class="unh-fact-title">{{ facts[stepIndex].title }}</strong>
            <span class="unh-fact-body">{{ facts[stepIndex].body }}</span>
          </div>
        </aside>
        </div><!-- /.unh-wiz-grid -->
      </div>
    </template>

    <!-- ============ GENERATING ============ -->
    <section
      v-else-if="phase === 'generating'"
      class="flex min-h-[70vh] flex-col items-center justify-center text-center"
      aria-live="polite"
    >
      <div class="breather" aria-hidden="true">
        <span class="breather-core" />
      </div>
      <h2 class="mt-10 font-display text-2xl font-semibold">Shaping your plan…</h2>
      <p class="mt-2 max-w-xs text-sm text-[var(--muted)]">
        Taking everything you shared and turning it into gentle, doable steps. One breath.
      </p>
    </section>

    <!-- ============ ERROR ============ -->
    <section
      v-else-if="phase === 'error'"
      class="flex min-h-[70vh] flex-col items-center justify-center text-center"
      aria-live="assertive"
    >
      <div class="card max-w-sm p-7">
        <div class="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[rgba(224,120,90,0.14)] text-2xl">
          🌱
        </div>
        <h2 class="mt-4 font-display text-2xl font-semibold">A small hiccup</h2>
        <p class="mt-2 text-sm text-[var(--muted)]">{{ error }}</p>
        <div class="mt-6 flex flex-col gap-2.5">
          <button type="button" class="btn btn-primary px-5 py-3 text-sm font-semibold" @click="finish">
            Try again
          </button>
          <button type="button" class="btn btn-ghost px-5 py-3 text-sm" @click="phase = 'wizard'">
            Review my answers
          </button>
        </div>
      </div>
    </section>
  </main>
</template>

<style scoped>
/* Calm branded breathing loader (respects reduced motion via the global rule). */
.breather {
  display: grid;
  place-items: center;
  width: 132px;
  height: 132px;
  border-radius: 999px;
  background: radial-gradient(circle, rgba(224, 120, 90, 0.22), transparent 68%);
  animation: breathe 4.4s ease-in-out infinite;
}
.breather-core {
  width: 58px;
  height: 58px;
  border-radius: 999px;
  background: var(--accent);
  box-shadow: 0 0 44px rgba(224, 120, 90, 0.55);
}

/* Terracotta range slider, cross-browser. */
.intake-range {
  -webkit-appearance: none;
  appearance: none;
  height: 6px;
  border-radius: 999px;
  background: rgba(240, 236, 225, 0.1);
  outline: none;
}
.intake-range::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 26px;
  height: 26px;
  border-radius: 999px;
  background: var(--accent);
  border: 3px solid var(--panel);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
  cursor: pointer;
}
.intake-range::-moz-range-thumb {
  width: 26px;
  height: 26px;
  border-radius: 999px;
  background: var(--accent);
  border: 3px solid var(--panel);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
  cursor: pointer;
}
.intake-range:focus-visible {
  box-shadow: 0 0 0 3px rgba(224, 120, 90, 0.28);
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* ============================================================================
   HOME + WIZARD REDESIGN — "Nightfall, starting over".
   Warm, editorial, cinematic. Fully scoped and self-contained: own namespaced
   @keyframes animate the `translate` property so entrances compose with the
   design system's transform-based hovers instead of fighting them. Every colour
   is a design token. Respects prefers-reduced-motion at the very bottom.
   ============================================================================ */

/* ---- Shared atmosphere: warm glows + a whisper of film grain ------------- */
.unh-home,
.unh-wiz {
  position: relative;
  isolation: isolate;
  max-width: 74rem;
  margin: 0 auto;
  padding-inline: clamp(0.25rem, 2vw, 1rem);
}
.unh-home::before,
.unh-wiz::before {
  content: "";
  position: absolute; inset: -8% -18% auto -18%; height: 640px;
  z-index: -2; pointer-events: none;
  background:
    radial-gradient(680px 380px at 20% 6%, rgba(224, 120, 90, 0.17), transparent 62%),
    radial-gradient(560px 420px at 90% 0%, rgba(95, 178, 127, 0.12), transparent 60%),
    radial-gradient(460px 320px at 58% 42%, rgba(226, 161, 58, 0.07), transparent 66%);
}
.unh-home::after,
.unh-wiz::after {
  content: "";
  position: absolute; inset: 0; z-index: -1; pointer-events: none;
  opacity: 0.045; mix-blend-mode: soft-light;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  background-size: 180px 180px;
}

/* ---- Kicker / eyebrow --------------------------------------------------- */
.unh-kicker {
  display: inline-flex; align-items: center; gap: 0.55rem;
  margin: 0;
  font-size: 0.72rem; font-weight: 600;
  letter-spacing: 0.22em; text-transform: uppercase;
  color: var(--accent);
}
.unh-kicker--green { color: var(--accent-2); }
.unh-kicker-dot {
  width: 6px; height: 6px; border-radius: 999px; flex: none;
  background: currentColor;
  box-shadow: 0 0 0 4px color-mix(in srgb, currentColor 18%, transparent);
}

/* ---- Living dot --------------------------------------------------------- */
.unh-live {
  width: 7px; height: 7px; border-radius: 999px; flex: none;
  background: var(--accent-2);
  box-shadow: 0 0 0 0 rgba(95, 178, 127, 0.5);
  animation: unh-pulse 2.6s ease-out infinite;
}
.unh-live--calm {
  background: var(--accent);
  box-shadow: 0 0 10px rgba(224, 120, 90, 0.55);
  animation: none;
}

/* =============================== HERO ==================================== */
.unh-hero {
  display: grid;
  grid-template-columns: 1fr;
  gap: clamp(2rem, 5vw, 3.5rem);
  padding-top: clamp(1.25rem, 5vw, 3.25rem);
  padding-bottom: clamp(2rem, 6vw, 4.5rem);
}
/* Two columns once there's room — copy left, companion preview right. */
@media (min-width: 940px) {
  .unh-hero {
    grid-template-columns: minmax(0, 1.1fr) minmax(0, 0.9fr);
    align-items: center;
    gap: clamp(2.5rem, 5vw, 5rem);
  }
}
.unh-hero-copy { max-width: 46rem; }
.unh-hero-copy > * { animation: unh-rise 0.66s var(--ease) both; }
.unh-hero-copy > *:nth-child(1) { animation-delay: 0.05s; }
.unh-hero-copy > *:nth-child(2) { animation-delay: 0.12s; }
.unh-hero-copy > *:nth-child(3) { animation-delay: 0.19s; }
.unh-hero-copy > *:nth-child(4) { animation-delay: 0.26s; }
.unh-hero-copy > *:nth-child(5) { animation-delay: 0.33s; }
.unh-hero-copy > *:nth-child(6) { animation-delay: 0.40s; }

.unh-title {
  margin: 1.1rem 0 0;
  font-weight: 600;
  font-size: clamp(2.55rem, 7vw, 4.7rem);
  line-height: 0.98;
  letter-spacing: -0.02em;
  color: var(--ink);
  text-wrap: balance;
}
.unh-title-accent { color: var(--accent); font-style: italic; }

.unh-lede {
  margin: 1.4rem 0 0;
  max-width: 35rem;
  font-size: clamp(1.02rem, 1.4vw, 1.18rem);
  line-height: 1.7;
  color: var(--muted);
}

.unh-cta-row { margin-top: 2rem; display: flex; flex-wrap: wrap; gap: 0.8rem; }
.unh-cta { padding: 0.95rem 1.75rem; font-size: 0.92rem; }
.unh-cta-ghost { padding: 0.95rem 1.5rem; font-size: 0.92rem; }

/* Primary CTA: depth glow + a slow, premium shine sweep. */
.unh-home .btn-primary,
.unh-wiz .btn-primary {
  position: relative; overflow: hidden;
  box-shadow: 0 16px 38px -16px rgba(224, 120, 90, 0.72);
}
.unh-home .btn-primary::after,
.unh-wiz .btn-primary::after {
  content: ""; position: absolute; top: 0; left: -75%;
  width: 45%; height: 100%;
  background: linear-gradient(100deg, transparent, rgba(255, 255, 255, 0.26), transparent);
  transform: skewX(-18deg);
  animation: unh-shine 5.2s ease-in-out infinite;
  pointer-events: none;
}

.unh-reassure {
  margin: 1.3rem 0 0;
  display: flex; align-items: center; gap: 0.6rem;
  font-size: 0.82rem; color: var(--muted);
}

/* Hero stats: editorial, hairline-led — no boxes. */
.unh-stats {
  margin: 2.5rem 0 0;
  display: flex; flex-wrap: wrap; gap: 1.4rem 2.2rem;
}
.unh-stat { position: relative; padding-left: 1.3rem; }
.unh-stat::before {
  content: ""; position: absolute; left: 0; top: 3px; bottom: 3px;
  width: 2px; border-radius: 2px;
  background: linear-gradient(var(--accent), transparent);
  opacity: 0.75;
}
.unh-stat-value { font-size: 2rem; font-weight: 600; line-height: 1; color: var(--ink); }
.unh-stat-label {
  margin: 0.4rem 0 0;
  font-size: 0.72rem; letter-spacing: 0.14em; text-transform: uppercase;
  color: var(--muted);
}

/* ===================== HERO COMPANION PREVIEW ========================== */
/* A glimpse of the nightly support — fills the right column with warmth
   instead of empty space. Decorative (aria-hidden); hidden on small screens
   where the copy already fills the viewport. */
.unh-hero-aside {
  display: none;
  justify-self: end;
  width: 100%;
  animation: unh-rise 0.7s var(--ease) both;
  animation-delay: 0.3s;
}
@media (min-width: 940px) { .unh-hero-aside { display: block; } }

.unh-preview {
  position: relative;
  isolation: isolate;
  max-width: 30rem;
  margin-left: auto;
  padding: 1.5rem 1.5rem 1.35rem;
  border: 1px solid var(--hair);
  border-radius: var(--radius);
  background:
    radial-gradient(120% 90% at 90% 0%, rgba(224, 120, 90, 0.1), transparent 55%),
    linear-gradient(180deg, rgba(240, 236, 225, 0.03), transparent 40%),
    var(--panel);
  box-shadow: var(--shadow-lg);
  transform: rotate(1.1deg);
  transition: transform 0.5s var(--ease);
}
.unh-preview:hover { transform: rotate(0deg) translateY(-3px); }
/* Soft outer halo. */
.unh-preview::before {
  content: ""; position: absolute; inset: -1px; z-index: -1;
  border-radius: inherit; pointer-events: none;
  background: linear-gradient(150deg, rgba(224, 120, 90, 0.35), transparent 45%);
  opacity: 0.4; filter: blur(14px);
}

.unh-preview-head {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 1.05rem;
}
.unh-preview-when {
  font-size: 0.68rem; font-weight: 600;
  letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted);
}
.unh-preview-brand {
  display: inline-flex; align-items: center; gap: 0.4rem;
  font-size: 0.72rem; font-weight: 600; color: var(--ink);
}

.unh-preview-msg {
  margin: 0;
  padding: 0.95rem 1.05rem;
  border-radius: 4px 16px 16px 16px;
  background: color-mix(in srgb, var(--accent) 15%, var(--panel-2));
  border: 1px solid color-mix(in srgb, var(--accent) 22%, transparent);
  font-size: 0.92rem; line-height: 1.55; color: var(--ink);
}

.unh-preview-actions {
  display: flex; flex-wrap: wrap; gap: 0.5rem;
  margin-top: 0.85rem;
}
.unh-preview-chip {
  padding: 0.5rem 0.85rem;
  border: 1px solid var(--hair); border-radius: 999px;
  background: rgba(240, 236, 225, 0.04);
  font-size: 0.78rem; font-weight: 500; color: var(--muted);
}
.unh-preview-chip--accent {
  border-color: color-mix(in srgb, var(--accent) 45%, transparent);
  background: rgba(224, 120, 90, 0.14);
  color: var(--accent);
}

.unh-preview-foot {
  display: flex; align-items: center; justify-content: space-between;
  gap: 1rem;
  margin-top: 1.35rem; padding-top: 1.15rem;
  border-top: 1px solid var(--hair);
}
.unh-preview-streak { display: flex; align-items: center; gap: 0.6rem; }
.unh-preview-streak-num {
  font-size: 2.4rem; font-weight: 600; line-height: 0.9;
  color: var(--accent-2);
}
.unh-preview-streak-label {
  font-size: 0.66rem; font-weight: 600; line-height: 1.25;
  letter-spacing: 0.1em; text-transform: uppercase; color: var(--muted);
}
/* A calm "craving wave" equaliser — rises and settles like an urge passing. */
.unh-preview-wave { display: flex; align-items: flex-end; gap: 4px; height: 34px; }
.unh-preview-wave span {
  width: 5px; border-radius: 999px;
  background: linear-gradient(var(--accent), var(--accent-2));
  opacity: 0.85;
  animation: unh-wave 2.6s ease-in-out infinite;
}
.unh-preview-wave span:nth-child(1) { height: 40%; animation-delay: 0s;    }
.unh-preview-wave span:nth-child(2) { height: 65%; animation-delay: 0.12s; }
.unh-preview-wave span:nth-child(3) { height: 90%; animation-delay: 0.24s; }
.unh-preview-wave span:nth-child(4) { height: 100%; animation-delay: 0.36s; }
.unh-preview-wave span:nth-child(5) { height: 78%; animation-delay: 0.48s; }
.unh-preview-wave span:nth-child(6) { height: 52%; animation-delay: 0.60s; }
.unh-preview-wave span:nth-child(7) { height: 34%; animation-delay: 0.72s; }
.unh-preview-wave span:nth-child(8) { height: 22%; animation-delay: 0.84s; }
@keyframes unh-wave {
  0%, 100% { transform: scaleY(0.7); opacity: 0.55; }
  50%      { transform: scaleY(1);   opacity: 0.95; }
}

/* =========================== HABIT CHOOSER ============================== */
.unh-choose { padding-top: clamp(1.5rem, 4vw, 3rem); scroll-margin-top: 5rem; }
.unh-choose-head { max-width: 40rem; }
.unh-choose-head > * { animation: unh-rise 0.6s var(--ease) both; }
.unh-choose-title {
  margin: 0.9rem 0 0;
  font-size: clamp(1.9rem, 4vw, 3rem);
  line-height: 1.05; letter-spacing: -0.015em;
  color: var(--ink); text-wrap: balance;
}
.unh-choose-sub {
  margin: 0.9rem 0 0; max-width: 36rem;
  font-size: 1rem; line-height: 1.6; color: var(--muted);
}

.unh-habit-grid {
  margin: 2rem 0 0; padding: 0; list-style: none;
  display: grid; gap: 0.9rem; grid-template-columns: 1fr;
}
@media (min-width: 640px)  { .unh-habit-grid { grid-template-columns: repeat(2, 1fr); } }
@media (min-width: 1024px) { .unh-habit-grid { grid-template-columns: repeat(3, 1fr); } }

.unh-habit-grid > li { animation: unh-rise 0.55s var(--ease) both; height: 100%; }
.unh-habit-grid > li:nth-child(1) { animation-delay: 0.06s; }
.unh-habit-grid > li:nth-child(2) { animation-delay: 0.12s; }
.unh-habit-grid > li:nth-child(3) { animation-delay: 0.18s; }
.unh-habit-grid > li:nth-child(4) { animation-delay: 0.24s; }
.unh-habit-grid > li:nth-child(5) { animation-delay: 0.30s; }
.unh-habit-grid > li:nth-child(6) { animation-delay: 0.36s; }
.unh-habit-grid > li:nth-child(7) { animation-delay: 0.42s; }

/* Per-card warmth: cycle accent / green / amber for the tag + corner glow. */
.unh-habit-grid > li:nth-child(3n+1) .unh-habit { --tag: var(--accent);   --glow: rgba(224, 120, 90, 0.55); }
.unh-habit-grid > li:nth-child(3n+2) .unh-habit { --tag: var(--accent-2); --glow: rgba(95, 178, 127, 0.50); }
.unh-habit-grid > li:nth-child(3n+3) .unh-habit { --tag: var(--amber);    --glow: rgba(226, 161, 58, 0.50); }

.unh-habit {
  position: relative; overflow: hidden;
  display: flex; flex-direction: column;
  width: 100%; height: 100%;
  text-align: left;
  padding: 1.4rem 1.4rem 1.3rem;
  border: 1px solid var(--hair);
  border-radius: var(--radius);
  background:
    linear-gradient(180deg, rgba(240, 236, 225, 0.025), transparent 42%),
    var(--panel);
  color: var(--ink);
  transition: transform 0.3s var(--ease), border-color 0.3s var(--ease),
              box-shadow 0.3s var(--ease), background-color 0.3s var(--ease);
}
/* Soft corner glow (cinematic depth). */
.unh-habit::before {
  content: ""; position: absolute; right: -34px; top: -34px;
  width: 128px; height: 128px; border-radius: 999px;
  background: radial-gradient(circle, var(--glow, rgba(224, 120, 90, 0.5)), transparent 70%);
  opacity: 0.12; filter: blur(4px); pointer-events: none;
  transition: opacity 0.35s var(--ease), transform 0.35s var(--ease);
}
/* Top hairline accent that draws in on hover/focus. */
.unh-habit::after {
  content: ""; position: absolute; left: 1.4rem; right: 1.4rem; top: 0; height: 2px;
  background: linear-gradient(90deg, var(--tag, var(--accent)), transparent);
  transform: scaleX(0); transform-origin: left; opacity: 0;
  transition: transform 0.4s var(--ease), opacity 0.4s var(--ease);
}
.unh-habit:hover {
  transform: translateY(-4px);
  border-color: color-mix(in srgb, var(--tag, var(--accent)) 48%, var(--hair));
  box-shadow: var(--shadow-lg, 0 26px 50px -26px rgba(0, 0, 0, 0.82));
}
.unh-habit:hover::before { opacity: 0.3; transform: scale(1.15); }
.unh-habit:hover::after,
.unh-habit:focus-visible::after { transform: scaleX(1); opacity: 0.9; }
.unh-habit:focus-visible {
  outline: none;
  border-color: var(--tag, var(--accent));
  box-shadow: 0 0 0 2px var(--bg), 0 0 0 4px color-mix(in srgb, var(--tag, var(--accent)) 55%, transparent);
}
.unh-habit-tag {
  font-size: 0.66rem; font-weight: 700;
  letter-spacing: 0.2em; text-transform: uppercase;
  color: var(--tag, var(--accent));
}
.unh-habit-name {
  margin: 0.7rem 0 0;
  font-size: 1.5rem; font-weight: 600; line-height: 1.1; color: var(--ink);
}
.unh-habit-desc {
  margin: 0.35rem 0 0;
  font-size: 0.88rem; line-height: 1.55; color: var(--muted);
}
.unh-habit-go {
  margin-top: auto; padding-top: 1.1rem;
  display: inline-flex; align-items: center; gap: 0.4rem;
  font-size: 0.7rem; font-weight: 700;
  letter-spacing: 0.14em; text-transform: uppercase; color: var(--ink);
}
.unh-arrow { font-style: normal; transition: translate 0.25s var(--ease); }
.unh-habit:hover .unh-arrow,
.unh-habit:focus-visible .unh-arrow { translate: 4px 0; }

/* "Something else" card: a distinct, inviting dashed panel. */
.unh-habit--custom {
  background: var(--panel-2);
  border-style: dashed;
  border-color: color-mix(in srgb, var(--muted) 30%, var(--hair));
}
.unh-habit-grid > li:last-child .unh-habit { --tag: var(--muted); --glow: rgba(154, 163, 147, 0.4); }

/* ========================= HOW IT WORKS / TRUST ========================= */
.unh-trust {
  padding-top: clamp(2.5rem, 6vw, 4.5rem);
  padding-bottom: clamp(1rem, 3vw, 2rem);
}
.unh-trust-head { max-width: 44rem; }
.unh-trust-title {
  margin: 0.9rem 0 0;
  font-size: clamp(1.7rem, 3.4vw, 2.6rem);
  line-height: 1.12; letter-spacing: -0.01em;
  color: var(--ink); text-wrap: balance;
}
.unh-steps {
  margin: 2.2rem 0 0; padding: 0; list-style: none;
  display: grid; gap: 1rem; grid-template-columns: 1fr;
}
@media (min-width: 768px) { .unh-steps { grid-template-columns: repeat(3, 1fr); } }
.unh-step {
  position: relative;
  display: flex; flex-direction: column;
  padding: 1.5rem 1.4rem;
  border: 1px solid var(--hair);
  border-radius: var(--radius);
  background: linear-gradient(180deg, rgba(240, 236, 225, 0.015), transparent), var(--panel);
  transition: border-color 0.3s var(--ease), transform 0.3s var(--ease);
}
.unh-step:hover {
  border-color: color-mix(in srgb, var(--accent) 35%, var(--hair));
  transform: translateY(-3px);
}
.unh-step-num {
  position: absolute; top: 1.2rem; right: 1.3rem;
  width: 26px; height: 26px; border-radius: 999px;
  display: grid; place-items: center;
  font-size: 0.72rem; font-weight: 700;
  color: var(--accent); background: rgba(224, 120, 90, 0.12);
}
.unh-step-value { font-size: 2rem; font-weight: 600; line-height: 1; color: var(--accent); }
.unh-step-label {
  margin: 0.55rem 0 0;
  font-size: 0.72rem; letter-spacing: 0.14em; text-transform: uppercase; color: var(--muted);
}
.unh-step-detail {
  margin: 0.25rem 0 0;
  font-size: 0.9rem; line-height: 1.55; color: var(--ink); opacity: 0.86;
}
.unh-trust-foot {
  margin: 1.6rem 0 0; max-width: 42rem;
  display: flex; align-items: center; gap: 0.6rem;
  font-size: 0.85rem; line-height: 1.5; color: var(--muted);
}

/* =============================== WIZARD ================================= */
/* Wizard: single column on mobile, question flow + side rail on desktop. */
.unh-wiz { max-width: 82rem; }
.unh-wiz-grid {
  max-width: 44rem;
  margin: 0 auto;
  padding-top: clamp(0.5rem, 3vw, 1.5rem);
}
@media (min-width: 1024px) {
  .unh-wiz-grid {
    max-width: none;
    display: grid;
    grid-template-columns: minmax(0, 1.55fr) minmax(0, 1fr);
    align-items: start;
    gap: clamp(2rem, 3.5vw, 3.25rem);
  }
}
.unh-wiz-main { min-width: 0; }

/* Side rail — sticky, holds the live summary + a contextual reminder. */
.unh-wiz-rail { display: none; }
@media (min-width: 1024px) {
  .unh-wiz-rail {
    display: flex; flex-direction: column; gap: 1rem;
    position: sticky; top: 5.5rem;
    animation: unh-rise 0.6s var(--ease) both; animation-delay: 0.12s;
  }
}
.unh-rail-card {
  padding: 1.25rem 1.3rem;
  border: 1px solid var(--hair); border-radius: var(--radius);
  background: linear-gradient(180deg, rgba(240, 236, 225, 0.02), transparent), var(--panel);
}
.unh-rail-head {
  display: flex; align-items: center; gap: 0.5rem; margin: 0 0 0.9rem;
  font-size: 0.72rem; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; color: var(--muted);
}
.unh-rail-list { margin: 0; padding: 0; list-style: none; }
.unh-rail-row {
  display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 0.6rem;
  padding: 0.6rem 0; border-top: 1px solid var(--hair);
}
.unh-rail-row:first-child { border-top: 0; }
.unh-rail-check {
  position: relative; width: 15px; height: 15px; flex: none;
  border: 1.5px solid var(--hair); border-radius: 999px; background: transparent;
  transition: background-color .3s var(--ease), border-color .3s var(--ease), box-shadow .3s var(--ease);
}
.unh-rail-row[data-filled="true"] .unh-rail-check { background: var(--accent-2); border-color: var(--accent-2); }
.unh-rail-row[data-filled="true"] .unh-rail-check::after {
  content: ""; position: absolute; left: 4px; top: 1px; width: 4px; height: 8px;
  border: solid var(--panel); border-width: 0 2px 2px 0; transform: rotate(45deg);
}
.unh-rail-row[data-active="true"] .unh-rail-check { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(224, 120, 90, 0.16); }
.unh-rail-label { font-size: 0.82rem; color: var(--muted); white-space: nowrap; }
.unh-rail-row[data-filled="true"] .unh-rail-label { color: var(--ink); }
.unh-rail-value {
  font-size: 0.82rem; color: var(--ink); text-align: right;
  max-width: 11rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.unh-rail-row:not([data-filled="true"]) .unh-rail-value { color: var(--muted); opacity: 0.55; }
.unh-rail-fact {
  display: flex; flex-direction: column;
  padding: 1.2rem 1.3rem;
  border: 1px solid var(--hair); border-radius: var(--radius);
  background: linear-gradient(180deg, rgba(95, 178, 127, 0.05), transparent 60%), var(--panel);
}

/* Reminders show inline on mobile only; the rail covers desktop. */
@media (min-width: 1024px) { .unh-remind--mobile { display: none; } }

/* ---------------------------- Voice input ------------------------------ */
.unh-field-wrap { position: relative; }
.unh-mic {
  position: absolute; top: 50%; right: 8px; transform: translateY(-50%);
  display: grid; place-items: center;
  width: 38px; height: 38px; border-radius: 999px;
  border: 1px solid var(--hair); background: rgba(240, 236, 225, 0.05);
  color: var(--muted);
  transition: color .2s var(--ease), border-color .2s var(--ease), background-color .2s var(--ease);
}
.unh-mic--textarea { top: auto; bottom: 10px; transform: none; }
.unh-mic:hover { color: var(--accent); border-color: color-mix(in srgb, var(--accent) 45%, var(--hair)); }
.unh-mic:focus-visible { outline: none; box-shadow: 0 0 0 2px var(--bg), 0 0 0 4px rgba(224, 120, 90, 0.55); }
.unh-mic svg { position: relative; z-index: 1; }
.unh-mic-ring { position: absolute; inset: -2px; border-radius: 999px; pointer-events: none; opacity: 0; }
.unh-mic.is-live { color: #fff; background: var(--accent); border-color: var(--accent); }
.unh-mic.is-live .unh-mic-ring {
  opacity: 1; box-shadow: 0 0 0 0 rgba(224, 120, 90, 0.5);
  animation: unh-mic-pulse 1.6s ease-out infinite;
}
@keyframes unh-mic-pulse {
  0%   { box-shadow: 0 0 0 0 rgba(224, 120, 90, 0.5); }
  70%  { box-shadow: 0 0 0 10px rgba(224, 120, 90, 0); }
  100% { box-shadow: 0 0 0 0 rgba(224, 120, 90, 0); }
}
.unh-mic-hint {
  display: flex; align-items: center; gap: 0.5rem;
  margin: 0.6rem 0 0; font-size: 0.8rem; color: var(--accent);
}
.unh-mic-wave { display: inline-flex; align-items: flex-end; gap: 2px; height: 12px; }
.unh-mic-wave i { width: 3px; border-radius: 2px; background: currentColor; animation: unh-mic-eq 0.9s ease-in-out infinite; }
.unh-mic-wave i:nth-child(1) { height: 40%; animation-delay: 0s; }
.unh-mic-wave i:nth-child(2) { height: 100%; animation-delay: 0.15s; }
.unh-mic-wave i:nth-child(3) { height: 60%; animation-delay: 0.3s; }
@keyframes unh-mic-eq { 0%, 100% { transform: scaleY(0.4); } 50% { transform: scaleY(1); } }

@media (prefers-reduced-motion: reduce) {
  .unh-wiz-rail { animation: none; }
  .unh-mic.is-live .unh-mic-ring, .unh-mic-wave i { animation: none; }
}
.unh-wiz-head { animation: unh-rise 0.6s var(--ease) both; }
.unh-wiz-topline { display: flex; align-items: center; justify-content: space-between; }
.unh-brand { font-size: 1.15rem; font-weight: 600; letter-spacing: -0.01em; color: var(--ink); }
.unh-brand span { color: var(--accent); }
.unh-stepcount { font-size: 0.78rem; font-weight: 600; letter-spacing: 0.06em; color: var(--ink); }
.unh-stepcount span { color: var(--muted); font-weight: 500; }

/* Segmented progress — reads as a calm journey, not a loading bar. */
.unh-progress {
  margin-top: 0.9rem;
  display: grid; grid-auto-flow: column; grid-auto-columns: 1fr; gap: 6px;
}
.unh-progress-seg {
  height: 6px; border-radius: 999px;
  background: rgba(240, 236, 225, 0.08);
  transition: background-color 0.5s var(--ease), box-shadow 0.5s var(--ease);
}
.unh-progress-seg[data-done="true"] {
  background: linear-gradient(90deg, var(--accent), var(--amber));
  box-shadow: 0 0 12px -2px rgba(224, 120, 90, 0.6);
}
.unh-progress-caption {
  margin: 0.7rem 0 0;
  font-size: 0.72rem; letter-spacing: 0.16em; text-transform: uppercase; color: var(--muted);
}

/* Question card — tactile, glowing, finished. */
.unh-card {
  position: relative; overflow: hidden;
  margin-top: 1.5rem;
  padding: clamp(1.5rem, 4vw, 2.4rem);
  border: 1px solid var(--hair);
  border-radius: var(--radius);
  background: linear-gradient(180deg, rgba(240, 236, 225, 0.02), transparent 45%), var(--panel);
  box-shadow: 0 30px 60px -34px rgba(0, 0, 0, 0.8);
  animation: unh-rise 0.5s var(--ease) both;
}
.unh-card-glow {
  position: absolute; left: -60px; top: -70px;
  width: 220px; height: 220px; border-radius: 999px;
  background: radial-gradient(circle, rgba(224, 120, 90, 0.4), transparent 70%);
  opacity: 0.16; filter: blur(8px); pointer-events: none;
}
.unh-q-kicker {
  position: relative;
  font-size: 0.82rem; font-weight: 600; color: var(--accent-2);
}
.unh-q-title {
  position: relative;
  margin: 0.55rem 0 0;
  font-size: clamp(1.65rem, 3.6vw, 2.35rem);
  font-weight: 600; line-height: 1.12; letter-spacing: -0.01em;
  color: var(--ink); text-wrap: balance;
}
.unh-q-hint {
  position: relative;
  margin: 0.75rem 0 0;
  font-size: 0.98rem; line-height: 1.6; color: var(--muted);
}
.unh-controls { position: relative; margin-top: 1.7rem; animation: unh-rise 0.5s var(--ease) both; animation-delay: 0.08s; }
.unh-error {
  position: relative;
  margin: 1.1rem 0 0;
  font-size: 0.88rem; color: var(--danger);
}

/* Readiness: an inset panel instead of a card-in-a-card. */
.unh-readiness {
  padding: 1.4rem 1.5rem 1.6rem;
  border: 1px solid var(--hair);
  border-radius: var(--radius-sm);
  background: rgba(240, 236, 225, 0.02);
}
.unh-readiness > .flex { display: flex; align-items: flex-end; justify-content: space-between; }

/* Nav row. */
.unh-nav { margin-top: 1.6rem; display: flex; align-items: center; gap: 0.75rem; animation: unh-rise 0.5s var(--ease) both; animation-delay: 0.14s; }
.unh-nav-back { padding: 0.85rem 1.4rem; font-size: 0.9rem; }
.unh-nav-next { flex: 1; padding: 0.95rem 1.4rem; font-size: 0.92rem; font-weight: 600; }

/* ===================== GENTLE REMINDERS (facts) ======================== */
.unh-remind {
  margin-top: clamp(2.5rem, 6vw, 4rem);
  padding-top: 1.8rem;
  border-top: 1px solid var(--hair);
}
.unh-remind-head {
  display: flex; align-items: center; gap: 0.6rem;
  margin: 0 0 1.2rem;
  font-size: 0.74rem; font-weight: 600;
  letter-spacing: 0.16em; text-transform: uppercase; color: var(--muted);
}
.unh-remind-grid {
  margin: 0; padding: 0; list-style: none;
  display: grid; gap: 0.85rem; grid-template-columns: 1fr;
}
@media (min-width: 640px)  { .unh-remind-grid { grid-template-columns: repeat(2, 1fr); } }
@media (min-width: 1024px) { .unh-remind-grid { grid-template-columns: repeat(3, 1fr); } }
.unh-fact {
  display: flex; flex-direction: column;
  padding: 1.25rem 1.3rem;
  border: 1px solid var(--hair);
  border-radius: var(--radius-sm);
  background: linear-gradient(180deg, rgba(240, 236, 225, 0.015), transparent), var(--panel);
  transition: border-color 0.3s var(--ease), transform 0.3s var(--ease);
}
.unh-fact:hover {
  border-color: color-mix(in srgb, var(--accent-2) 32%, var(--hair));
  transform: translateY(-2px);
}
.unh-fact-icon {
  width: 38px; height: 38px; border-radius: 999px;
  display: grid; place-items: center;
  font-size: 1.1rem; line-height: 1;
  background: rgba(95, 178, 127, 0.1);
  border: 1px solid color-mix(in srgb, var(--accent-2) 22%, transparent);
}
.unh-fact-title { margin: 0.9rem 0 0; font-size: 1rem; font-weight: 600; color: var(--ink); }
.unh-fact-body { margin: 0.35rem 0 0; font-size: 0.86rem; line-height: 1.55; color: var(--muted); }

/* ------------------------------ keyframes ------------------------------- */
@keyframes unh-rise  { from { opacity: 0; translate: 0 18px; } to { opacity: 1; translate: 0 0; } }
@keyframes unh-pulse {
  0%   { box-shadow: 0 0 0 0 rgba(95, 178, 127, 0.5); }
  70%  { box-shadow: 0 0 0 8px rgba(95, 178, 127, 0); }
  100% { box-shadow: 0 0 0 0 rgba(95, 178, 127, 0); }
}
@keyframes unh-shine { 0%, 58% { left: -75%; } 84%, 100% { left: 130%; } }

@media (prefers-reduced-motion: reduce) {
  .breather { animation: none !important; }
  .unh-hero-copy > *, .unh-hero-aside, .unh-choose-head > *, .unh-habit-grid > li,
  .unh-wiz-head, .unh-card, .unh-controls, .unh-nav {
    animation: none !important;
    opacity: 1 !important;
    translate: none !important;
  }
  .unh-live, .unh-preview-wave span { animation: none; }
  .unh-preview { transform: none; }
  .unh-home .btn-primary::after,
  .unh-wiz .btn-primary::after { animation: none; }
}
</style>
