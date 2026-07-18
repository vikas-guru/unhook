<script setup>
import { ref, nextTick } from 'vue'
import { coachReply } from '../lib/coach.js'

const props = defineProps({ profile: Object, state: Object })
const emit = defineEmits(['close'])

const input = ref('')
const busy = ref(false)
const error = ref('')
const scroller = ref(null)
const messages = ref([
  {
    role: 'model',
    text: `Hey — I'm your Unhook coach. You're ${props.state.streak} day(s) into breaking "${props.profile.habit}". What's on your mind?`,
  },
])

async function send() {
  const text = input.value.trim()
  if (!text || busy.value) return
  input.value = ''
  error.value = ''
  messages.value.push({ role: 'user', text })
  const reply = { role: 'model', text: '' }
  messages.value.push(reply)
  busy.value = true
  await down()
  try {
    for await (const chunk of coachReply(props.profile, props.state, messages.value.slice(0, -1), text)) {
      reply.text += chunk
      await down()
    }
  } catch (e) {
    error.value = e.message
    messages.value.pop()
  } finally {
    busy.value = false
  }
}

async function down() {
  await nextTick()
  scroller.value?.scrollTo({ top: scroller.value.scrollHeight })
}
</script>

<template>
  <div class="fixed inset-0 z-50 grid place-items-end bg-black/60 p-0 backdrop-blur-sm sm:place-items-center sm:p-4" @click.self="emit('close')">
    <div class="flex h-[80vh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl border border-white/10 bg-[var(--panel)] sm:h-[70vh] sm:rounded-3xl">
      <div class="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div class="flex items-center gap-2">
          <span class="h-2.5 w-2.5 rounded-full bg-[var(--accent-2)]"></span>
          <span class="text-sm font-medium">Unhook Coach</span>
        </div>
        <button class="text-white/50 hover:text-white" @click="emit('close')">✕</button>
      </div>

      <div ref="scroller" class="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        <div v-for="(m, i) in messages" :key="i" class="flex" :class="m.role === 'user' ? 'justify-end' : 'justify-start'">
          <div
            class="max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed"
            :class="m.role === 'user' ? 'bg-[var(--accent)] text-white' : 'bg-white/5 border border-white/10'"
          >{{ m.text || '…' }}</div>
        </div>
        <p v-if="error" class="text-sm text-red-400">{{ error }}</p>
      </div>

      <form class="flex gap-2 border-t border-white/10 p-3" @submit.prevent="send">
        <input
          v-model="input"
          :disabled="busy"
          placeholder="Tell your coach…"
          class="flex-1 rounded-xl bg-white/5 border border-white/10 px-3.5 py-2.5 text-sm outline-none focus:border-[var(--accent)] disabled:opacity-50"
        />
        <button type="submit" :disabled="busy" class="rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40">{{ busy ? '…' : 'Send' }}</button>
      </form>
    </div>
  </div>
</template>
