// App routes. Feature views are lazy-loaded so a still-building module only
// affects its own route, never the whole app. Guard enforces the intake gate.
import { createRouter, createWebHistory } from 'vue-router'
import { state, hasPlan } from './lib/state.js'

const routes = [
  { path: '/', redirect: () => (hasPlan() ? '/today' : '/start') },
  { path: '/start', component: () => import('./features/intake/IntakeView.vue'), meta: { hideNav: true } },
  { path: '/today', component: () => import('./features/today/TodayView.vue') },
  { path: '/watch', component: () => import('./features/videos/VideosView.vue') },
  { path: '/read', component: () => import('./features/blogs/BlogsView.vue') },
  { path: '/insights', component: () => import('./features/analytics/AnalyticsView.vue') },
  { path: '/profile', component: () => import('./features/profile/ProfileView.vue') },
  { path: '/admin', component: () => import('./features/admin/AdminView.vue') },
  { path: '/:pathMatch(.*)*', redirect: '/' },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})

// Until the store has finished loading, don't fight the user's navigation.
// Once loaded, enforce: no plan yet -> intake; plan exists -> keep them out of intake.
router.beforeEach((to) => {
  if (state.loading) return true
  if (!hasPlan() && !['/start', '/admin', '/profile'].includes(to.path)) return '/start'
  if (hasPlan() && to.path === '/start') return '/today'
  return true
})

export default router
