# Unhook

Unhook is a premium Vite/Vue habit recovery app with Firebase-ready Auth, Firestore, Storage, and Hosting support.

## Product Stack

- Vue 3 + Vite for the app shell and route-level code splitting.
- Firebase Hosting for production delivery.
- Firebase Auth, Firestore, and Storage hooks are wired behind environment config.
- `@lucide/vue` powers the icon system.
- `@vueuse/core` is used for polished browser-aware behavior.
- `canvas-confetti` adds a restrained reward moment when users log a daily win.
- Tailwind CSS plus a custom Nightfall design system drive the premium UI layer.

## Local Development

```sh
npm install
npm run dev
```

## Verification

```sh
npm test
npm run build
```

## Firebase Hosting

This workspace is connected to Firebase project `unhook-vikas-guru`.

```sh
npm run build
firebase deploy --only hosting --project unhook-vikas-guru
```

Live URLs:

- https://unhook-vikas-guru.web.app
- https://unhook-vikas-guru.firebaseapp.com
