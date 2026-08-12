# Local Disposable Browser E2E Harness (Workstream A.1)

**LOCAL TEST ONLY — NOT ACCEPTABLE AS PRODUCTION/STAGING CERTIFICATION.**
The authoritative browser certification remains the staging Playwright suite
(`tests/e2e/playwright.config.mjs` + `tests/e2e/e2e-environment-policy.ts` + the qa-reset service).
This harness exists only so critical browser journeys can be developed/proved locally while the
staging suite stays the final certification path. It does **not** replace staging certification.

## Purpose
Run the real browser sign-in / authorization journeys against locally-launched apps and a
**disposable** Postgres, using **synthetic** identities and the **real** sign-in flow (no auth
backdoor, no authorization-middleware bypass).

## Architecture
`tests/e2e/local/run.ts` orchestrates a fully disposable run:
1. create a throwaway Postgres DB (`rwos_local_e2e_<rand>`);
2. `prisma migrate deploy` (the governed migration chain);
3. seed synthetic identities (`tests/e2e/local/seed.ts`);
4. run `tests/e2e/playwright.local.config.mjs`, which launches four `webServer`s and runs the
   `tests/e2e/browser-local/**` specs in Chromium;
5. drop the disposable DB (always, in `finally`).

Ports (overridable via env): API `4100`, worker `8090`, employer `8081`, admin `8082`. Each Next app
reaches the API via `INTERNAL_API_ORIGIN=http://127.0.0.1:4100`.

## Required environment
- Local Postgres reachable at `localhost:5432` (trust/peer auth for the current `$USER`), plus
  `createdb`/`dropdb` on PATH.
- Playwright Chromium installed (`pnpm exec playwright install chromium`).
- `RWOS_LOCAL_E2E=enabled` (the `test:e2e:local` script sets it). No production/staging secrets, no
  public internet, no live providers.

## Disposable DB lifecycle
One fresh DB per run, migrated + seeded at start, force-dropped at end. Never production, never
staging, never an existing developer's persistent DB (a unique random name is generated per run).

## Synthetic identities (seeded, `.invalid` only — no real PII)
`platform-admin`, `payroll-admin`, `employer-a`, `employer-b`, `worker-a`, `worker-b`,
`revoked` — all `@local-e2e.invalid`, one synthetic password. Roles via real grants:
platform-admin → `PLATFORM_ADMINISTRATOR` platform grant; payroll-admin → `PAYROLL_ADMINISTRATOR`
platform grant; employer-a/b → `ORGANIZATION_OWNER` membership in Org A / Org B; worker-a/b →
`WorkerIdentity`; revoked → `disabled` user.

## Startup command
```bash
pnpm test:e2e:local
```
(equivalently `RWOS_LOCAL_E2E=enabled node --import tsx tests/e2e/local/run.ts`).

## Reset behavior
Stateless: every run provisions and destroys its own DB; Playwright starts/stops the app servers.

## Safety controls
- `assertLocalE2eEnabled(env)` fails closed unless `RWOS_LOCAL_E2E=enabled` **and** `RWOS_ENV` is not
  `production` — proven by `tests/e2e/local/seed.test.ts`.
- Login uses the **real** `/auth/sign-in` via each app's `/api/session/sign-in`; there is **no**
  dev-login backdoor and authorization middleware is never bypassed after login.
- The staging harness is untouched: its environment policy still requires remote HTTPS and rejects
  localhost (asserted in the same safety test); this is a separate config, not a loophole.

## Explicit statement
Local browser E2E is a development/readiness aid. It **does not** constitute production or staging
certification. Final browser certification is the staging Playwright suite driven by an immutable
staging release + provisioned synthetic identities + the authorized qa-reset service.
