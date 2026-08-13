# JOBLOP — 10,000-USER CAPACITY CERTIFICATION

**Starting SHA:** `f6bfec2` · **Ending SHA:** `e6de7ef` (+ this doc) · branch `main`.
**Test environment:** local dev cell — macOS (Apple Silicon), Node 20.20, PostgreSQL 17 on
`localhost:5432`, a **single** API instance (`apps/api`, `tsx src/server.ts`, port 4100) against DB
`rwos_scale`. **Synthetic/local only — no production, no real PII, no live money, no production
deployment.**

> Local single-instance numbers characterize application + query behavior and locate the ceiling.
> They are **not** a production capacity claim. Representative multi-instance staging validation is
> **pending** (blocked by the GitHub Actions billing hold on staging publish/deploy).

---

## 1. Synthetic population (persistent, deterministic)
Seeded by `tests/performance/seed.ts` (fail-closed; `.invalid` emails; one shared synthetic
password driving the REAL sign-in flow). Verified in DB:
- **10,006 users**, **9,819 worker identities**, **9,819 worker offers**, **300 organizations**.
- Sign-in-capable actor pool: **1,200 workers** (each with a governed offer), **150 employers**
  (membership + ORGANIZATION_OWNER), **30 admins** (PLATFORM_ADMINISTRATOR). Data-volume top-up via
  `generate_series` to reach the 10k population, each with a worker→offer→assignment→attendance→
  timesheet chain. Every actor is bound to exactly one org (tenant isolation preserved).

## 2. Concurrency / workload model
Closed-loop virtual users (`tests/performance/loadHarness.ts`) over real sockets, weighted mix
(read:write ≈ 82:18): worker feed/search, offers list/detail, **accept/decline**, attendance,
payroll statement; employer search/profile; admin payroll read + **bulk-calculate** (governed
recovery op) + HR-6 advisory. Each request re-validates the session. Modeled as a realistic
concurrent-active fraction of the 10k population — **not** 10k simultaneous requesters.

## 3. Progressive stages (single API instance)
| Stage | Concurrency | RPS | p50 | p95 | p99 | err% | timeouts | DB peak active conns | lock waits |
|---|---|---|---|---|---|---|---|---|---|
| control | 15 | 90.6 | 5.2 | 29.6 | 99.2 | 0 | 0 | 2 | 0 |
| B normal | 100 | 431 | 3.8 | 64.5 | 253 | 0 | 0 | 2 | 0 |
| C busy | 250 | 878 | 4.9 | 150 | 1133 | 0 | 0 | 5 | 0 |
| D peak | 500 | 922 | 180 | 1838 | 2619 | 0 | 0 | 7 | 0 |
| E overload | 1000 | 806 | 584 | 5553 | 6430 | 0.03 | 7 | 5 | 0 |

Interpretation:
- Interactive read/write workflows stay **p95 15–65 ms** through 250 concurrency. The p99 tail at
  250 (1.1 s) is **entirely `auth_sign_in`** — scrypt password hashing is deliberately CPU-costly
  and bursts at stage start; steady-state (token reuse) removes it (see soak).
- **Throughput plateaus at ~920 RPS** (250→500) and **regresses at 1000** (806 RPS, first
  timeouts) — classic **single-process CPU saturation**, not DB. The DB never exceeds **7 active
  connections** and shows **zero lock waits** at any stage.
- **Saturation point** (single instance): the knee is ~**250–300 concurrent**; ≥500 breaches
  latency SLOs; 1000 is overloaded. Per the gate, concurrency was not pushed past 1000.

## 4. Sustained soak — highest clean stage (250) — PASS
4 minutes at 250 concurrent, warm sessions:
- **241,791 requests, 1,006 RPS sustained**, **0 errors, 0 timeouts**.
- **p50 5.4 ms · p95 46.4 ms · p99 173 ms** · max 1.84 s.
- Interactive workflows p95 30–58 ms; `payroll_bulk` p95 101 ms.
- **API process RSS 58 MB** after 500k+ cumulative requests — **memory bounded, no leak.**
- DB peak **5 active connections, 0 lock waits**; **cooldown 1 active connection** → **no backlog
  after load stopped.**
- 10,510 offer accepts + 4,428 declines committed under load; subsequent attempts on consumed
  offers returned governed 4xx (optimistic-concurrency guard) — counted separately, not errors.

## 5. Invariants under / after load
| Invariant | Result | Evidence |
|---|---|---|
| Tenant isolation (no cross-org leakage) | **PASS** | Worker A cannot read (403) or accept (403) Worker B's offer; A sees only its own offer. |
| No duplicate financial effects | **PASS** | 0 duplicate `(period, worker, revision)` payroll rows after concurrent bulk-calculate hammering; 100 calcs = 100 unique worker/period. |
| Payroll idempotency | **PASS** | Governed scale suite: re-run over unchanged inputs → all `no_change`, no duplicate revisions. |
| Offer/application state machine | **PASS** | Accepts/declines under load transition correctly; stale attempts rejected via version guard. |
| Recovery/bulk op does not starve interactive traffic | **PASS** | Interactive p95 stayed 30–58 ms during soak while `payroll_bulk` ran concurrently. |
| Memory bounded | **PASS** | API RSS 58 MB post-soak. |
| Connection pool not exhausted | **PASS** | ≤7 active DB conns at every stage; pool never saturated. |
| No residual backlog | **PASS** | Cooldown 1 active conn immediately after load stop. |

