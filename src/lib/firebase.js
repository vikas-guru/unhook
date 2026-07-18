// Firebase — instant backend: Auth, Firestore, Storage, Hosting.
// Docs: https://firebase.google.com/docs/web/setup
// 1. Create a project at https://console.firebase.google.com
// 2. Add a Web app, copy the config values into .env (see .env.example)
// 3. Enable Auth (Google/Anonymous) + Firestore in the console.
import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider, signInWithPopup, signInAnonymously, signOut, onAuthStateChanged } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

const isTest = import.meta.env.MODE === 'test'

// Only initialize if configured — the scaffold runs fine without Firebase
// (AI-only mode) until you wire these values in.
export const isFirebaseConfigured = !isTest && Boolean(firebaseConfig.projectId)

export const app = isFirebaseConfigured ? initializeApp(firebaseConfig) : null
export const auth = app ? getAuth(app) : null
export const db = app ? getFirestore(app) : null
export const storage = app ? getStorage(app) : null

const googleProvider = new GoogleAuthProvider()

export const signInWithGoogle = () => signInWithPopup(auth, googleProvider)
export const signInGuest = () => signInAnonymously(auth)
export const logout = () => signOut(auth)
export const watchAuth = (cb) => (auth ? onAuthStateChanged(auth, cb) : () => {})
