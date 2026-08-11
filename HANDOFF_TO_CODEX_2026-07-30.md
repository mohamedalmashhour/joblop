# Handoff to Codex — Auth + Map + Email-verify capsules (2026-07-30)

Prepared by Claude. Branch **`main`**, HEAD unchanged at **`6385de4`**. **Nothing was committed, pushed,
or deployed.** All work below is in the working tree only. Your preserved/untracked files and in-flight
changes were **not touched** (details at the end).

---

## 1. What you asked for → what was built

Sign-up / sign-in **capsules** for the three surfaces (employer, admin, worker) + a **map capsule**
linked to the job address in each, plus a **"resend code" email-verification** capsule modelled on the
STR one. All three apps are done and verified; the email-verification **frontend + mailer foundation**
are done; the email-verification **DB backend** is specified but not built (reason in §5).

Everything is native to each app's real stack — no framework swaps, no new runtime dependencies.

---

## 2. Verification (all green, on your toolchains)

| Package | `tsc --noEmit` | tests | eslint |
| --- | --- | --- | --- |
| packages/config | 0 | 15 | 0 |
| packages/auth | 0 | 12 (frontendSession) | 0 |
| apps/employer | 0 | 115 | 0 |
| apps/admin | 0 | 102 | 0 |
| apps/mobile | 0 | 90 | 0 |
| apps/api | 0 | 58 | 0 |

Not run here (no DB in this environment): the DB-bound auth integration suites and `validate:migrations`.

---

## 3. Claude's changes this session

### Shared auth gateway — `packages/auth/src/frontendSession.ts` (+ test)
- Added `register()` to the frontend session gateway, mirroring `signIn()`: posts `/auth/register`,
  persists the token via the caller's cookie-setter, and maps backend statuses →
  `registration_closed` (404) / `conflict` (409) / `invalid` (400) / `rate_limited` (429) / `ok`.
- +2 unit tests (10 → 12).

### Employer (Next.js) — all new unless noted
- `app/signin/{page.tsx,SignInForm.tsx}` — sign-in capsule → existing `/api/session/sign-in`.
- `app/api/session/sign-up/route.ts` — sign-up route → gateway `register()`, sets the httpOnly employer
  cookie. **Registration is dev-only** (backend 404s it in production); the UI shows an honest
  "not open" state there.
- `app/signup/employer/{page.tsx (M),SignUpForm.tsx,VerifyEmailPanel.tsx}` — the placeholder page is now
  functional; success → email-verify step → `/employer/onboarding/company`.
