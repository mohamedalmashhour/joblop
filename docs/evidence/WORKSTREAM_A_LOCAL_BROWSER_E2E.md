# Workstream A — Browser E2E Evidence Matrix (Local vs Staging)

Two proof tiers. **LOCAL BROWSER PROOF** = the disposable local harness (`pnpm test:e2e:local`, see
`docs/runbooks/LOCAL_BROWSER_E2E.md`) — a development/readiness aid, **not** certification.
**STAGING CERTIFICATION PENDING** = the authoritative staging Playwright suite
(`tests/e2e/playwright.config.mjs` + qa-reset) has **not** run here (no staging env/secrets) and
remains the final certification path.

A.1 delivered the harness + auth/denial proofs. **A.2 (this doc)** adds the full critical-journey
navigation, the Org A↔B isolation matrix, the browser/navigation/control matrix, accessibility, and
the browser-visible HR-6.1 advisory proof — all as LOCAL BROWSER PROOF.

## Executed result
`pnpm test:e2e:local` → **Chromium 17/17 passed** (~4.3 min). WebKit critical subset
(`--project=webkit browser-local/auth.spec.mjs`) → **7/7 passed** (~3.6 min). Disposable Postgres
created + migrated + seeded + dropped each run; API + worker + employer + admin launched on localhost.

## Journey matrix

| Journey | Role | Org/Tenant | Browser proof | Network/API proof | Accessibility | Result | Blocking gap |
|---|---|---|---|---|---|---|---|
| Authentication lifecycle | worker/employer/admin | A | ✅ sign in → protected page → sign out (auth.spec) | ✅ `/api/session`, `/api/calendar/requests`, `/api/payroll/periods` toggle | — | PASS (local) | — |
| Anonymous denied | anon | — | ✅ | ✅ non-200 on protected routes | — | PASS (local) | — |
| Employer critical journey | employer | A | ✅ nav calendar/assignments/timesheets/attendance/onboarding (no 404/5xx) | ✅ own-org calendar 200 | ✅ axe (calendar) no critical | PASS (local) | full mutation chain via UI deferred |
| Worker web critical journey | worker | A | ✅ nav /, schedule, pay, hr, saved-jobs, verification, documents, my-interests | ✅ `/api/session` authed; `/api/payroll/statement` no 5xx | ✅ axe (landing) no critical | PASS (local) | **WORKER TIMESHEET UI — PRODUCT GAP** (no dedicated page; pay-only) |
| Admin/payroll journey | payroll admin | platform | ✅ nav /payroll, /calendar, /finance | ✅ periods 200; ai-review advisory:true; provenance descriptive-only | ✅ axe (payroll) no critical | PASS (local) | — |
| HR-6.1 advisory non-authoritative | payroll admin | A | ✅ admin payroll surface | ✅ ai-review notice "cannot approve, lock, correct, or pay"; no `"paid"`/`disburse`; provenance "descriptive only, never authoritative" | — | PASS (local) | — |
| Worker cannot reach admin payroll by URL | worker | — | ✅ | ✅ 403 | — | PASS (local) | — |
| Employer cannot reach admin payroll by URL | employer | — | ✅ | ✅ 403 | — | PASS (local) | — |
| Worker cannot reach employer-org surface | worker | — | ✅ | ✅ non-200 (no membership) | — | PASS (local) | — |
| Revoked/disabled generic denial | revoked | — | ✅ | ✅ 401/403 | — | PASS (local) | — |
| Org A↔B isolation | employer/worker | A/B | ✅ | ✅ Employer A surfaces never contain Org B id; Worker A surfaces never contain Worker B id; employer BFF is session-scoped (no org-id route) | — | PASS (local) | full entity-by-entity matrix + platform-API org-scoping proven in prior API/PG gates |
| Longest governed chain (offer→accept→assignment→attendance→timesheet→approval→payroll) | all | A | ⏸️ views + a seeded payroll calc proven; end-to-end **mutation** chain via UI not driven | — | — | PARTIAL (local) | offer-acceptance UI thin; worker timesheet UI absent — mutation chain is a feature-completeness effort, not this proof gate |

## Navigation / control matrix
All listed critical pages returned **no 404 and no 5xx** under real authenticated navigation
(asserted in `journeys.spec.mjs`). Control classification: employer calendar/assignments/timesheets/
onboarding + admin payroll/calendar/finance + worker landing/schedule/pay/hr/saved-jobs render with
their primary controls **WORKING**; worker offer-acceptance is **PLACEHOLDER/thin** and a worker
timesheet page is a **PRODUCT GAP** (both are feature gates, not fixed here).

## Accessibility
axe (`@axe-core/playwright`, wcag2a+wcag2aa) on worker landing, employer calendar, admin payroll →
**no critical violations**. Serious/moderate warnings, if any, are deferred to Workstream C (no broad
UI redesign in this gate).

## Product gaps (reported, not built — require separate owner gate)
- **WORKER TIMESHEET UI — PRODUCT GAP** (no dedicated worker timesheet page).
- Worker offer-acceptance UI is thin (no explicit accept route).

## Staging suite status
**NOT executed** — staging environment, qa-reset service, and the 33 provisioned inputs are
unavailable here. The staging suite and its localhost-hostile policy remain untouched and are the
final certification gate. **LOCAL WORKSTREAM-A PROOF COMPLETE — STAGING CERTIFICATION PENDING.**
