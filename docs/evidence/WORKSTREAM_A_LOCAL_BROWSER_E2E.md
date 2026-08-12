# Workstream A — Browser E2E Evidence Matrix (Local vs Staging)

Two proof tiers. **LOCAL BROWSER PROOF** = the disposable local harness
(`pnpm test:e2e:local`, see `docs/runbooks/LOCAL_BROWSER_E2E.md`) — a development/readiness aid,
**not** certification. **STAGING BROWSER PROOF** = the authoritative staging Playwright suite
(`tests/e2e/playwright.config.mjs` + qa-reset) — the final certification path, run against an
immutable staging release with provisioned synthetic identities.

Workstream A.1 delivers the local harness + the first authentication/denial proofs only. The full
per-journey matrix (employer/admin/worker end-to-end) is Workstream A.2.

| Journey / blocker | Roles | LOCAL BROWSER PROOF | STAGING BROWSER PROOF |
|---|---|---|---|
| Worker authentication (anon → sign in → protected → sign out) | worker | ✅ `browser-local/auth.spec.mjs` "worker …lifecycle" | ⛔ pending staging run |
| Employer authentication | employer-org-admin | ✅ "employer …lifecycle" (own-org calendar 200) | ⛔ pending |
| Admin (payroll) authentication | payroll admin | ✅ "admin …lifecycle" (`/api/payroll/periods` 200) | ⛔ pending |
| Anonymous denied on protected state | anon | ✅ (all three lifecycle tests) | ⛔ pending |
| Worker cannot reach admin payroll by URL | worker | ✅ "worker cannot reach the admin payroll surface" (403) | ⛔ pending |
| Employer cannot reach admin payroll by URL | employer | ✅ "employer cannot reach the admin payroll surface" (403) | ⛔ pending |
| Worker cannot reach employer-org surface | worker | ✅ "worker cannot reach an employer-org mutation surface" (denied) | ⛔ pending |
| Revoked/disabled account generic denial | revoked | ✅ "revoked/disabled account …generic denial" (401/403) | ⛔ pending |
| Full employer journey (request→estimate→timesheet→invoice views) | employer | ⛔ Workstream A.2 | ⛔ pending |
| Full admin journey (approval/dispatch/finance/denial) | admin | ⛔ Workstream A.2 | ⛔ pending |
| Full worker web journey (eligible assignment→acceptance→attendance→timesheet) | worker | ⛔ Workstream A.2 | ⛔ pending |
| Cross-organization A↔B denial matrix (every entity/document route) | all | ⛔ Workstream A.2 (Org A/B seed foundation prepared) | ⛔ pending |
| Browser/navigation matrix (controls, Back/Next, pagination, modal, keyboard, responsive, axe) | all | ⛔ Workstream A.2 | ⛔ pending |

## Local run result (executed)
`pnpm test:e2e:local` → **7/7 passed**, Chromium, ~1.8 min, disposable Postgres created + migrated +
seeded + dropped; API + worker + employer + admin launched on localhost.

## Staging suite status
**NOT executed** — staging environment, qa-reset service, and the 33 provisioned inputs
(remote-HTTPS origins, reset token/app-credential/manifest checksum/approval references, immutable
provider-qualified IDs) are unavailable in this environment. The staging suite and its
localhost-hostile environment policy remain untouched and are the final certification gate.
