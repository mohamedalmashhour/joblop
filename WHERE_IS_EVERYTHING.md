# JobLop — where everything is (the map)

If you're ever unsure where the platform lives, it's here. Last updated by the consolidation into
`joblop-platform`.

## Code
- **On this Mac:** `/Volumes/Danny SSD/Codex/resident-workforce-os` (Danny SSD).
- **On GitHub (primary, your new account):** **github.com/mohamedalmashhour/joblop**
  - **`joblop-platform`** = the **single source of truth** — the full platform (web apps + JobScanner +
    CV builder + employer invoicing + worker payout engine + the JobLop mobile app). **Start here.**
  - `main` / `money-phase1-on-live` = older base branches (money-phase1-on-live is the full web app the
    consolidation was built from).
  - `feat/joblop-mobile-arabic` = mobile Arabic/RTL + month-calendar work (stacked on joblop-platform).

## The pieces (all on `joblop-platform`)
- **Worker web app:** `apps/worker/` — JobScanner, CV builder, how-it-works, worker flows.
- **Employer web app:** `apps/employer/` — job requests, **calendar** (`app/employer/calendar/`), invoices.
- **Admin web app:** `apps/admin/` — dispatch, **calendar** (`app/calendar/`), pricing, JobScanner admin.
- **Backend API:** `apps/api/` — Fastify; worker/employer/admin endpoints, Stripe TEST, Google Calendar
  sync (`src/googleCalendarSync.ts`), payout engine (`src/workerPayout*.ts`).
- **Mobile app (JobLop worker app):** `apps/mobile/` — Home, marketplace, My Shifts, Attendance,
  Timesheets, Earnings, pay-channel onboarding; EN/FR/AR (Arabic branch).
- **Database:** `packages/database/` (Prisma + PostgreSQL). Shared logic: `packages/shared`, config in
  `packages/config`.

## Live / hosted
- **Web app (test mode):** Render → `joblop-worker.onrender.com`.
- **Landing site (marketing, the design + movies):** a **SEPARATE repo** → `~/Projects/joblop-landing`
  → deployed at **joblop.com**. Not part of this repo on purpose.

## Status (honest)
- Everything is **test-mode**; payments are **gated OFF** (`FINANCE_LIVE_ENABLED` off). Real money needs
  a money licence + KYC/AML + CPA sign-off — owner action, never flipped before the licence.
- Mobile is **not App-Store-submitted** yet (needs the native `eas build` with your Apple account).
- See `docs/LAUNCH_STATUS.md` for the ordered launch plan.
