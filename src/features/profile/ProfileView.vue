<script setup>
import { computed, ref } from 'vue'
import { Bell, CheckCircle2, Mail, MessageSquareText, UserRound } from '@lucide/vue'
import { state, submitFeedback, updateProfileContact, updateReminderSettings } from '../../lib/state.js'

const contactName = ref(state.profileContact?.name || state.user?.displayName || '')
const contactEmail = ref(state.profileContact?.email || state.user?.email || '')
const contactConsent = ref(state.profileContact?.consent ?? false)
const reminderEnabled = ref(state.reminderSettings?.enabled ?? false)
const reminderCadence = ref(state.reminderSettings?.cadence || 'Daily')
const reminderTime = ref(state.reminderSettings?.time || '20:30')
const reminderChannel = ref(state.reminderSettings?.channel || 'Email')
const rating = ref(5)
const feedbackText = ref('')
const savedContact = ref(false)
const savedReminder = ref(false)
const sentFeedback = ref(false)

const completionPct = computed(() => {
  const finalMilestone = state.plan?.milestones?.at(-1)?.day || 21
  return Math.min(100, Math.round((state.streak / finalMilestone) * 100))
})

const profileMetrics = computed(() => [
  { label: 'Habit', value: state.profile?.habit || 'Not started' },
  { label: 'Plan progress', value: `${completionPct.value}%` },
  { label: 'Current streak', value: `${state.streak} days` },
  { label: 'Best streak', value: `${state.best} days` },
])

async function saveContact() {
  await updateProfileContact({
    name: contactName.value,
    email: contactEmail.value,
    consent: contactConsent.value,
  })
  savedContact.value = true
  setTimeout(() => (savedContact.value = false), 1800)
}

async function saveReminder() {
  await updateReminderSettings({
    enabled: reminderEnabled.value,
    cadence: reminderCadence.value,
    time: reminderTime.value,
    channel: reminderChannel.value,
  })
  savedReminder.value = true
  setTimeout(() => (savedReminder.value = false), 1800)
}

async function sendFeedback() {
  const text = feedbackText.value.trim()
  if (!text) return
  await submitFeedback({
    rating: rating.value,
    message: text,
    completed: completionPct.value >= 100,
  })
  feedbackText.value = ''
  sentFeedback.value = true
  setTimeout(() => (sentFeedback.value = false), 2200)
}
</script>

