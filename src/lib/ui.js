// Tiny global UI store for app-wide overlays (Craving SOS + Coach chat),
// so any component (bottom nav, FAB, Today view) can open them without prop drilling.
import { reactive } from 'vue'

export const ui = reactive({ sos: false, coach: false })

export const openSOS = () => (ui.sos = true)
export const closeSOS = () => (ui.sos = false)
export const openCoach = () => (ui.coach = true)
export const closeCoach = () => (ui.coach = false)
