<script setup>
import { ref, onMounted } from 'vue'
import { cravingSOS } from '../lib/coach.js'

const props = defineProps({ profile: Object, state: Object })
const emit = defineEmits(['close'])

const text = ref('')
const busy = ref(true)
const error = ref('')

async function run() {
  text.value = ''
  busy.value = true
  error.value = ''
  try {
    for await (const chunk of cravingSOS(props.profile, props.state)) text.value += chunk
  } catch (e) {
    error.value = e.message
  } finally {
    busy.value = false
  }
}

onMounted(run)
</script>

<template>
  <div class="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm" @click.self="emit('close')">
    <div class="w-full max-w-md rounded-3xl border border-white/10 bg-[var(--panel)] p-7 text-center">
      <!-- Breathing guide -->
      <div class="relative mx-auto mb-5 grid h-24 w-24 place-items-center">
        <span class="absolute h-20 w-20 animate-ping rounded-full bg-[var(--accent)]/30" style="animation-duration: 4s"></span>
        <span class="grid h-20 w-20 place-items-center rounded-full bg-[var(--accent)]/20 text-2xl">🌊</span>
      </div>

      <p class="text-xs uppercase tracking-wide text-white/40">Ride the wave — it peaks and passes</p>

      <p class="mt-3 min-h-[7rem] text-left text-[15px] leading-relaxed text-white/90 whitespace-pre-wrap">{{ text }}<span v-if="busy" class="animate-pulse">▍</span></p>

      <p v-if="error" class="mt-2 text-sm text-red-400">{{ error }}</p>

      <div class="mt-5 flex gap-3">
        <button :disabled="busy" class="rounded-xl border border-white/10 px-4 py-2.5 text-sm hover:bg-white/5 disabled:opacity-40" @click="run">Again</button>
        <button class="flex-1 rounded-xl bg-[var(--accent-2)] px-4 py-2.5 font-semibold text-white" @click="emit('close')">I rode it out 💪</button>
      </div>
    </div>
  </div>
</template>
