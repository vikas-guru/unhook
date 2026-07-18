<script setup>
// Mobile-first bottom navigation with a raised central "SOS" action.
// On desktop it centers under the app column. Uses the global ui store for SOS.
import { openSOS } from '../lib/ui.js'
import { BarChart3, BookOpen, Clapperboard, LayoutDashboard, LifeBuoy, UserRound } from '@lucide/vue'

const tabs = [
  { to: '/today', label: 'Today', icon: LayoutDashboard },
  { to: '/watch', label: 'Watch', icon: Clapperboard },
  { to: '/read', label: 'Read', icon: BookOpen },
  { to: '/insights', label: 'Insights', icon: BarChart3 },
  { to: '/profile', label: 'Profile', icon: UserRound },
]
</script>

<template>
  <nav
    class="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--hair)] bg-[var(--bg)]/85 backdrop-blur-xl"
    style="padding-bottom: env(safe-area-inset-bottom)"
    aria-label="Primary"
  >
    <div class="mx-auto flex max-w-2xl items-stretch justify-around px-2">
      <RouterLink
        v-for="(t, i) in tabs"
        :key="t.to"
        :to="t.to"
        class="group relative flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium text-[var(--muted)] transition"
        :class="i < 2 ? 'order-1' : 'order-3'"
        active-class="!text-[var(--accent)]"
      >
        <component :is="t.icon" class="h-5 w-5 transition-transform group-hover:-translate-y-0.5" />
        <span>{{ t.label }}</span>
      </RouterLink>

      <!-- Raised central SOS -->
      <button
        class="order-2 -mt-6 flex flex-col items-center"
        aria-label="Craving SOS — get help right now"
        @click="openSOS"
      >
        <span class="grid h-14 w-14 place-items-center rounded-full bg-[var(--accent)] text-white shadow-[0_10px_30px_-6px_rgba(224,120,90,.6)] ring-4 ring-[var(--bg)] transition active:scale-95">
          <LifeBuoy class="h-6 w-6" />
        </span>
        <span class="mt-0.5 text-[10px] font-semibold text-[var(--accent)]">SOS</span>
      </button>
    </div>
  </nav>
</template>
