# Resident Workforce OS Launch Readiness Report

Date: 2026-07-27

## Verdict

The launch safety foundation is implemented. Resident Workforce OS is **not production ready** and
deployment is not authorized while the remaining gates below are open.

## Completed safety controls

- Authorization roles resolve from active, unexpired memberships in active organizations, with
  non-revoked assignments and active access-role definitions. Unknown roles are discarded,
  duplicates are removed, active worker identity adds only `WORKER_ACCESS`, and lookup errors fail
  closed.
- Production disables dispatch, platform and worker offers/responses, assignments, attendance, and
  timesheet mutation families before service execution. Authorized read-only calendar paths remain
  available to the authentication and authorization boundary.
- Production configuration requires `RWOS_ENV=production`, `NODE_ENV=production`, an explicit
  `DATABASE_URL`, and an HTTPS `INTERNAL_API_ORIGIN`. Production cannot use the local default origin.
  `SESSION_SECRET` is not claimed as required because current runtime code does not consume it.
- Public registration is unavailable in production with a non-enumerating response. Authentication
  rate-limiter storage is bounded and expired buckets are pruned. Unknown API failures return a
  generic response with a non-secret request ID.
- API, employer, and administration responses set anti-sniffing, anti-framing, referrer, and
  conservative permissions policies. HSTS is production-HTTPS-only. Browser session DTOs use a
  nested runtime allowlist and exclude tokens, credentials, hashes, and unknown fields.
- Production worker builds expose only the authenticated calendar/offer reference with truthful
  unavailable and empty states. The native entry fails closed to the production shell by default;
  fixture mode requires both a development runtime and an explicit demo flag, so a public
  environment-string mistake cannot load fixture repositories in a release build. Local fixture
  actions remain inaccessible from the production shell.
- Production admin and employer route allowlists exclude fixture-only workspaces. Protected admin
  routes require platform-admin capability, protected employer routes require active organization
  context and employer-calendar capability, and stale organization context fails closed.
- Employers can create, edit, submit, correct, and resubmit persisted Job Requests. Administrators
  can review, request information, approve for dispatch, create one active dispatch review, and
  perform governed candidate-review transitions. Dispatch creation and its audit event are atomic.
- Employers can read organization-authorized aggregate staffing progress without candidate,
  worker, owner, compensation, or internal-note data. Terminal dispatch states remain visible, and
  the interface does not misrepresent prepared offers as delivered offers, assignments, or
  confirmed coverage.
- Authenticated workers can discover only their own persisted, worker-visible offers without
  needing an out-of-band database identifier. Worker offer list/detail responses use an explicit
  privacy allowlist, exclude draft and approved offers, and do not expose tenant, worker-identity,
  actor, or internal operational fields. Offer GETs are strictly read-only and cannot bypass the
  production mutation gate by recording a view.
- Worker accept/decline is connected in the production mobile surface with exact offer and terms
  versions, decision-specific confirmation, disabled concurrent actions, safe conflict recovery,
  and an explicit reminder that acceptance is not an Assignment. The response row and optimistic
  offer-state transition are atomic and have a concurrent accept/decline regression test.
- Authenticated workers can discover their own confirmed Assignments through a dedicated read-only
  boundary. The API and mobile parser expose only the worker-facing schedule, approved summaries,
  lifecycle status, attendance boundary, and version; validation snapshots, tenant identifiers,
  worker identity, actor identifiers, and internal capacity/conflict evidence are excluded.
- Assignment creation now executes as one serializable PostgreSQL transaction. It locks the
  accepted offer and deterministically acquires job-capacity then worker-schedule advisory locks,
  revalidates the offer/response/terms/request/dispatch/tenant chain, checks capacity and overlap,
  and commits the Assignment plus validation and confirmation audits atomically. Serializable
  conflicts have bounded retry and a privacy-safe 503 exhaustion response; production mutation
  kill switches remain unchanged. The legacy non-atomic repository write capability has been
  removed, so the locking command is the sole Assignment creation interface.
- Worker Offer creation now requires a persisted shortlisted dispatch candidate linked by an
  explicit WorkerIdentity foreign key for that exact dispatch. An arbitrary active worker UUID is
  rejected. A partial unique index enforces one canonical linked worker identity per dispatch, so
  multiple source references must be reconciled before linkage. The additive provenance migrations
  are provider-locked, checksummed, Prisma-validated, and covered by schema and service tests.
- Worker Offer capacity validation and creation now execute inside one transaction guarded by a
  per-dispatch PostgreSQL advisory lock. Concurrent final-slot contenders are serialized, capacity
  is recounted under the lock, and the loser receives a privacy-safe capacity denial.
- All eight migrations were applied to an isolated PostgreSQL 17 database and the real
  multi-client Worker Offer final-slot test committed exactly one offer. This caught and corrected
  the advisory-lock result cast required by the Prisma PostgreSQL driver.
- Assignment advisory locks now return Prisma-compatible scalar values. A repeated real PostgreSQL
  suite ran five final-slot capacity races and five overlapping worker-schedule races; every race
  committed exactly one Assignment and returned the governed capacity/conflict result for the
  other contender.
