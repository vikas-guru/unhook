<script setup>
import { ref } from 'vue'
import { generatePlan } from '../lib/coach.js'

const emit = defineEmits(['created'])

const habit = ref('')
const trigger = ref('')
const why = ref('')
const phase = ref('form') // form | generating | preview
const plan = ref(null)
const error = ref('')

const chips = ['Doom-scrolling', 'Phone overuse', 'Vaping', 'Smoking', 'Junk food', 'Gambling']

async function build() {
  if (!habit.value.trim()) { error.value = 'Tell me which habit you want to break.'; return }
  error.value = ''
  phase.value = 'generating'
  try {
    plan.value = await generatePlan({
      habit: habit.value.trim(),
      trigger: trigger.value.trim(),
      why: why.value.trim(),
    })
    phase.value = 'preview'
  } catch (e) {
    error.value = e.message
    phase.value = 'form'
  }
}

function start() {
  emit('created', {
    profile: { habit: habit.value.trim(), trigger: trigger.value.trim(), why: why.value.trim() },
    plan: plan.value,
  })
}
</script>

<template>
  <!-- FORM -->
  <section v-if="phase !== 'preview'">
    <h1 class="font-display text-3xl font-bold leading-tight sm:text-4xl">
      What habit are we <span class="text-[var(--accent)]">breaking</span>?
    </h1>
    <p class="mt-3 text-white/55">
      Tell me a little, and I'll build you a personal quit plan — then coach you through every craving.
    </p>

    <div class="mt-8 space-y-5 rounded-2xl border border-white/10 bg-[var(--panel)]/70 p-6">
      <div>
        <label class="text-sm font-medium">The habit</label>
        <input
          v-model="habit"
          :disabled="phase === 'generating'"
          placeholder="e.g. doom-scrolling Instagram at night"
          class="mt-2 w-full rounded-xl bg-white/5 border border-white/10 px-3.5 py-2.5 text-sm outline-none focus:border-[var(--accent)] disabled:opacity-50"
        />
        <div class="mt-2.5 flex flex-wrap gap-2">
          <button
            v-for="c in chips"
            :key="c"
            type="button"
            class="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-white/70 hover:border-[var(--accent)] hover:text-white"
            @click="habit = c"
          >{{ c }}</button>
        </div>
      </div>

      <div>
        <label class="text-sm font-medium">Your main trigger <span class="text-white/40">(optional)</span></label>
        <input
          v-model="trigger"
          :disabled="phase === 'generating'"
          placeholder="e.g. boredom, stress after work, lying in bed"
          class="mt-2 w-full rounded-xl bg-white/5 border border-white/10 px-3.5 py-2.5 text-sm outline-none focus:border-[var(--accent)] disabled:opacity-50"
        />
      </div>

      <div>
        <label class="text-sm font-medium">Why does this matter to you? <span class="text-white/40">(optional)</span></label>
        <input
          v-model="why"
          :disabled="phase === 'generating'"
          placeholder="e.g. I want to sleep better and be present with my kids"
          class="mt-2 w-full rounded-xl bg-white/5 border border-white/10 px-3.5 py-2.5 text-sm outline-none focus:border-[var(--accent)] disabled:opacity-50"
        />
      </div>

      <p v-if="error" class="text-sm text-red-400">{{ error }}</p>

      <button
        :disabled="phase === 'generating'"
        class="w-full rounded-xl bg-[var(--accent)] px-4 py-3 font-semibold text-white disabled:opacity-50"
        @click="build"
      >
        <span v-if="phase === 'generating'">Building your plan…</span>
        <span v-else>Build my plan ✨</span>
      </button>
    </div>
  </section>

  <!-- PREVIEW of the AI-generated plan -->
  <section v-else>
    <p class="text-sm text-[var(--accent-2)]">Your personalised plan</p>
    <h1 class="font-display text-3xl font-bold">{{ plan.title }}</h1>
    <p class="mt-2 text-white/60">{{ plan.summary }}</p>

    <div class="mt-6 grid gap-4 sm:grid-cols-2">
      <div class="rounded-2xl border border-white/10 bg-[var(--panel)]/70 p-5">
        <p class="text-xs uppercase tracking-wide text-white/40">Milestones</p>
        <ul class="mt-3 space-y-2.5">
          <li v-for="m in plan.milestones" :key="m.day" class="flex gap-3 text-sm">
            <span class="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-[var(--accent)]/20 text-xs font-semibold text-[var(--accent)]">D{{ m.day }}</span>
            <span class="text-white/80">{{ m.label }}</span>
          </li>
        </ul>
      </div>
      <div class="rounded-2xl border border-white/10 bg-[var(--panel)]/70 p-5">
        <p class="text-xs uppercase tracking-wide text-white/40">When a craving hits, instead you'll</p>
        <ul class="mt-3 space-y-2 text-sm text-white/80">
          <li v-for="(r, i) in plan.replacements" :key="i" class="flex gap-2">
            <span class="text-[var(--accent-2)]">→</span><span>{{ r }}</span>
          </li>
        </ul>
      </div>
    </div>

    <div class="mt-4 rounded-2xl border border-[var(--accent)]/30 bg-[var(--accent)]/10 p-5">
      <p class="text-xs uppercase tracking-wide text-white/50">Your if-then plan</p>
      <p class="mt-1.5 text-white/90">{{ plan.ifThen }}</p>
      <p class="mt-3 font-display text-lg font-semibold text-[var(--accent)]">“{{ plan.mantra }}”</p>
    </div>

    <div class="mt-6 flex gap-3">
      <button class="rounded-xl border border-white/10 px-4 py-3 text-sm hover:bg-white/5" @click="phase = 'form'">Tweak</button>
      <button class="flex-1 rounded-xl bg-[var(--accent)] px-4 py-3 font-semibold text-white" @click="start">Start my journey →</button>
    </div>
  </section>
</template>
