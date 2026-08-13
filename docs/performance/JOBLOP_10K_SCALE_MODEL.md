# JobLop — 10,000-User Scale Model (assumptions, workload, SLOs)

Governing gate: **JOBLOP — 10,000-USER SCALE READINESS GATE**. RC under test: `main` @
`189302abc184fd97318d0d3db681aaba5e7956d7` (canonical regression green, 1589 passed). This
document fixes the *assumptions* the gate requires before any numbers are produced. It is a
**capacity-validation** model, not a claim that 10k users are "supported" — the final claim
must be an evidence-backed envelope (§13).

## 1. What "10,000 users" means
A **modeled registered population of 10,000 users**, not 10,000 simultaneous requesters. Real
staffing marketplaces have a small fraction of the registered base active at once. We test a
10k-row dataset under realistic *concurrency*, and separately push concurrency to find the
ceiling.

### Population composition (deterministic proportions)
| Cohort | Share | Count | Notes |
|---|---|---|---|
| Workers | 85% | 8,500 | job seekers; the read-heavy majority |
| Employer / manager users | ~13.5% | 1,350 | spread across organizations |
| Admin users (platform / payroll / dispatch) | ~1.5% | 150 | elevated roles |
| **Total** | 100% | **10,000** | |

Supporting entities (proportioned to the population, deterministic by index):
| Entity | Target volume | Rationale |
|---|---|---|
| Employer organizations | 300 | ~4.5 employer users + workplaces each |
| Workplaces / residences | ~900 | ~3 per org |
| Job requests | ~3,000 | ~10 per org, mixed open/closed |
| Worker offers (+ terms version) | ~6,000 | ~2 per job request, mixed states |
| Assignments | ~3,500 | accepted offers → assignments |
| Approved worked-time / schedule rows | ~20,000 | multiple shifts per assignment |
| Attendance events | ~20,000 | check-in/out per shift |
| Timesheets | ~10,000 | ~1 per worked shift block |
| Payroll periods | ~600 | ~2 per org |
| Payroll calculations | ~8,500 | ~1 per worker per period (synthetic, non-disbursing) |

All data is **synthetic, deterministic (seeded PRNG by row index), no real PII, local Postgres
only** — never production. Payroll remains a synthetic governed calculation; **no money moves.**

## 2. Concurrency profiles
Concurrency = number of virtual users issuing a request, thinking, and issuing the next
(closed-loop, with think-time). Derived from the population, not arbitrary.

| Stage | Concurrent sessions | Purpose |
|---|---|---|
| A — dataset / light | 10–25 | correctness at 10k data volume, warm caches, baseline latency |
| B — normal | 100–250 | expected steady-state operating load |
| C — busy | 500 | shift-change / morning-rush style burst |
| D — peak | 1,000 | modeled maximum target |
| E — controlled overload | 1,000 → until saturation | locate the ceiling / saturation point |

Rationale for the peak: 1,000 concurrent of 10,000 registered = **10% simultaneous active**,
which is already aggressive for a staffing marketplace (real simultaneity is typically 1–5%).
Finding 1,000 sustainable would imply comfortable headroom for 10k registered.

## 3. Workload mix (weighted by expected usage)
Every request carries session validation (cookie/token) as implicit overhead. Weights below are
the *action* distribution — read-heavy, as marketplaces are.

| Weight | Workflow | Endpoint(s) (representative) | R/W |
|---|---|---|---|
| 28% | Worker job feed / search | `POST /marketplace/search`, `GET /marketplace/jobs/:id` | R |
| 12% | Worker offers list / read | `GET /worker/offers`, `GET /worker/offers/:id` | R |
| 5% | Offer accept / decline | `POST /worker/offers/:id/accept|decline` | W |
| 14% | Employer workforce / calendar reads | `GET /calendar/requests`, employer BFF reads | R |
| 8% | Assignment reads | `GET /platform/assignments...`, employer assignment views | R |
| 7% | Attendance check-in/out | `GET /worker/attendance` + check-in/out writes | R/W |
| 8% | Timesheet reads / submit / review | `GET /worker/timesheets/:id`, employer review | R/W |
| 7% | Payroll calc / review reads | `GET /platform/payroll/...` (authority-gated) | R |
| 3% | HR-6/6.1 advisory reads | `GET /platform/payroll/calculations/:id/ai-review` | R |
| 8% | Admin queries | admin HR / calendar / payroll consoles | R |

Read:write ≈ **82 : 18**. Writes are governed and idempotent/optimistic-concurrency-guarded.

## 4. Hard invariants (checked every run)
- No cross-org leakage (Org A never sees Org B) — sampled assertion under load.
- No lost writes; no duplicated attendance/timesheet/payroll effects (optimistic-concurrency).
- Payroll calculations deterministic (fingerprint stable across replays).
- HR-6/6.1 stays advisory / non-authoritative; cannot mutate/approve/lock/pay.
- No real money execution; no synthetic-test bypass active outside `local`/`test`.

## 5. Metrics captured (per stage, per endpoint)
Throughput/RPS · p50/p95/p99 latency · error rate (excluding intended governance 4xx) ·
timeout rate · active DB connections · pool saturation · app CPU/mem · Postgres CPU/IO/waits ·
slow queries (`pg_stat_statements`) · lock waits · cache hit ratio · backlog/queue depth.

## 6. Explicit SLO targets (PASS thresholds)
| Class | p95 | p99 | Notes |
|---|---|---|---|
| Reads | ≤ 400 ms | ≤ 800 ms | feed/list/detail |
| Writes | ≤ 700 ms | ≤ 1500 ms | offer/attendance/timesheet |
| Governed error rate | < 0.5% | — | excludes intended 401/403/409 |
| DB pool headroom | ≥ 20% idle at peak | — | no sustained saturation |
| Backlog | bounded (no unbounded growth in soak) | — | §7 stability |

A profile that sustains its SLOs under stage D (1,000) with headroom = PASS at that envelope. If
only a lower concurrency sustains SLOs, the report states that **exact safe envelope** (not a
blanket pass/fail).

## 7. Infrastructure honesty
These runs execute on a **local dev cell** (laptop + local Postgres). Local numbers characterize
*application/query* behavior and locate code-level bottlenecks; they are **not** a production
capacity claim. Representative staging/production validation is a separate step (§11) and is
currently **blocked** by the GitHub Actions billing hold on staging publish/deploy — so final
infrastructure validation is reported as **pending** until staging is reachable with synthetic data.

## 8. Stop conditions
Stop only at the final capacity certification (§16) or on a genuinely unsafe/unresolvable
blocker (e.g. a correctness/invariant failure that cannot be fixed within scope, or a required
destructive/production action — which is out of bounds).
