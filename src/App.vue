<script setup>
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import BottomNav from './components/BottomNav.vue'
import AppLoader from './components/AppLoader.vue'
import CravingSOS from './components/CravingSOS.vue'
import CoachChat from './components/CoachChat.vue'
import { state, boot, hasPlan } from './lib/state.js'
import { ui, openCoach, closeSOS, closeCoach } from './lib/ui.js'
import { isFirebaseConfigured, signInWithGoogle, signInGuest, logout } from './lib/firebase.js'

const route = useRoute()
const router = useRouter()

function fixRoute() {
  const p = route.path
  if (hasPlan() && p === '/start') router.replace('/today')
  else if (!hasPlan() && !['/start', '/admin', '/profile'].includes(p)) router.replace('/start')
}

// ---- Header menu -----------------------------------------------------------
const menuOpen = ref(false)
function toggleMenu() { menuOpen.value = !menuOpen.value }
function closeMenu() { menuOpen.value = false }
function onKeydown(e) { if (e.key === 'Escape') closeMenu() }
// Close the menu on navigation so it never lingers across route changes.
watch(() => route.path, closeMenu)

// ---- PWA install (progressive; no-op where unsupported) --------------------
const installEvt = ref(null)          // captured beforeinstallprompt event
const canInstall = ref(false)         // show the "Install app" affordance
const isInstalled = ref(false)        // already running as an installed app