- An HTTPS candidate-source adapter contract now sends only the dispatch, tenant, work-group, role,
  and time-window references needed for matching. It runtime-validates every response and rejects
  cross-tenant, missing/invalid worker identity, stale, malformed, and duplicate candidates.
- An HTTPS offer-delivery adapter now has bounded timeouts, runtime response validation, truthful
  sent/delivered/failed outcomes, and a stable per-offer/terms idempotency key reused for retries.
  Missing provider configuration records a retryable failure and never fabricates delivery.
- The persisted admin dispatch view now reads privacy-minimized authoritative offer and Assignment
  summaries through same-origin BFF routes. It distinguishes sent from delivered, accepted offer
  from confirmed Assignment, and never substitutes fixture state when either read is unavailable.
  It identifies accepted offers that require Assignment reconciliation. A guarded handoff contract
  exists for local/test evidence only: it re-reads authoritative records, binds the command to the
  dispatch and exact offer version inside the atomic transaction, and reconciles unknown outcomes
  before another attempt. The capability defaults off, production configuration forbids enabling
  it, and the API-wide production mutation kill switch remains authoritative.
- The API emits privacy-filtered structured request completion events, separates liveness from
  database-backed readiness, and handles bounded graceful shutdown. A monitoring and incident
  response runbook defines safe triage, containment, recovery, and closure evidence without
  claiming that external dashboards, paging, or on-call ownership are configured.
- Production configuration requires an HTTPS shared authentication-rate-limiter service, access
  token, and distinct HMAC key secret. Authentication sends only domain-separated HMAC account and
  network subjects, fails closed with a generic 503 when no decision can be obtained, preserves
  bounded 429 retry guidance through the frontend BFFs, and includes limiter health in readiness.
- The latest authorized registry-backed dependency evidence reports zero full and production
  vulnerabilities, and the resolved dependency tree contains only patched
  `brace-expansion@5.0.8`. A fresh registry audit remains required for the eventual immutable
  release because this local completion run prohibited external registry contact.
- Migration history now has a PostgreSQL provider lock and immutable checksum manifest. Static
  validation blocks edited or newly destructive migrations, and a guarded logical restore command
  refuses source-equal or non-disposable targets. The recovery runbook separates local mechanics
  from provider backup/PITR evidence and forbids automatic destructive production rollback.
- Heading and selected-tab semantics, WCAG-AA-oriented micro-badge colors, and employer/admin
  metadata are present without changing the RJDS visual direction. Worker assignment transport
  rejects unknown lifecycle states, malformed windows and invalid timezones; cancellation and
  replacement states no longer receive a false success treatment.
- The latest complete local suite passes 755 tests with 12 explicitly infrastructure-gated tests
  skipped, plus lint, type checking, environment validation, workspace-boundary validation,
  migration integrity, static container validation, secret scanning, Prisma validation/generation,
  diff checks, optimized workspace builds and a 423-artifact public-bundle credential scan. These
  checks do not replace authenticated browser, device, provider or real-database evidence.
- Real rendered local employer/admin secure-entry checks verified single main landmarks, ordered
  headings, named form controls, and truthful unauthenticated states. Synthetic employer landing
  previews are development-only, clearly labelled, and omitted when `RWOS_ENV=production`.
- `LAUNCH_READINESS.md` and the production, incident, recovery, security, privacy, accessibility,
  and deployment checklists now identify owners, evidence, external dependencies, and launch impact
  without implying approval.

## Preserved boundaries

- C1 no-economics-leak and C3 pending contract kit v1.1.
- Client, administration, and worker privacy separation.
- Attendance handoff only.
- No payroll, payment execution, invoices, tax, notifications, real maps, AI execution, worker
  payout, deployment, or real environment-file changes. The only schema change in this milestone is
  the additive, checksummed candidate-to-worker provenance migration; no destructive production
  schema operation was performed.

## Remaining launch gates

1. Provision and exercise the authorized candidate-source service against the implemented HTTPS
   adapter, including staging authorization and provenance reconciliation.
2. Provision and exercise the offer-delivery service against the implemented HTTPS adapter,
   including provider receipts, retry/idempotency evidence, and alerting.
3. Add complete signed-in browser and native end-to-end coverage. Local rendered secure-entry
   checks and real PostgreSQL concurrency evidence do not replace those journeys.
4. Provide provider backup/PITR configuration evidence and complete the documented production-like
   migration plus isolated restore/PITR rehearsal with measured RPO/RTO.
5. Provision the shared atomic authentication limiter and complete the documented multi-replica,
   persistence, failure, and alerting exercise. Production cannot fall back to the local limiter.
6. Obtain approval to submit dependency metadata to the audit registry, then rerun the audit and
   either eliminate the Expo build-tool advisory through an upstream-compatible upgrade or obtain
   named, time-bounded security approval.
7. Configure and exercise production dashboards, alerts, paging destinations, and named on-call
   ownership against the implemented probes, structured events, and incident runbook.
8. Complete legal, privacy, retention, and deletion review.
9. Complete device and accessibility signoff.
10. Supply the authoritative Contract Kit v1.1 (the repository contains v1 with no C3 runner), run
    its C3 suite, and obtain contract-owner approval.
11. Obtain explicit deployment approval.

## Operational note

The controls in this milestone reduce accidental production exposure. They do not substitute for
the open functional, operational, legal, security, and deployment approvals above.
