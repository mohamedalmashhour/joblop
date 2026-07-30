# Email verification + resend-code — implementation plan

Status: **repository/service/API foundation landed; Prisma model and generated migration remain
pending a database-enabled environment.**

The email-verification / resend-code subsystem is a DB-migrating change to the security-critical auth
core. It cannot be authored or verified in an environment without a database (Prisma needs a shadow DB
to generate the migration; the auth integration tests are DB-bound; `validate:migrations` guards a
tracked `checksums.json`). The pieces that do NOT need a DB are done and verified; the rest is specified
below for one focused pass with `DATABASE_URL` set.

## Done + verified (no DB required)

- **Config** (`packages/config/src/index.ts`): added `RESEND_API_KEY` + `EMAIL_FROM` (both optional),
  exposed as `resendApiKey` / `emailFrom` / `hasEmailDelivery`. Inert until both are set — STR-style
  gating. (config tsc 0, tests 15/15.)
- **Mailer capsule** (`apps/api/src/mailer/emailSender.ts` + test): isolated, SDK-free `EmailSender`.
  Keyed → POSTs to Resend's HTTP API with bearer auth; unkeyed → no-op returning
  `{status:"skipped"}` so dev can surface the code instead of sending. `verificationEmailMessage()`
  holds the copy. Dependency-injected `EmailFetch`, fully unit-tested. (api tsc 0, tests 4/4, eslint 0.)
- **Repository and service foundation** (`packages/auth/src/index.ts`,
  `apps/api/src/emailVerification.ts`): hashed-code storage contracts, replacement consumption,
  optimistic attempt updates, ten-minute expiry, five-attempt lockout, replay protection, and
  idempotent identity verification. Runtime Prisma activation remains disabled until step 1 exists.
- **Authenticated API boundary** (`apps/api/src/app.ts`): send/resend and verify routes plus a
  dedicated `email_verify_send` rate-limit action. Local code disclosure requires explicit
  non-production opt-in; production remains fail-closed.

## Design decision: additive, non-blocking (do NOT gate register)

`register` already issues a session immediately, and three shipped sign-up capsules
(employer/admin/worker) depend on that contract. Changing register to withhold the session would break
all of them + the register tests. So verification is **additive**: the user gets their session at
sign-up as today, then confirms email ownership via a code (with resend). `UserIdentity.emailVerifiedAt`
**already exists** in the schema — it is the flag to set. Whether to later gate specific actions on
`emailVerifiedAt` is a separate policy decision.

## Pending work (needs DATABASE_URL)

1. **Prisma model + migration** (`packages/database/prisma/schema.prisma`). Add `EmailVerificationCode`,
   mirroring the `Session` model:
   - `id uuid pk`, `userId uuid` (→ User, onDelete Cascade), `purpose` (enum: `email_verify`),
     `codeHash String` (store a hash, never the raw code), `expiresAt Timestamptz`,
     `consumedAt Timestamptz?`, `attempts Int @default(0)`, `createdAt Timestamptz @default(now())`.
   - Indexes: `[userId, purpose]`, `[expiresAt]`. `@@map("email_verification_codes")`.
   - Generate via `prisma migrate dev` (shadow DB) so `checksums.json` + `validate:migrations` stay
     consistent — do NOT hand-write the SQL.

2. **Repository:** implemented and locally tested. Runtime activation awaits step 1 and regenerated
   Prisma client declarations.

3. **Verification service:** implemented and locally tested with injected time, randomness, delivery,
   and repository dependencies.

4. **Endpoints** (`apps/api/src/app.ts`, authenticated, rate-limited): implemented behind the durable
   repository availability check.
   - `POST /auth/email/send-code` (also the **resend** — same endpoint, rate-limited).
   - `POST /auth/email/verify-code` `{ code }`.
   - `GET /auth/session` already returns the user; include `emailVerified` so clients can show state.
   - Optionally call send-code inside `register` so the first code is sent on sign-up.

5. **Frontend capsules** (add a post-sign-up "Verify your email" step + resend, mirroring STR's
   AuthPanel):
   - Employer/Admin (Next.js): new route handlers `POST /api/session/email/{send-code,verify-code}`
     proxying via the session gateway; a `VerifyEmailForm` shown after sign-up with a "Resend code"
     button (cooldown) and clear expired/invalid/success states.
   - Worker (Expo RN): `transport.sendEmailCode()` / `transport.verifyEmailCode(code)` on the mobile
     transport; a verify screen after `WorkerAuthScreen` sign-up with resend.

6. **Env / ops**: document `RESEND_API_KEY` + `EMAIL_FROM` (verified sending domain) in the deploy
   checklist. Until set, the flow runs in dev (code surfaced locally) and stays dark in production.

## Verification gate for the DB pass

`pnpm typecheck && pnpm test && pnpm validate:migrations` with `DATABASE_URL` set, plus the auth
integration suites (currently skipped without a DB) must run green.
