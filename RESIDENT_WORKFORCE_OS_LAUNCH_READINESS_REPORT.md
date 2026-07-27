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
  unavailable and empty states. Fixture repositories initialize without synthetic records in
  production, local fixture actions are inaccessible, and fixture preview remains non-production.
- Heading and selected-tab semantics, WCAG-AA-oriented micro-badge colors, and employer/admin
  metadata are present without changing the RJDS visual direction.

## Preserved boundaries

- C1 no-economics-leak and C3 pending contract kit v1.1.
- Client, administration, and worker privacy separation.
- Attendance handoff only.
- No payroll, payment execution, invoices, tax, notifications, real maps, AI execution, worker
  payout, deployment, real environment-file changes, schema changes, or migration changes.

## Remaining launch gates

1. Complete the persisted create, publish, respond, and assignment flow.
2. Add global route authentication or exclude fixture workspaces from production artifacts.
3. Complete offer discovery and delivery.
4. Add real-database, browser, and native end-to-end coverage.
5. Prove backup/PITR and rehearse migrations.
6. Replace the in-process authentication limiter with distributed rate limiting.
7. Complete dependency/SCA audit with network-backed advisory data.
8. Establish production monitoring, alerting, incident response, and runbooks.
9. Complete legal, privacy, retention, and deletion review.
10. Complete device and accessibility signoff.
11. Obtain explicit deployment approval.

## Operational note

The controls in this milestone reduce accidental production exposure. They do not substitute for
the open functional, operational, legal, security, and deployment approvals above.
