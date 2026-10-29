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
- **Mobile is not App-Store-ready:** no native build has been produced, the icon is a placeholder, and
  it needs your Apple Developer account. (See `docs/launch/IOS_APP_STORE_SUBMISSION.md`.)
- **Production gates** (the platform's A–G launch gates) are not closed; multi-country is fail-closed
  (Canada/QC only today).
- Arabic / RTL is **not** implemented yet.

## Separate (kept isolated on purpose)
- **Landing site** — `~/Projects/joblop-landing` (joblop.com + the movies) — its **own repo**, untouched.

## One manual step
Set **`joblop-platform` as the repo's default branch** on GitHub (Settings → Branches) so it's what the
repo shows first.
