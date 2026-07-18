# Deployment Plan

## Completed

- Created Firebase project `unhook-vikas-guru`.
- Created Firebase web app `unhook`.
- Added Firebase Hosting config for the Vite `dist` build.
- Added SPA rewrite support for Vue Router.
- Added cache headers for immutable assets and no-cache HTML.
- Deployed Hosting successfully.
- Verified the live Firebase Hosting URLs return `200 OK`.

## GitHub

- Initialize this folder as a Git repository.
- Commit source, Firebase config, rules, and docs.
- Publish as public GitHub repo `vikas-guru/unhook`.
- Keep `.env`, `dist`, `node_modules`, logs, and Firebase deploy cache out of Git.

## Firebase Backend Follow-Up

- Enable Cloud Firestore API for `unhook-vikas-guru`.
- Create the default Firestore database in the chosen production location.
- Deploy `firestore.rules`.
- Enable Firebase Authentication providers needed by the app:
  - Google
  - Anonymous
- Optionally enable Firebase Storage and deploy `storage.rules` if user uploads become part of the product flow.

## Production Hardening

- Add a GitHub Actions workflow for build/test on pull requests.
- Add a Firebase Hosting deployment workflow after deciding whether deploys should use a Firebase service account or GitHub OIDC.
- Decide whether preview channels are needed for branches and PRs.
- Add a custom domain when the brand/domain is finalized.
