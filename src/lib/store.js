// Persistence abstraction: uses Firestore when Firebase is configured + a user is
// signed in, and falls back to localStorage otherwise. Same async API either way,
// so the app never has to care which backend is live. This is what keeps the demo
// working end-to-end even before Firebase creds are wired in.
import { db } from './firebase.js'
import { doc, getDoc, setDoc } from 'firebase/firestore'

const KEY = (uid) => `unhook:v1:${uid || 'local'}`

/** Local calendar day as YYYY-MM-DD (used to key daily check-ins). */
export function todayKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Load the saved state blob for a user, or null if none exists. */
export async function loadState(uid) {
  if (db && uid) {
    try {
      const snap = await getDoc(doc(db, 'unhook', uid))
      return snap.exists() ? snap.data() : null
    } catch (e) {
      console.warn('Firestore load failed, using localStorage:', e.message)
    }
  }
  const raw = localStorage.getItem(KEY(uid))
  return raw ? JSON.parse(raw) : null
}

/** Persist the state blob for a user. Writes to Firestore when available, always
 *  mirrors to localStorage so a reload is instant and offline-safe. */
export async function saveState(uid, state) {
  const payload = { ...state, updatedAt: new Date().toISOString() }
  localStorage.setItem(KEY(uid), JSON.stringify(payload))
  if (db && uid) {
    try {
      await setDoc(doc(db, 'unhook', uid), payload, { merge: true })
    } catch (e) {
      console.warn('Firestore save failed (kept locally):', e.message)
    }
  }
  return payload
}
