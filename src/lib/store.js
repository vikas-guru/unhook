// Persistence abstraction: uses Firestore when Firebase is configured + a user is
// signed in, and falls back to localStorage otherwise. Same async API either way,
// so the app never has to care which backend is live. This is what keeps the demo
// working end-to-end even before Firebase creds are wired in.
import { db } from './firebase.js'
import { doc, getDoc, setDoc } from 'firebase/firestore'

const KEY = (uid) => `unhook:v1:${uid || 'local'}`

// Firestore's SDK retries an unreachable/not-yet-created backend *silently* — a
// bare `await getDoc(...)` can hang forever rather than reject, which would leave
// the app stuck on "Getting you set up…". Race every network call against a
// timeout so it always settles and we can fall back to localStorage.
function withTimeout(promise, ms, label = 'operation') {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)),
  ])
}

/** Local calendar day as YYYY-MM-DD (used to key daily check-ins). */
export function todayKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Load the saved state blob for a user, or null if none exists. */
export async function loadState(uid) {
  if (db && uid) {
    try {
      const snap = await withTimeout(getDoc(doc(db, 'unhook', uid)), 5000, 'Firestore load')
      const remote = snap.exists() ? snap.data() : null
      if (remote) return remote
    } catch (e) {
      console.warn('Firestore load failed/timed out, using localStorage:', e.message)
    }
  }
  const raw = localStorage.getItem(KEY(uid))
  return raw ? JSON.parse(raw) : null
}

/** Persist the state blob for a user. Writes to Firestore when available, always
 *  mirrors to localStorage so a reload is instant and offline-safe. */
export async function saveState(uid, state) {
  const payload = { ...state, updatedAt: new Date().toISOString() }
  // localStorage is the reload source of truth — write it synchronously so the UI
  // never waits on the network. Mirror to Firestore in the background so a hung or
  // unreachable backend can't stall check-ins / plan generation for the user.
  localStorage.setItem(KEY(uid), JSON.stringify(payload))
  if (db && uid) {
    withTimeout(setDoc(doc(db, 'unhook', uid), payload, { merge: true }), 5000, 'Firestore save')
      .catch((e) => console.warn('Firestore save failed/timed out (kept locally):', e.message))
  }
  return payload
}