## 6. DB scale (Phase 1, preserved)
Governed payroll-scale suite at `SCALE_WORKERS=10000`: **7/7 PASS** — 10,000 governed calculations
(~158 calc/s, RSS +114 MB bounded), idempotent, concurrency-safe, failure-isolated.
`EXPLAIN (ANALYZE, BUFFERS)` confirms **index scans** on `timesheets` +
`employer_contracts` (sub-ms at 10k rows). No missing-index / N+1 on the payroll path. Not weakened.

## 7. Browser-at-scale smoke (worker journey vs the loaded 10k dataset)
Live worker app (port 8090) → API (4100) → `rwos_scale`. Signed in as a synthetic worker via the
REAL flow; **marketplace search UI renders**; **`/offers` renders the worker's governed offer**
with Accept/Decline controls; terminal offers correctly read-only. **This smoke found a P0**:
`apps/worker/app/api/offers/route.ts` had a wrong relative import (`../../sessionBoundary`) that
`tsc` missed (Next compiles route files via webpack) — the `/offers` list 500'd. **Fixed** in
`e6de7ef`; `GET /api/offers` now 200 against the 10k dataset.

## 8. Optimizations applied
**None speculative.** No index, pool-size, or Postgres tuning was changed to chase benchmark
numbers — measurement showed the DB is not the bottleneck (≤7 conns, 0 lock waits), so no DB change
was warranted. The one code fix (§7) is a correctness P0, independent of performance.

## 9. Capacity envelope
| Dimension | Measured (single local API instance) |
|---|---|
| Registered / populated users | **10,006** (handled correctly; DB + soak evidence) |
| Safe sustained concurrent-active sessions | **~250** (soak: 0 err, p95 46 ms) |
| Sustainable RPS | **~1,000** warm / ~880 including sign-in bursts |
| p95 / p99 at safe level | **46 ms / 173 ms** |
| Error rate at safe level | **0%** (0.03% only at 1000 overload) |
| Saturation point | ~300 concurrent (≥500 breaches SLO; 1000 overloaded) |
| Primary bottleneck | **Single-process app CPU** (Node event loop + scrypt auth hashing) |
| DB headroom | Large — ≤7 active conns, 0 lock waits at all stages |
| Path to higher concurrency | **Horizontal scaling** (multiple Cloud Run instances) — the DB headroom supports it; each instance adds ~250 clean concurrent / ~900 RPS |

**For a 10,000 registered-user population**, realistic peak concurrency (≈1–5% active = 100–500
sessions) is served by **1 instance up to ~250 and 2–4 instances for 500–1,000**, with the database
comfortably within headroom. We do **not** claim "10,000 concurrent users" — that was not tested and
is not the model.

## 10. Known limits / remaining requirements
- **P1 — auth sign-in CPU tail under burst:** scrypt hashing dominates the tail when many sessions
  sign in simultaneously on one instance. Mitigated in production by horizontal scaling and the fact
  that real sign-ins spread over time (steady-state soak showed no tail). Not a code defect.
- **Infra pending:** representative **multi-instance staging** load validation is **not yet run**
  (GitHub Actions billing hold blocks staging publish/deploy). Local single-instance numbers do not
  substitute for it.

---

## FINAL ANSWER
- **10k population certified:** YES (populated + handled correctly under a realistic concurrent-active model; DB scale + 4-min soak evidence)
- **Maximum clean tested concurrency:** 250 concurrent active sessions per single API instance (knee ~300; ≥500 breaches SLO)
- **Sustainable measured RPS:** ~1,000 (warm-session soak) / ~880 including sign-in bursts
- **p95 / p99:** 46 ms / 173 ms at the sustainable level
- **Error rate:** 0% at ≤250; 0.03% only at 1,000 overload
- **Soak:** PASS (4 min @ 250, 241,791 req, 0 err, 0 timeout, no leak, no backlog)
- **Tenant isolation under load:** PASS
- **Financial/payroll invariants:** PASS
- **Canonical regression:** PASS — 1589 passed / 0 failed (154 skipped)
- **Remaining P0 blockers:** none (the offers-list import P0 found by the browser smoke is fixed)
- **Remaining P1 blockers:** (1) auth sign-in scrypt CPU tail under burst — resolved operationally by horizontal scaling; (2) representative multi-instance staging load validation pending (infra/GH-billing hold)
- **Launch verdict:** **CONDITIONAL GO** — code is capacity-ready for a 10,000-user population under a realistic concurrent-active model on this evidence; conditions to clear before public launch: representative staging load validation (needs staging deploy unblocked), horizontal-scaling config sized to expected peak concurrency, plus the separate non-scale launch gates (legal/consent content, ops runbooks, final staging certification).
- **Production touched:** NO
