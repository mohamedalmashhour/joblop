# JobLop — 10,000-User Scale Evidence (running log)

RC under test: `main` @ `189302a…` (advanced to include the scale-model + this evidence).
Environment: **local dev cell** — macOS, Postgres 17 (`localhost:5432`), Node 20. Local numbers
characterize application/query behavior and locate bottlenecks; they are **not** a production
capacity claim (representative staging validation pending — GH-billing hold). Synthetic data
only, no real PII, no money execution.

## Test bed
- DB: `rwos_scale` (fresh), `prisma migrate deploy` (35 migrations), catalogue seeded
  (`seedDevelopmentCatalogue` → 4 work groups, 17 role definitions, 8 access roles).
- Deterministic bulk seed: `generate_series` + `md5('<entity>-<tag>-'||g)::uuid` chains
  (users → worker_identities → worker_offers → terms → assignments → attendance → timesheets),
  reused from the governed `tests/integration/postgres-payroll-scale.test.ts`.

## Phase 1 — DB-level payroll scale @ 10,000 workers — PASS
Command:
`RWOS_TEST_DATABASE_URL=…/rwos_scale SCALE_WORKERS=10000 vitest run tests/integration/postgres-payroll-scale.test.ts`

Result: **7/7 passed.** Instrumented headline (test's own log):
```
[SCALE] 10000 workers, 40 pages, 63149ms, 158 calc/s, RSS growth 114.3MB
```
- **10,000 governed payroll calculations** over 40 bounded pages (250/page). Throughput
  **~158 calc/s** (heaviest compute+write path); wall time varied 19–63s across runs on a
  loaded laptop — treat 158 calc/s as the conservative instrumented figure.
- **Memory bounded**: RSS growth 114.3 MB for the full 10k sweep (no unbounded growth).
- **Idempotent**: re-run over unchanged inputs → all `no_change`, zero duplicate revisions.
- **Concurrency-safe**: duplicate concurrent bulk requests create no duplicate revisions.
- **Failure-isolated**: one invalid worker fails with a governed reason; valid workers succeed.

### DB query health at 10k rows (`EXPLAIN (ANALYZE, BUFFERS)`)
All hot payroll queries use **Index Scans**, not sequential scans, with sub-millisecond
execution at 10k-row table sizes:
- `timesheets` lookup → `timesheets_worker_identity_id_status_start_idx` (Index Cond on
  worker_identity_id + status + scheduled_start range), exec ~0.04 ms.
- `employer_contracts` effective-rate lookup → `employer_contracts_organization_status_idx`,
  exec ~0.04 ms.
No missing-index / seq-scan / N+1 signature surfaced on the payroll bulk path at 10k.

**Phase 1 verdict:** the payroll calculation layer — the heaviest write/compute workflow —
handles a 10,000-worker dataset correctly, deterministically, with bounded memory and
index-backed queries. No P0/P1 DB defect found on this path.

## Pending (not yet evidenced)
Phase 1 proves one (heavy) workflow at data volume. The capacity certification still requires:
- **Mixed-workload HTTP load generator** exercising the weighted workflow mix (§3 of the scale
  model) against a live API over real sockets — not in-process `app.inject`.
- **Progressive concurrency stages B–E** (100 → 250 → 500 → 1,000 → overload) with p50/p95/p99,
  error/timeout rate, DB connections + pool saturation, CPU/mem, PG waits/locks per stage.
- **Sustained soak** at candidate operating levels (leak / pool-exhaustion / backlog watch).
- **Cross-org isolation + lost-write invariants sampled under concurrent load.**
- **Browser critical journeys against the 10k dataset** (pagination/filter/timeout behavior).
- **Capacity envelope** (§13): safe sustained concurrency, saturation point, primary bottleneck.

Next build: the durable mixed-workload load harness under `tests/performance/` + a runbook,
then stages B–E. Final claim will state the exact envelope, never a blanket "supports 10,000".
