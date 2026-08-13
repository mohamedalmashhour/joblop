# JobLop / Resident Workforce OS — Launch Blocker Matrix

Baseline `main` = `64c06a93f0c2557a6644427410c4092e6b1a7987`. Product model: HR/staffing-dispatch
marketplace (employers pay a marketplace/service fee; **no worker payment/payroll disbursement**).
Classification: **READY** (built + proven) · **NEEDS FIX** (code/UI gap) · **NEEDS INFRA** (deploy/
provisioning) · **NEEDS OWNER INPUT** (billing/legal/human sign-off) · **NOT SUPPORTED** (out of
product scope by design). "API exists" alone is never READY.

Legend for proof tier: L=local test/browser proof committed · S=staging certification pending.

| # | Launch item | Status | Evidence / gap |
|---|---|---|---|
| 1 | Worker web app | READY (L) | routed pages; auth+nav browser-proven (`browser-local/*`) |
| 2 | Employer web app | READY (L) | onboarding/calendar/assignments/timesheets/attendance/payments pages; browser-proven |
| 3 | Admin web app | READY (L) | payroll/calendar/finance; browser-proven |
| 4 | Authentication / identity | READY (L) — hardening audit open | real `/auth/sign-in` (scrypt), httpOnly session cookies, role resolver, per-IP+account rate limiter; cross-role + revoked denials browser-proven. §3 audit: headers/CSRF/CORS/body-limits verification pending |
| 5 | Worker onboarding/profile | PARTIAL | `hr`/`verification`/`documents` pages exist; no guided multi-step onboarding wizard (non-blocking) |
| 6 | Employer org/workplace setup | READY (L) | `onboarding/{company,departments,residences}`, signup |
| 7 | Jobs / marketplace (browse/search) | READY (L) | worker marketplace/map, job detail, saved-jobs, interest |
| 8 | Worker offer / acceptance | **NEEDS FIX** | acceptance UI is thin (no explicit worker accept flow surfaced); governed backend supports it — must add UI against accepted API |
| 9 | Assignments | READY (L) | employer assignment lifecycle pages |
| 10 | Calendar / scheduling | READY (L) | employer/admin calendar; browser-proven |
| 11 | Attendance / check-in-out | READY (L) | worker check-in/out (embedded in schedule), employer attendance pages |
| 12 | Timesheets | **NEEDS FIX** | employer timesheet lifecycle complete; **no worker-facing timesheet view** — add read-only worker timesheet/worked-time surface against accepted API |
| 13 | Payroll (governed calc) | READY (L) — money-safe | HR-5.1 authoritative calc, admin console, employer/worker read-only; deterministic replay+fingerprint; DB triggers for locked immutability |
| 14 | HR-6 / HR-6.1 advisory | READY (L) | AI review/provenance/period-review/egress/telemetry — advisory-only, non-authoritative, content-free telemetry; browser-proven non-authoritative |
| 15 | Documents / storage | **NEEDS INFRA** | HR-3 provider-neutral storage; dev uses a fixture. Production must use private object storage (not local disk) — GCS wiring + isolation/size/type/retention proof needed |
| 16 | Notifications | NEEDS AUDIT | `packages/notifications` exists; real delivery path + provider config for launch-critical notices unverified |
| 17 | Organization isolation | READY (L) | API/PG + browser proofs: Org A cannot see Org B; session-scoped BFF |
| 18 | Security (headers/CSRF/CORS/limits/secrets) | NEEDS FIX/AUDIT | `isSameOriginMutation` CSRF guard, config secret validation present; §3 audit of security headers, CORS, body/request limits, and local-E2E-bypass-off-in-staging (now gated to local/test) pending |
| 19 | Database / migrations | READY (chain) — prod procedure open | 35 governed migrations; production migration+validation procedure/runbook to author (§4) |
| 20 | Observability | PARTIAL | structured redacting logger, `/health` `/ready`; staging has GCP monitoring/alert + log sink/bucket. Error-reporting + alert coverage audit pending (§7) |
| 21 | Backups / recovery | NEEDS INFRA/PROOF | Cloud SQL exists; PITR + restore + DR runbook not yet proven (roadmap D) |
| 22 | Privacy / legal surfaces | NEEDS OWNER INPUT | legal/privacy copy must be owner/counsel-approved; agent must not invent binding terms; UI must not claim inactive capabilities (§8) |
| 23 | Accessibility | PARTIAL (L) | axe (wcag2a+aa) no-critical on worker landing/employer calendar/admin payroll; broader launch-critical journeys + WebKit/responsive extension pending (§9) |
| 24 | Responsive / mobile UX | NEEDS AUDIT | not yet systematically verified across breakpoints |
| 25 | Staging environment | NEEDS INFRA/OWNER | live but **stale + release-inconsistent** (services on `d36965e`/`14c21a82`/`6b262638`); target `64c06a9` images not published; qa-reset durable-state 409 unresolved; **publish blocked by GitHub Actions billing** |
| 26 | Production configuration | NEEDS INFRA/OWNER | not prepared; strict staging/prod isolation required; owner cutover-gated |
| 27 | Money movement / payroll disbursement | **NOT SUPPORTED (by design)** | marketplace/service-fee model; no worker payment, no Stripe live, no banking/ACH/payout. Must never claim otherwise |

## Owner-gated (never agent-actioned)
Public production cutover · destructive prod DB ops · real external comms to real users · new material recurring spend · real money movement · real PII import · public DNS · binding legal text · bypassing a governance control. **Plus the current external blocker: GitHub Actions billing** (parks staging publish/deploy only).

## Execution order (independent-first, per master authorization)
1. **§2 product gaps** — worker timesheet view + worker offer-acceptance UI (against accepted APIs) → tests + browser E2E.
2. **§3 security hardening** — headers/CSRF/CORS/limits audit + P0/P1 fixes.
3. **§9 browser/accessibility** — extend governed local suite to the full launch-critical chain (Chromium+WebKit+responsive).
4. **§4/§5/§7 docs+proof** — prod migration/backup/DR/ops runbooks + document-storage production wiring.
5. **§8 legal/privacy** — audit + enumerate owner/legal dependencies (no invented terms).
6. **§11–13 staging** — resume publish/redeploy + qa-reset recovery once GitHub billing clears; certify the **final** RC (not necessarily `64c06a9` if a newer tested RC emerges).
7. **§15 FINAL LAUNCH CERTIFICATION** — GO / NO-GO with concrete remaining owner actions.

Deploy of `64c06a9` is not forced: if launch-readiness work produces a newer tested RC, that newer
SHA is what should ultimately go to staging (re-obtaining any release-specific approval).
