# Unhook Hackathon Readiness

## Demo Credentials

Admin console:

- URL: `/admin`
- Email: `admin@unhook.local`
- Password: `PromptWars@2026`

User mode:

- Users can continue privately as guests.
- If Firebase Auth is configured, Google sign-in and anonymous guest sessions are available.

## Problem Alignment

Unhook targets the PromptWars challenge: breaking bad habits and addiction with a GenAI-powered web app.

The app supports:

- Habit reduction for doom-scrolling, phone overuse, vaping, smoking, junk food, gambling, and admin-added habits.
- Personalized plan generation using the live Gemini path plus admin-controlled multi-agent orchestration roles.
- Adaptive coaching, daily nudges, craving SOS, check-ins, streaks, rewards, content recommendations, and insights.
- Admin operations for user progress, risk, rewards, frontend habit cards, AI agents, email engagement, SMTP settings, and feedback review.

## End-to-End Demo Flow

1. Open `/start`.
2. Select a habit card such as Doom-scrolling or Phone overuse.
3. Complete the guided assessment: frequency, trigger, duration, motivation, readiness.
4. Generate the plan. This calls the configured AI plan path and stores the returned plan.
5. Land on `/today`.
6. Use Craving SOS and Coach.
7. Submit a daily check-in.
8. Open `/insights` to show progress analytics.
9. Open `/profile`.
10. Save email consent, set reminders, and submit feedback.
11. Open `/admin` with the credentials above.
12. Review Overview, Users, Rewards, Habit controls, AI agents, Engagement, and Operations.

## Admin Capabilities

Admin dashboard:

- Shows total users, active users, support load, check-ins, rewards, and email events.
- Includes 10 seeded demo users with different habits and risks.
- Each user row opens a user-level detail view with progress, habit focus areas, risk, latest action, next reward, and admin next steps.

Habit controls:

- Admin controls the homepage habit cards.
- Cards can be added, edited, enabled, disabled, removed, or reset to defaults.

AI agents:

- Gemini is the live generation path when `VITE_GEMINI_API_KEY` is configured.
- Claude, Codex, and OpenCode are admin-controlled orchestration roles until a secure backend proxy is added.
- Admin can enable or disable each model for plan generation and coaching.

Engagement:

- Registration email events are generated when a user starts a plan.
- Milestone email events are generated on streak milestones.
- Reminder email events are generated from profile reminder settings.
- User completion feedback is captured and reviewed in admin.
- SMTP settings are controlled from admin.

## SMTP Delivery Model

The current browser app generates auditable lifecycle email events and marks them by delivery readiness:

- `Needs email consent`: user has not provided an email and consent.
- `Needs SMTP setup`: user consent exists, but admin SMTP is not configured.
- `SMTP ready`: user consent and admin SMTP settings are present.

Admin SMTP fields:

- Provider
- Host
- Port
- Username
- From email
- From name
- Enable SMTP delivery
- SSL/TLS toggle

Default SMTP envelope configured in admin:

- Provider: `Office365 SMTP`
- Host: `smtp.office365.com`
- Port: `587`
- Username: `notify@eshipjet.ai`
- From email: `notify@eshipjet.ai`
- Test recipient for backend smoke tests: `vikas.guru@eshipjet.ai`

Security boundary:

- SMTP password/API secret must not be stored in browser localStorage.
- For production sending, put the SMTP password or mail API key in Firebase Functions, Cloud Run, or another backend secret store.
- The frontend outbox payload can be sent by that backend without changing the user/admin workflow.
- The SMTP password shared during development must be rotated before submission or production use.

## Judging Checklist Mapping

Code quality:

- Vue feature routes are separated by domain: intake, today, analytics, profile, admin.
- Shared state actions are centralized in `src/lib/state.js`.
- Tests cover store persistence, plan state, streak logic, and engagement email lifecycle.

Problem statement alignment:

- The primary user loop is habit assessment, AI plan, daily coaching, SOS, check-ins, rewards, and insights.
- The admin loop shows real operational oversight: users, risk, progress, habits, AI agents, emails, and feedback.

Security:

- Admin login is available for demo access.
- User identity can remain private as guest.
- Secrets are not embedded into SMTP settings; password delivery is documented as backend-only.
- Pasted API keys should be revoked and moved to `.env` or backend secrets.

Testing:

- `npm run test`
- `npm run lint`
- `npm run build`

Accessibility:

- Forms use labels or aria labels.
- Navigation uses real routes and semantic buttons/links.
- Layout is responsive through CSS grid breakpoints.

## Verification Commands

```sh
npm run lint
npm run test
npm run build
```

## Hackathon Talk Track

Unhook is not a static habit page. It is an end-to-end behavior-change system:

- The user chooses a harmful habit and gives real trigger context.
- AI generates a personalized plan.
- The daily cockpit captures progress and supports cravings in the moment.
- Rewards and analytics keep progress visible.
- Profile settings handle identity, reminders, lifecycle emails, and completion feedback.
- Admin controls the habit catalog, user progress, AI agents, SMTP readiness, and operational follow-up.

The strongest demo path is to show the user flow first, then immediately open admin to prove the same data is operationally visible.

## Final Submission Checklist

- [x] Real habit-selection homepage controlled from admin.
- [x] Real AI plan generation path wired through configured Gemini key.
- [x] Multi-agent plan/coach orchestration controls in admin.
- [x] Private guest mode and optional identity sync path.
- [x] Daily check-in, streak, reward, SOS, coach, content, and insights loop.
- [x] Admin dashboard with users, user-level progress, risk, and habit focus areas.
- [x] Admin habit catalog controls for visible frontend cards.
- [x] User profile with contact consent, reminders, feedback, and lifecycle outbox.
- [x] SMTP envelope configured from admin with Office365 defaults.
- [x] SMTP secret kept out of frontend source and documented as backend-only.
- [x] 10 demo users available for admin evaluation.
- [x] Readiness documentation and credentials included.
- [x] `npm run lint` passes.
- [x] `npm run test` passes.
- [x] `npm run build` passes.
