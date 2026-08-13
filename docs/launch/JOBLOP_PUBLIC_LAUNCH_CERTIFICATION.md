# JOBLOP — PUBLIC LAUNCH CERTIFICATION

**Candidate release SHA:** `9ac589b8b4370b767da25ae58b67e97dbfc4d5c9` (`9ac589b`), branch `main`.
**Date:** 2026-08-13. **Production data used:** NO · **Real money moved:** NO · **Public cutover
performed:** NO.

This certifies **application readiness** and records the **external/owner activation** items that
gate public launch. It deliberately separates the two (per the gate): the code is proven; the
production activation path is externally blocked.

---

## 0. External blocker — GitHub Actions (verified, not assumed)
The governed staging pipeline (publish SHA-tagged images via Actions+WIF → Terraform runtime
deploy) **cannot run**. The latest `Publish Staging Images` dispatch (run `31666720460`) and every
recent workflow — including the trivial push-triggered `Foundation Validation` — fail at **job
startup in 4–13 s** with GitHub's verbatim annotation:

> "The job was not started because recent account payments have failed or your spending limit needs
> to be increased. Please check the 'Billing & plans' section in your settings"

This is an **account-level billing hold on the owner's GitHub account** — an owner/external action,
not a code defect. Per the order I did **not** re-trigger builds. **Consequence:** staging steps
§1–§6 of this gate (publish candidate, align staging, qa-reset recovery, multi-instance validation,
staging soak, deployed-candidate browser cert) **cannot be executed from here** — they require a
running Actions pipeline and (for qa-reset) the private-IP staging database.

## 1. Application readiness — proven at `9ac589b` (staging-independent)
| Check | Result | Evidence |
|---|---|---|
| Canonical regression | **PASS — 1589 / 0** (154 skipped) | `pnpm test` |
| Typecheck | **PASS** | `tsc -b tsconfig.build.json` |
| Next production build — worker | **PASS** | `/offers` + all routes compile |
| Next production build — employer | **PASS** | build clean |
| Next production build — admin | **PASS** | build clean |
| BFF import-defect class (the browser-smoke P0) | **CLEARED** | audited every `sessionBoundary` import across worker/employer/admin — all depths correct; the offers-list outlier fixed in `e6de7ef`; all 3 apps now build clean (webpack resolves what tsc skipped) |
| 10,000-user capacity (local single instance) | **CERTIFIED** | `docs/scale/JOBLOP_10000_USER_CAPACITY_CERTIFICATION.md` |
| Tenant isolation under load | **PASS** | cross-worker read+accept → 403 |
| Payroll/financial invariants under load | **PASS** | 0 duplicate `(period,worker,revision)`; idempotent |
| Worker browser journey (local, vs 10k data) | **PASS** | sign-in → marketplace → `/offers` render + controls |

## 2. Staging validation — NOT ATTEMPTED (blocked by §0)
Steps §2 (align staging), §3 (qa-reset), §4 (multi-instance 250/500/1,000), §5 (staging soak), §6
(deployed-candidate browser cert) were **not executed** because no candidate can be deployed to
staging while Actions is billing-blocked, and staging's DB is private-IP (unreachable from the dev
cell). No stale mixed-release config was deployed; nothing in staging was mutated.

## 3. Launch blocker matrix recheck (vs `9ac589b`)
`docs/evidence/JOBLOP_LAUNCH_BLOCKER_MATRIX.md` holds. Delta since it was written:
- Worker offer accept/decline loop: **NEEDS FIX → READY (local)** — UI shipped (`8ec1c77`) + the
  list-route P0 fixed (`e6de7ef`), browser-verified against 10k data.
- Baseline regression: **red → green** (`189302a`, 1589/0).
- Staging (item 25): remains **NEEDS INFRA/OWNER** — now with the exact blocker (GH billing) named.
No new P0 code defect found in this audit.

---

## FINAL REPORT
- **Final release SHA:** `9ac589b8b4370b767da25ae58b67e97dbfc4d5c9`
- **10k population:** PASS (local)
- **250 staging concurrency:** NOT ATTEMPTED (staging deploy blocked — GH Actions billing)
- **500 staging concurrency:** NOT ATTEMPTED (same blocker)
- **1,000 staging concurrency:** NOT ATTEMPTED (same blocker)
- **Highest clean staging concurrency:** N/A (staging not deployed) — local single-instance clean level = 250
- **Sustainable staging RPS:** N/A — local = ~1,000
- **p95 / p99:** N/A staging — local = 46 ms / 173 ms
- **Error/timeout rate:** N/A staging — local = 0%
- **Soak:** NOT ATTEMPTED on staging — local 4-min@250 = PASS
- **Autoscaling:** NOT ATTEMPTED (requires multi-instance staging deploy)
- **DB/pool headroom:** PASS local (≤7 conns, 0 lock waits); staging NOT ATTEMPTED
- **Tenant isolation:** PASS (local, under load)
- **Payroll/financial invariants:** PASS (local, under load)
- **Browser critical journeys:** PARTIAL — worker sign-in/search/offers/accept-decline verified locally vs 10k data (found+fixed a P0); full deployed-candidate + employer/admin cert NOT ATTEMPTED (blocked)
- **qa-reset:** NOT ATTEMPTED — staging DB private-IP + no deploy pipeline (blocked)
- **Canonical regression:** 1589 passed / 0 failed / 154 skipped
- **Remaining P0:** none (code)
- **Remaining P1:** (1) auth sign-in scrypt CPU tail under burst — resolved operationally by horizontal scaling, no code change; (2) multi-instance staging load validation not yet performed (blocked externally)
- **Owner / external activation items (exact):**
  1. **Restore GitHub Actions billing** on the owner account (Billing & plans) — unblocks everything below.
  2. Publish immutable **`9ac589b`** SHA-tagged images via the governed `Publish Staging Images` workflow (never the stale `64c06a9`).
  3. Terraform runtime deploy so **all 9 services resolve to the `9ac589b` source revision**; verify each revision/digest + `/health`+readiness.
  4. Governed **qa-reset** recovery of `RWOS_QA_RESET_PERSISTENCE_CONFLICT` (needs in-VPC/staging DB access).
  5. **Multi-instance staging load test** with the committed harness (250 → 500 → 1,000-if-healthy) + soak.
  6. **Staging browser certification** of worker/employer/admin critical journeys against the deployed candidate.
  7. **Horizontal-scaling sizing** (Cloud Run min/max) for expected peak concurrency.
  8. Non-scale launch gates: owner-approved **legal/consent content**, **ops/backup/DR/IR runbooks**, production **secrets/DNS** activation.
- **Production data used:** NO
- **Real money moved:** NO
- **Public cutover performed:** NO
- **Launch verdict:** **CONDITIONAL GO** — JobLop's **application code is launch-ready** at `9ac589b`
  (regression green, all apps build, 10k capacity certified locally, no known P0). Public launch is
  **gated on external/owner activation**, foremost the **GitHub Actions account billing hold**,
  which currently makes the required staging deployment and multi-instance validation impossible
  from here. This is not a code NO-GO; it is a **blocked-on-owner** state. Once billing is restored,
  items 2–8 above are the remaining path to a PUBLIC LAUNCH GO.
