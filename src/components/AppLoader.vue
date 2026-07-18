<script setup>
// Branded first-paint loader — a calm breathing "growth ring".
defineProps({ label: { type: String, default: 'Getting you set up…' } })
</script>

<template>
  <div class="grid min-h-[70vh] place-items-center">
    <div class="flex flex-col items-center gap-5">
      <div class="relative grid h-20 w-20 place-items-center">
        <span class="absolute h-16 w-16 rounded-full bg-[var(--accent)]/40" style="animation: breathe 3.4s ease-in-out infinite"></span>
        <span class="absolute h-16 w-16 rounded-full bg-[var(--accent-2)]/30" style="animation: breathe 3.4s ease-in-out infinite; animation-delay: 1.1s"></span>
        <span class="grid h-14 w-14 place-items-center rounded-full bg-[var(--panel)] text-2xl shadow-lg">🪝</span>
      </div>
      <p class="font-display text-lg text-[var(--muted)]">{{ label }}</p>
    </div>
  </div>
</template>
