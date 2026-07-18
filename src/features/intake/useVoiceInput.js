// Voice-to-text for the intake free-text fields, built on the Web Speech API.
// Progressive: `supported` is false where the browser lacks SpeechRecognition
// (e.g. Firefox), so the UI can simply hide the mic. One recognizer at a time;
// starting a new field stops the previous one. Interim results stream in for a
// live, elegant feel, and are appended after whatever the user already typed.
import { ref, onBeforeUnmount } from 'vue'

export function useVoiceInput() {
  const SR = typeof window !== 'undefined'
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : null
  const supported = !!SR

  const activeKey = ref(null)   // which field is currently recording (null = idle)
  const listening = ref(false)
  const error = ref('')

  let rec = null
  let target = null             // the model ref we write transcripts into
  let base = ''                 // text that existed before this session started

  function stop() {
    try { rec && rec.stop() } catch { /* already stopped */ }
  }

  function start(key, modelRef) {
    if (!supported) return
    stop()                       // ensure only one active recognizer
    rec = new SR()
    rec.lang = navigator.language || 'en-US'
    rec.interimResults = true
    rec.continuous = true

    target = modelRef
    base = (modelRef.value || '').trim()
    activeKey.value = key
    listening.value = true
    error.value = ''

    rec.onresult = (e) => {
      let transcript = ''
      for (let i = 0; i < e.results.length; i++) transcript += e.results[i][0].transcript
      const spoken = transcript.trim()
      target.value = base ? `${base} ${spoken}`.trim() : spoken
    }
    rec.onerror = (e) => {
      error.value = e?.error === 'not-allowed'
        ? 'Microphone access was blocked.'
        : 'Voice input hit a snag — try again.'
      listening.value = false
      activeKey.value = null
    }
    rec.onend = () => {
      listening.value = false
      activeKey.value = null
    }

    try { rec.start() } catch { listening.value = false; activeKey.value = null }
  }

  // Toggle: tap the same field's mic to stop, tap another to switch.
  function toggle(key, modelRef) {
    if (listening.value && activeKey.value === key) stop()
    else start(key, modelRef)
  }

  onBeforeUnmount(stop)

  return { supported, listening, activeKey, error, toggle }
}