<template>
  <div class="profile-console space-y-5">
    <section class="profile-hero rise">
      <div>
        <p class="eyebrow">USER PROFILE</p>
        <h1 class="mt-2 font-display text-4xl font-semibold">Your recovery profile.</h1>
        <p class="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)]">
          Control identity, reminders, feedback, and the email nudges generated as you move through your plan.
        </p>
      </div>
      <div class="profile-progress">
        <strong>{{ completionPct }}%</strong>
        <span>plan complete</span>
      </div>
    </section>

    <section class="grid gap-3 sm:grid-cols-4">
      <div v-for="item in profileMetrics" :key="item.label" class="metric-tile">
        <p class="text-xs uppercase tracking-[0.14em] text-[var(--muted)]">{{ item.label }}</p>
        <p class="mt-2 font-display text-xl font-semibold">{{ item.value }}</p>
      </div>
    </section>

    <section class="profile-grid">
      <article class="admin-card">
        <div class="flex items-start gap-3">
          <UserRound class="mt-1 h-5 w-5 text-[var(--accent)]" />
          <div>
            <p class="eyebrow">REGISTRATION EMAIL</p>
            <h2 class="mt-2 font-display text-2xl font-semibold">Where should Unhook send updates?</h2>
          </div>
        </div>
        <form class="mt-5 grid gap-3" @submit.prevent="saveContact">
          <input v-model="contactName" class="field px-4 py-3 text-sm" placeholder="Your name" aria-label="Your name" />
          <input v-model="contactEmail" class="field px-4 py-3 text-sm" type="email" placeholder="you@example.com" aria-label="Email address" />
          <label class="agent-check">
            <input v-model="contactConsent" type="checkbox" />
            <span>Send registration, milestone, and reminder emails to this address.</span>
          </label>
          <button class="btn btn-primary px-5 py-3 text-sm" type="submit">
            <Mail class="h-4 w-4" />
            Save email settings
          </button>
          <p v-if="savedContact" class="text-sm text-[var(--accent-2)]">Email settings saved.</p>
        </form>
      </article>

      <article class="admin-card">
        <div class="flex items-start gap-3">
          <Bell class="mt-1 h-5 w-5 text-[var(--accent)]" />
          <div>
            <p class="eyebrow">REMINDERS</p>
            <h2 class="mt-2 font-display text-2xl font-semibold">Set a gentle check-in rhythm.</h2>
          </div>
        </div>
        <form class="mt-5 grid gap-3" @submit.prevent="saveReminder">
          <label class="agent-check">
            <input v-model="reminderEnabled" type="checkbox" />
            <span>Enable reminders</span>
          </label>
          <div class="grid gap-3 sm:grid-cols-3">
            <select v-model="reminderCadence" class="field px-4 py-3 text-sm" aria-label="Reminder cadence">
              <option>Daily</option>
              <option>Weekdays</option>
              <option>Weekly</option>
            </select>
            <input v-model="reminderTime" class="field px-4 py-3 text-sm" type="time" aria-label="Reminder time" />
            <select v-model="reminderChannel" class="field px-4 py-3 text-sm" aria-label="Reminder channel">
              <option>Email</option>
              <option>In-app</option>
            </select>
          </div>
          <button class="btn btn-primary px-5 py-3 text-sm" type="submit">Save reminder</button>
          <p v-if="savedReminder" class="text-sm text-[var(--accent-2)]">Reminder preference saved.</p>
        </form>
      </article>

      <article class="admin-card">
        <div class="flex items-start gap-3">
          <MessageSquareText class="mt-1 h-5 w-5 text-[var(--accent)]" />
          <div>
            <p class="eyebrow">COMPLETION FEEDBACK</p>
            <h2 class="mt-2 font-display text-2xl font-semibold">Tell us what changed.</h2>
          </div>
        </div>
        <form class="mt-5 grid gap-3" @submit.prevent="sendFeedback">
          <label>
            <span class="control-kicker">Experience rating: {{ rating }}/5</span>
            <input v-model="rating" class="mt-3 w-full accent-[var(--accent)]" type="range" min="1" max="5" />
          </label>
          <textarea
            v-model="feedbackText"
            class="field min-h-32 resize-none px-4 py-3 text-sm leading-6"
            placeholder="What helped, what felt hard, and what should the coach do better?"
          />
          <button class="btn btn-primary px-5 py-3 text-sm" type="submit">
            <CheckCircle2 class="h-4 w-4" />
            Submit feedback
          </button>
          <p v-if="sentFeedback" class="text-sm text-[var(--accent-2)]">Feedback captured for admin review.</p>
        </form>
      </article>

      <article class="admin-card">
        <p class="eyebrow">EMAIL OUTBOX</p>
        <h2 class="mt-2 font-display text-2xl font-semibold">Generated user lifecycle emails.</h2>
        <div class="email-event-list mt-5">
          <div v-for="event in state.engagementEvents.slice(0, 6)" :key="event.id" class="email-event">
            <div>
              <strong>{{ event.subject }}</strong>
              <small>{{ event.preheader }}</small>
            </div>
            <span>{{ event.status }}</span>
          </div>
          <p v-if="!state.engagementEvents.length" class="rounded-2xl border border-[var(--hair)] p-4 text-sm text-[var(--muted)]">
            Email events will appear after registration, reminders, and milestone check-ins.
          </p>
        </div>
      </article>
    </section>
  </div>
</template>
