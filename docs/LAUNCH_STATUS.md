# JobLop — unified platform status

Repo: **github.com/mohamedalmashhour/joblop** · Branch: **`joblop-platform`** (tip `fcf7730`)
Consolidated from `money-phase1-on-live` (the full platform) + the new mobile app + the payout engine.

## What's in it (the months of work, in one branch)
- **Web platform:** worker / employer / admin apps, **JobScanner** (Adzuna), **CV builder**, employer
  **invoice → Stripe TEST collection**, **bilingual pricing**, **print-maps**, the **"How it works"** page.
- **Money flow:** worker **payout engine** (48h dispute window + 14-day hold + background progression),
  all **TEST-mode / gated** (`FINANCE_LIVE_ENABLED` off; no live key, no real money).
- **Mobile (JobLop worker app):** Home dashboard, open-shift **marketplace** (browse + apply), **My
  Shifts** (applications + assignments), **Attendance** (check-in/out), **Timesheets**
  (confirm/dispute), **Earnings** (payout ledger), **pay-channel onboarding** — all on real backend data.

## Verified
- Migrations manifest PASS · config tsc + 43 tests · mobile tsc + 134 tests. Payout work independently
  tested earlier (api suite). The merge was clean.

## Honest launch status — NOT yet "go-live"
This is a **consolidated, buildable, test-mode** platform, not a production launch. Before any real
launch:
- **Payments are OFF by design** (test-mode only). Going live needs the money licence + KYC/AML + CPA
  sign-off — out of scope and gated.
- **Mobile:** the real JobLop brand icon is now in the app; a **native build still hasn't been
  produced** and it needs your Apple Developer account. (See `docs/launch/IOS_APP_STORE_SUBMISSION.md`.)
- **Production gates** (the platform's A–G launch gates) are not closed; multi-country is fail-closed
  (Canada/QC only today).
- Arabic / RTL is **not** implemented yet.

## Launch plan (in order) — what unblocks a real go-live

**1. Test-mode pilot launch (soonest; no real money).**
- Deploy the worker + employer web apps (already live on Render in test mode) under joblop.com, with the
  STAGING / "no real payment" banner on. Real users can post jobs, apply, schedule, do timesheets;
  payments show as test/pending. *Owner:* DNS + hosting config. *Me:* banners/config if needed.

**2. Mobile app build + submission.**
- Icon ✅ done. *Owner:* Apple Developer account → App ID `com.joblop.app` → `eas build -p ios` →
  TestFlight → submit. *Me:* finalize eas/app.json, fix the first native build if it surfaces issues.

**3. Licensed real-money switch (LAST — never before the licence).**
- The payout + invoice engines are **built design-for-real behind the gate**; nothing live runs today.
  The go-live switch is: money-transmitter/payout **licence** (or authorized partner) → **KYC/AML** live
  → **CPA sign-off** → verified **live Stripe** entity → only THEN flip `FINANCE_LIVE_ENABLED` with the
  recorded CPA reference. This is an **owner + accountant** action with legal sign-off; it is deliberately
  not something an agent can or should flip, and must never be flipped before the licence is in hand.

## Separate (kept isolated on purpose)
- **Landing site** — `~/Projects/joblop-landing` (joblop.com + the movies) — its **own repo**, untouched.

## One manual step
Set **`joblop-platform` as the repo's default branch** on GitHub (Settings → Branches) so it's what the
repo shows first.