function detectInstalled() {
  isInstalled.value =
    window.matchMedia?.('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
}
function onBeforeInstall(e) {
  e.preventDefault()                  // stash the event so we can trigger it later
  installEvt.value = e
  canInstall.value = true
}
function onInstalled() {
  canInstall.value = false
  installEvt.value = null
  isInstalled.value = true
}
async function installApp() {
  const evt = installEvt.value
  if (!evt) return
  closeMenu()
  evt.prompt()
  await evt.userChoice.catch(() => {})
  installEvt.value = null
  canInstall.value = false
}

onMounted(() => {
  boot()
  watch(() => state.loading, (l) => {
    if (!l) router.isReady().then(fixRoute)
  }, { immediate: true })

  detectInstalled()
  window.addEventListener('keydown', onKeydown)
  window.addEventListener('beforeinstallprompt', onBeforeInstall)
  window.addEventListener('appinstalled', onInstalled)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  window.removeEventListener('beforeinstallprompt', onBeforeInstall)
  window.removeEventListener('appinstalled', onInstalled)
})
</script>

<template>
  <div class="min-h-full">
    <!-- Top bar -->
    <header class="unh-topbar sticky top-0 z-30">
      <div
        class="unh-topbar-inner mx-auto flex items-center justify-between gap-4 px-5 sm:px-8 lg:px-12"
        :class="route.path === '/admin' ? 'max-w-[112rem]' : ['/start', '/profile'].includes(route.path) ? 'max-w-[88rem]' : 'max-w-2xl'"
      >
        <RouterLink to="/today" class="unh-brand-lockup group" aria-label="Unhook — home">
          <span class="unh-brand-mark" aria-hidden="true">🪝</span>
          <span class="unh-brand-text">
            <span class="unh-brand-name font-display">Unhook</span>
            <span class="unh-brand-tag">A kinder way to quit</span>
          </span>
        </RouterLink>
        <nav v-if="route.path === '/admin'" class="hidden items-center gap-2 text-sm md:flex" aria-label="Admin quick menu">
          <RouterLink to="/admin" class="chip px-3 py-1.5">Dashboard</RouterLink>
          <RouterLink to="/insights" class="chip px-3 py-1.5">Insights</RouterLink>
          <RouterLink to="/start" class="chip px-3 py-1.5">New journey</RouterLink>
          <RouterLink to="/today" class="chip px-3 py-1.5">Today</RouterLink>
          <RouterLink to="/profile" class="chip px-3 py-1.5">Profile</RouterLink>
        </nav>
        <div class="flex items-center gap-1.5 text-sm">
          <!-- Desktop: primary nav shown side by side. Hidden once signed in
               (signed-in users navigate via the bottom nav) and on mobile,
               where the hamburger takes over. -->
          <nav v-if="!state.user" class="unh-topnav" aria-label="Primary">
            <RouterLink v-if="hasPlan()" to="/today" class="unh-topbar-link">Today</RouterLink>
            <RouterLink to="/insights" class="unh-topbar-link">Insights</RouterLink>
            <RouterLink to="/profile" class="unh-topbar-link">Profile</RouterLink>
            <RouterLink to="/admin" class="unh-topbar-link">Admin</RouterLink>
          </nav>

          <button v-if="hasPlan()" class="chip px-3 py-1.5" @click="openCoach">💬 Coach</button>

          <template v-if="state.user">
            <span class="unh-account unh-hide-sm">{{ state.user.isAnonymous ? 'Guest' : state.user.displayName || state.user.email }}</span>
            <button class="chip px-3 py-1.5" @click="logout">Sign out</button>
          </template>
          <template v-else-if="isFirebaseConfigured">
            <button class="chip px-3 py-1.5 unh-hide-sm" @click="signInGuest">Guest</button>
            <button class="btn btn-primary px-3 py-1.5 text-white" @click="signInWithGoogle">Sign in</button>
          </template>
          <span v-else class="unh-status unh-hide-sm" title="Your data stays on this device">
            <span class="unh-status-dot" aria-hidden="true"></span>
            <span class="unh-status-text">Local <span aria-hidden="true">·</span> <span class="unh-status-sub">private</span></span>
          </span>

          <button v-if="canInstall" type="button" class="chip px-3 py-1.5 unh-install-chip" @click="installApp">
            <span aria-hidden="true">📲</span> <span class="unh-hide-sm">Install</span>
          </button>

          <!-- Menu -->
          <div class="unh-menu-wrap">
            <button
              type="button"
              class="unh-iconbtn"
              :class="{ 'is-open': menuOpen }"
              aria-label="Menu"
              aria-haspopup="menu"
              :aria-expanded="menuOpen"
              @click="toggleMenu"
            >
              <span class="unh-iconbtn-lines" aria-hidden="true"><i></i><i></i><i></i></span>
            </button>

            <transition name="unh-menu">
              <div v-if="menuOpen" class="unh-menu" role="menu" aria-label="Main menu">
                <p class="unh-menu-eyebrow">Navigate</p>
                <RouterLink v-if="hasPlan()" to="/today" class="unh-menu-item" role="menuitem">
                  <span class="unh-menu-ico">🏠</span> Today
                </RouterLink>
                <RouterLink to="/start" class="unh-menu-item" role="menuitem">
                  <span class="unh-menu-ico">🧭</span> {{ hasPlan() ? 'Start a new journey' : 'Start assessment' }}
                </RouterLink>
                <RouterLink to="/insights" class="unh-menu-item" role="menuitem">
                  <span class="unh-menu-ico">📈</span> Insights
                </RouterLink>
                <RouterLink to="/profile" class="unh-menu-item" role="menuitem">
                  <span class="unh-menu-ico">👤</span> Profile
                </RouterLink>
                <RouterLink to="/admin" class="unh-menu-item" role="menuitem">
                  <span class="unh-menu-ico">⚙️</span> Admin
                </RouterLink>

                <template v-if="canInstall">
                  <div class="unh-menu-divider" role="separator"></div>
                  <button type="button" class="unh-menu-item unh-menu-item--cta" role="menuitem" @click="installApp">
                    <span class="unh-menu-ico">📲</span> Install app
                  </button>
                </template>

                <div class="unh-menu-divider" role="separator"></div>
                <p class="unh-menu-foot">
                  <span class="unh-status-dot" aria-hidden="true"></span>
                  {{ isInstalled ? 'Installed · offline-ready' : 'Private · stored on this device' }}
                </p>
              </div>
            </transition>
          </div>
        </div>
      </div>
      <!-- click-away backdrop -->
      <div v-if="menuOpen" class="unh-menu-scrim" @click="closeMenu" aria-hidden="true"></div>
    </header>

    <!-- Main -->
    <main
      class="mx-auto pb-28 pt-6"
      :class="route.path === '/admin' ? 'w-full max-w-[112rem] px-5 xl:px-8' : ['/start', '/profile'].includes(route.path) ? 'max-w-[88rem] px-5 sm:px-8 lg:px-12' : 'max-w-2xl px-4'"
    >
      <AppLoader v-if="state.loading" />
      <RouterView v-else v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </RouterView>
    </main>

    <!-- Bottom nav (only once the user has a plan and not on intake) -->
    <BottomNav v-if="!state.loading && hasPlan() && !route.meta.hideNav" />

    <!-- Global overlays -->
    <CravingSOS v-if="ui.sos && state.profile" :profile="state.profile" :state="state" @close="closeSOS" />
    <CoachChat v-if="ui.coach && state.profile" :profile="state.profile" :state="state" @close="closeCoach" />
  </div>
</template>

<style>
.fade-enter-active, .fade-leave-active { transition: opacity .22s ease, transform .22s ease; }
.fade-enter-from { opacity: 0; transform: translateY(6px); }
.fade-leave-to { opacity: 0; transform: translateY(-6px); }

/* ============================ TOP BAR ============================
   A calm, cohesive header: a warm gradient brand mark with a two-line
   lockup on the left, and a single grouped status/action cluster on the
   right. Width tracks the page column so the logo aligns with content. */
.unh-topbar {
  border-bottom: 1px solid var(--hair);
  background: color-mix(in srgb, var(--bg) 76%, transparent);
  backdrop-filter: blur(18px) saturate(1.3);
  -webkit-backdrop-filter: blur(18px) saturate(1.3);
}
.unh-topbar-inner { padding-block: 0.7rem; }

/* Brand lockup ------------------------------------------------------ */
.unh-brand-lockup {
  display: inline-flex; align-items: center; gap: 0.7rem;
  border-radius: 14px;
  transition: opacity .2s ease;
}
.unh-brand-lockup:hover { opacity: 0.94; }
.unh-brand-mark {
  display: grid; place-items: center;
  height: 38px; width: 38px; flex: none;
  border-radius: 12px;
  font-size: 1.05rem; line-height: 1;
  background: linear-gradient(150deg, var(--accent), var(--accent-600) 88%);
  box-shadow:
    0 8px 20px -8px rgba(224, 120, 90, 0.75),
    inset 0 1px 0 rgba(255, 255, 255, 0.28),
    inset 0 -2px 6px rgba(0, 0, 0, 0.2);
  transition: transform .3s cubic-bezier(.22,1,.36,1), box-shadow .3s ease;
}
.unh-brand-lockup:hover .unh-brand-mark {
  transform: rotate(-7deg) scale(1.06);
  box-shadow:
    0 12px 26px -8px rgba(224, 120, 90, 0.85),
    inset 0 1px 0 rgba(255, 255, 255, 0.3);
}
.unh-brand-text { display: flex; flex-direction: column; gap: 2px; }
.unh-brand-name {
  font-size: 1.15rem; font-weight: 600; line-height: 1;
  letter-spacing: -0.015em; color: var(--ink);
}
.unh-brand-tag {
  font-size: 0.56rem; font-weight: 600; line-height: 1;
  letter-spacing: 0.2em; text-transform: uppercase;
  color: var(--muted);
}
@media (max-width: 400px) { .unh-brand-tag { display: none; } }

/* Plain text nav link (Admin) — quieter than a chip ----------------- */
.unh-topbar-link {
  padding: 0.5rem 0.7rem;
  font-size: 0.82rem; font-weight: 500;
  color: var(--muted); border-radius: 999px;
  transition: color .18s ease, background-color .18s ease;
}
.unh-topbar-link:hover { color: var(--ink); background: rgba(240, 236, 225, 0.05); }

/* Local / private status pill — reads as status, not a button ------- */
.unh-status {
  display: inline-flex; align-items: center; gap: 0.5rem;
  padding: 0.42rem 0.8rem;
  border: 1px solid color-mix(in srgb, var(--accent-2) 22%, var(--hair));
  border-radius: 999px;
  background: rgba(95, 178, 127, 0.08);
  font-size: 0.76rem; font-weight: 500; line-height: 1;
  color: var(--ink); white-space: nowrap;
}
.unh-status-sub { color: var(--muted); }
.unh-status-dot {
  height: 7px; width: 7px; flex: none; border-radius: 999px;
  background: var(--accent-2);
  box-shadow: 0 0 0 0 rgba(95, 178, 127, 0.5);
  animation: unh-topbar-pulse 2.8s ease-out infinite;
}
@keyframes unh-topbar-pulse {
  0%   { box-shadow: 0 0 0 0 rgba(95, 178, 127, 0.5); }
  70%  { box-shadow: 0 0 0 7px rgba(95, 178, 127, 0); }
  100% { box-shadow: 0 0 0 0 rgba(95, 178, 127, 0); }
}
/* Hide the quieter items once space gets tight — the menu covers them. */
@media (max-width: 560px) { .unh-hide-sm { display: none; } }

/* Desktop inline nav: primary links shown side by side. Below the breakpoint
   the hamburger takes over, so this hides and the menu-wrap shows. */
.unh-topnav { display: none; }
.unh-install-chip { display: none; }
.unh-account {
  padding: 0.4rem 0.75rem; border-radius: 999px;
  color: var(--muted); font-size: 0.82rem;
  max-width: 12rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
@media (min-width: 860px) {
  .unh-topnav { display: flex; align-items: center; gap: 0.15rem; margin-right: 0.3rem; }
  .unh-install-chip { display: inline-flex; align-items: center; gap: 0.35rem; }
  .unh-menu-wrap { display: none; }        /* hamburger is mobile-only */
}

/* Menu trigger — a tidy icon button that morphs to an X when open ------- */
.unh-menu-wrap { position: relative; }
.unh-iconbtn {
  display: inline-grid; place-items: center;
  height: 38px; width: 38px; flex: none;
  border: 1px solid var(--hair); border-radius: 12px;
  background: rgba(240, 236, 225, 0.04);
  color: var(--ink);
  transition: border-color .2s ease, background-color .2s ease;
}
.unh-iconbtn:hover { border-color: color-mix(in srgb, var(--accent) 45%, var(--hair)); background: rgba(224, 120, 90, 0.08); }
.unh-iconbtn:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px var(--bg), 0 0 0 4px rgba(224, 120, 90, 0.6);
}
.unh-iconbtn-lines { position: relative; display: block; width: 18px; height: 12px; }
.unh-iconbtn-lines i {
  position: absolute; left: 0; height: 2px; width: 100%; border-radius: 2px;
  background: currentColor;
  transition: transform .28s var(--ease), opacity .2s ease, top .28s var(--ease);
}
.unh-iconbtn-lines i:nth-child(1) { top: 0; }
.unh-iconbtn-lines i:nth-child(2) { top: 5px; }
.unh-iconbtn-lines i:nth-child(3) { top: 10px; }
.unh-iconbtn.is-open { border-color: color-mix(in srgb, var(--accent) 50%, var(--hair)); background: rgba(224, 120, 90, 0.1); }
.unh-iconbtn.is-open .unh-iconbtn-lines i:nth-child(1) { top: 5px; transform: rotate(45deg); }
.unh-iconbtn.is-open .unh-iconbtn-lines i:nth-child(2) { opacity: 0; }
.unh-iconbtn.is-open .unh-iconbtn-lines i:nth-child(3) { top: 5px; transform: rotate(-45deg); }

/* Dropdown panel ------------------------------------------------------- */
.unh-menu-scrim { position: fixed; inset: 0; z-index: 20; }
.unh-menu {
  position: absolute; top: calc(100% + 12px); right: 0; z-index: 40;
  width: min(17rem, calc(100vw - 2rem));
  padding: 0.6rem;
  border: 1px solid var(--hair); border-radius: 16px;
  background: color-mix(in srgb, var(--panel) 96%, transparent);
  backdrop-filter: blur(20px) saturate(1.3);
  -webkit-backdrop-filter: blur(20px) saturate(1.3);
  box-shadow: var(--shadow-lg);
}
.unh-menu-eyebrow {
  margin: 0.35rem 0.6rem 0.5rem;
  font-size: 0.62rem; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase;
  color: var(--muted);
}
.unh-menu-item {
  display: flex; align-items: center; gap: 0.7rem; width: 100%;
  padding: 0.6rem 0.65rem; border-radius: 10px;
  font-size: 0.9rem; font-weight: 500; color: var(--ink); text-align: left;
  transition: background-color .16s ease, color .16s ease;
}
.unh-menu-item:hover { background: rgba(240, 236, 225, 0.055); }
.unh-menu-item.router-link-active { color: var(--accent); }
.unh-menu-ico { width: 1.2rem; text-align: center; font-size: 0.95rem; line-height: 1; }
.unh-menu-item--cta { color: var(--accent); font-weight: 600; }
.unh-menu-item--cta:hover { background: rgba(224, 120, 90, 0.12); }
.unh-menu-divider { height: 1px; margin: 0.45rem 0.3rem; background: var(--hair); }
.unh-menu-foot {
  display: flex; align-items: center; gap: 0.5rem;
  margin: 0.15rem 0.65rem 0.35rem;
  font-size: 0.72rem; color: var(--muted);
}

.unh-menu-enter-active, .unh-menu-leave-active { transition: opacity .18s ease, transform .18s var(--ease); transform-origin: top right; }
.unh-menu-enter-from, .unh-menu-leave-to { opacity: 0; transform: translateY(-6px) scale(0.97); }

@media (prefers-reduced-motion: reduce) {
  .unh-status-dot { animation: none; }
  .unh-brand-lockup:hover .unh-brand-mark { transform: none; }
  .unh-iconbtn-lines i { transition: none; }
  .unh-menu-enter-active, .unh-menu-leave-active { transition: opacity .12s ease; }
  .unh-menu-enter-from, .unh-menu-leave-to { transform: none; }
}
</style>
