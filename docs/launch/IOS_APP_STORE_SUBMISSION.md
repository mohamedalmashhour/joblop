# iOS App Store submission — prep + checklist (`apps/mobile`)

Status: **build config prepped; NOT yet submission-ready.** This documents exactly what was set up in
the repo and what remains owner-only. The app is an Expo SDK 57 React Native app; the production entry
is `apps/mobile/src/ProductionApp.tsx`.

> Honest readiness note — read before submitting.
>
> **Navigation (done).** The production app is no longer a single screen. `ProductionApp.tsx` now
> mounts `src/navigation/WorkerNavigator.tsx` — a dependency-free stack + bottom-tab navigator (Home
> hub, Available, My Shifts, Calendar, Earnings, plus Shift details → Apply → Success, Offer /
> Confirmation / Application details, Attendance → Timesheet, and the onboarding flow) behind a
> sign-in gate. Verified: it bundles (`expo export`, 382 modules) and renders/navigates in a browser.
> This addresses the single-screen **Guideline 4.2** rejection risk.
>
> **Data (not done).** Sign-in/up and the worker calendar/offers use the **real** API transport, but
> several screens (shift discovery, applications/offers, attendance, timesheet, earnings) are still
> **fixture-backed** and each self-discloses that on screen. `app.json` still carries
> `extra.foundationOnly: true` and version `0.1.0`. Wiring those screens to real backend endpoints is
> the remaining product work before this is a true production app — and the production API origin
> (`EXPO_PUBLIC_RWOS_API_ORIGIN`) must be set, or sign-in shows "account service is not configured".
> This prep makes the app *buildable, navigable and submittable*; real-data completeness is still open.

## What was prepped in the repo (done here)

- **`app.json` iOS config**: `icon`, `ios.buildNumber: "1"`, `ios.supportsTablet: false`, and
  `ios.infoPlist.ITSAppUsesNonExemptEncryption: false` (export-compliance: the app uses only standard
  HTTPS, so this answers the encryption question and avoids the per-build prompt). Android adaptive
  icon + web favicon also wired. Verified with `expo config --type public` (resolves clean).
- **`eas.json`**: `development` (simulator dev client), `preview` (internal, staging tier), and
  `production` (store build, `autoIncrement`) build profiles, plus a `submit.production.ios` block with
  **placeholder** `appleId` / `ascAppId` / `appleTeamId` to fill in.
- **Placeholder app icons** at `apps/mobile/assets/` (`icon.png`, `adaptive-icon.png`,
  `splash-icon.png` 1024×1024; `favicon.png`). These are a **navy placeholder, not final brand art** —
  replace before release.
- Mobile suite still green (100 tests), lint + typecheck clean.

## Owner-only — I cannot and must not do these

These need your Apple account and credentials; perform them yourself.

1. **Apple Developer Program** membership (active), and an **App ID** registered for the bundle
   identifier (see decision below).
2. **App Store Connect app record** — create the app, then put its numeric **ascAppId**, your
   **appleId** email, and **appleTeamId** into `eas.json` → `submit.production.ios`.
3. **Signing** — run `eas build --platform ios --profile production`; let EAS manage the distribution
   certificate + provisioning profile (it prompts for your Apple login). Do **not** paste certificates
   or passwords to me.
4. **Store listing** — app name, subtitle, description, keywords, **screenshots** (6.7"/6.5"/5.5" +
   iPad if you enable tablet), support URL, marketing URL, **privacy nutrition labels** (declare the
   data the app collects: email/auth via `expo-secure-store`, any analytics), and the privacy policy
   URL.
5. **Submit** — `eas submit --platform ios --profile production` (or upload the `.ipa` via Transporter),
   then submit for review in App Store Connect.

## Decisions to make before building

- **Bundle identifier / app name.** Set to **JobLop** branding: name `JobLop`, bundle id
  `com.joblop.app` (iOS + Android). Register the **App ID `com.joblop.app`** in your Apple Developer
  account to match — the bundle id **cannot be changed after first submission**. (The internal deep-link
  scheme is still `rwos://`, which is not user-visible; rename to `joblop://` later if desired.)
- **Replace the placeholder icon** at `apps/mobile/assets/icon.png` with the real 1024×1024 brand icon
  (no alpha/transparency for the App Store icon).
- **Production API origin.** The app reads `EXPO_PUBLIC_RWOS_API_ORIGIN` at build time. Set the real
  production API origin for the `production` profile (add it to `eas.json` → `build.production.env` or
  your EAS project env) — a store build must not point at localhost/staging.
- **Version source.** `eas.json` uses `appVersionSource: "remote"` with `autoIncrement`, so EAS manages
  the iOS build number (the `buildNumber` in `app.json` is just a baseline). Bump the marketing
  `version` in `app.json` per release.

## Optional follow-ups

- Add a real splash screen: `npx expo install expo-splash-screen`, then re-add the
  `expo-splash-screen` plugin block to `app.json` (it was removed here because the package isn't
  installed). `splash-icon.png` is already in `assets/`.
- This app has only ever been exported for **web** (`expo export --platform web`). A native iOS build
  via EAS has **not** been produced or verified from this machine — the first `eas build` may surface
  native-only issues (new architecture, native modules). Budget for one build-fix iteration.

## Where these changes live

The prep changes are in the working tree but were **not committed** (this checkout is on the
`feat/joblop-money-phase2-worker-payout` branch, which is unrelated to mobile and pending review).
Commit them on a **separate branch** (e.g. `chore/ios-app-store-prep`) so they don't mix with the
payout work.