- Map capsule `app/shared/maps/*` (OSM embed `LocationMap`, `JobLocationMap` that geocodes the job
  `addressSummary` + "Get directions", `geocodeClient`, `directions`) + `app/api/geocode/route.ts`
  (Nominatim proxy — browsers can't call Nominatim directly). Wired into
  `app/employer/calendar/request/ClientRequestDetailPanel.tsx` (M).
- `app/api/session/email/{send-code,verify-code}/route.ts` — proxy to the (future) backend
  `/auth/email/*` via the gateway; **404 → "not enabled yet"** until the backend lands.

### Admin (Next.js) — mirrors employer, styled with `@rwos/design-system`
- `app/authStyles.ts`, `app/signin/*`, `app/signup/*` (incl. `VerifyEmailPanel.tsx`),
  `app/api/session/sign-up/route.ts`, `app/api/session/email/*`, `app/shared/maps/*`,
  `app/api/geocode/route.ts`. Map wired into `app/calendar/PersistedAdminReviewPanel.tsx` (M).
- **Governance:** admin sign-up is dev-only and states plainly that creating an account **does not grant
  admin authority** (registration makes a normal user; admin roles are provisioned separately).

### Worker (Expo RN) — `apps/mobile`
- `src/auth/secureSession.ts` (M): added `signUp()`, `sendEmailCode()`, `verifyEmailCode()` to the
  transport (token in Expo SecureStore, not cookies) + `MobileRegisterState` / `MobileEmailCodeState` /
  `MobileSessionTransport` types. +6 tests (14 → 20).
- `src/features/worker-auth/{WorkerAuthScreen,WorkerVerifyEmail}.tsx` — sign-in/sign-up capsule +
  post-signup verify step.
- Map capsule `src/features/maps/{JobLocationLink.tsx,mapUrls.ts,index.ts}` — **keyless**: opens the
  device maps app (real GPS turn-by-turn) at the job address via `Linking`. Wired into `App.tsx` (M)
  (auth entry on Home; directions on offer rows).

### Mailer + config foundation
- `packages/config/src/index.ts` (M): `RESEND_API_KEY` + `EMAIL_FROM` (optional) → `resendApiKey` /
  `emailFrom` / `hasEmailDelivery`. Inert until both set (STR-style gating).
- `apps/api/src/mailer/emailSender.ts` (+ test): isolated, SDK-free `EmailSender`. Keyed → Resend HTTP
  API; unkeyed → no-op `{status:"skipped"}` so dev can surface codes without a live mailer.

### Docs
- `docs/architecture/resident-job-platform/EMAIL_VERIFICATION_IMPLEMENTATION_PLAN.md` — the turnkey spec
  for the remaining backend.

---

## 4. Design decisions (so you can veto/adjust)
1. **Registration is dev-only** by the backend contract (`/auth/register` 404s in production). Every
   sign-up UI honors that with a real "not open" state, and sign-in works in all envs.
2. **Email verification is additive / non-blocking.** `register` still issues a session immediately (the
   three capsules depend on that), and `UserIdentity.emailVerifiedAt` already exists as the flag. Verify
   is a post-signup step with "Continue — verify later". If you'd rather *gate* on verification, that's a
   separate, larger change.
3. **Maps are free + keyless.** Web = OpenStreetMap embed + a same-origin Nominatim proxy; RN = deep-link
   to the device maps app for GPS. No Google JS SDK, no billed key (deliberate — matches STR removing
   Google billing). "Google Maps" appears only as a *directions link* on mobile, which needs no key.
4. **No mocked OTP.** Rather than fake a mailer/verification, the mailer is real-but-gated and the verify
   UI degrades to "not enabled yet" until the backend exists.

---

## 5. What is NOT done — the DB-bound backend

The email-verification core is a **Prisma migration + auth-repository/service change** and could not be
authored or verified in this environment (no `DATABASE_URL`; Prisma needs a shadow DB to generate a
migration; the auth integration tests are DB-bound; `validate:migrations` guards `checksums.json`). I did
**not** build it blind. The full spec is in the plan doc; summary:

1. `EmailVerificationCode` Prisma model (mirror `Session`; store a **codeHash**) + `prisma migrate dev`.
2. Repository methods (create/find-active/consume/increment-attempts; `markEmailVerified`).
3. API verification service composing the repo + `emailSender` (generate 6-digit code, hash, 10-min
   expiry, rate-limit via `consumeAuthenticationRateLimit`; dev returns the code in the response).
4. Endpoints `POST /auth/email/send-code` (doubles as resend) + `POST /auth/email/verify-code`; include
   `emailVerified` on `GET /auth/session`.

The moment these land, the three verify-email UIs work end-to-end with **zero further frontend changes**.
Real sending switches on when `RESEND_API_KEY` + a verified `EMAIL_FROM` domain are set.

**Verification gate for that pass:** `pnpm typecheck && pnpm test && pnpm validate:migrations` with
`DATABASE_URL` set, plus the DB-bound auth suites green.

---

## 6. What was left untouched (yours)

The working tree also contains **your** pre-existing, uncommitted work and preserved files, which I did
not create, modify, or delete:
- `PHASE_1_OWNER_APPROVAL_PACK.md`, `docs/approvals/`, `docs/architecture/*OWNER_DECISION*`,
  `HUMAN_OWNER_APPROVAL_FORM.md`, `OD_06_*`, `output/`, `tmp/`, and modified
  `docs/security/DEPENDENCY_ADVISORY_REVIEW_2026-07-27.md`.
- Other modified/untracked files not in §3 (e.g. `apps/*/app/api/sessionBoundary.ts`, `EmployerShell.*`,
  `scripts/scan-secrets*.ts`, `apps/admin/app/api/sessionBoundary.test.ts`) were already changed in your
  tree when this session started — I only *read* those and built on their stable exports.

Nothing is staged or committed, so `git status` cleanly shows the union; §3 is the exact list of mine.
