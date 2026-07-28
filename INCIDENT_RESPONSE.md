# Resident Workforce OS Incident Response

Status: code-level procedure ready; paging destinations and named on-call owners are not configured.

## Required named roles

| Role               | Required name/rotation     | Decision authority                        |
| ------------------ | -------------------------- | ----------------------------------------- |
| Primary on-call    | `PENDING OPERATIONS OWNER` | First response and containment            |
| Secondary on-call  | `PENDING OPERATIONS OWNER` | Escalation and continuity                 |
| Incident commander | `PENDING OPERATIONS OWNER` | Severity, coordination, communications    |
| Rollback authority | `PENDING DEPLOYMENT OWNER` | Drain/rollback decision                   |
| Database owner     | `PENDING DATABASE OWNER`   | Backup, PITR, database containment        |
| Security owner     | `PENDING SECURITY OWNER`   | Security incident and exception decisions |
| Deployment owner   | `PENDING DEPLOYMENT OWNER` | Release stop/resume                       |

## Severity triggers

- Security/privacy: suspected tenant crossover, IDOR, credential exposure, or sensitive logging.
- Availability: sustained readiness loss, restart loop, database or limiter outage.
- Integrity: ambiguous offer/Assignment mutation, migration mismatch, or restore discrepancy.
- Integration: duplicate delivery, false delivery state, or candidate-source provenance failure.

Required alert coverage: API 5xx/error rate and latency; database availability and latency;
candidate-source, offer-delivery, and distributed-limiter failures; authentication abuse;
Assignment failures; readiness loss; and migration failure.

## Procedure

1. Record UTC window, release, environment, normalized route, and non-secret request IDs.
2. Preserve evidence. Do not paste request bodies, worker/employer identifiers, tokens, cookies,
   database URLs, or provider payloads into chat or tickets.
3. Preserve production mutation kill switches. Drain or roll back the affected release when safe.
4. Treat suspected cross-tenant exposure as a security/privacy incident and involve the approved
   security, privacy, legal, and database owners.
5. Reconcile uncertain mutations against authoritative rows and append-only audit events before any
   retry.
6. Recover dependencies or roll back application code; do not edit migration history or perform an
   automatic destructive database rollback.
7. Verify readiness, authenticated read-only canaries, expected denials, log privacy, and stable
   metrics before restoring traffic.

## Exercise evidence

Operations must record participants, scenario, timestamps, detection source, paging result,
containment time, recovery time, communication decisions, findings, owners, and due dates. A tabletop
document without paging and runtime evidence does not complete the launch gate.

The detailed monitoring procedure is
`docs/runbooks/API_MONITORING_AND_INCIDENT_RESPONSE.md`.
