# API Monitoring and Incident Response

Status: local production-readiness foundation. External dashboards, paging destinations, and
on-call ownership must be configured before deployment.

## Probe contract

- `GET /health` is liveness only. A `200` proves the process can serve HTTP; it does not prove the
  database or workflows are usable.
- `GET /ready` is readiness. A `200` requires the database probe to succeed. A `503` removes the
  instance from traffic; the response never includes connection details or the underlying error.
- Both probes are non-cacheable. Do not restart-loop solely because readiness fails while liveness
  remains healthy; investigate the dependency first.

## Required production alerts

Configure the deployment platform to alert on:

1. sustained readiness failure for two minutes;
2. liveness failure or repeated process restart;
3. 5xx error-rate or error-budget burn;
4. p95 and p99 latency above the agreed service objective;
5. database readiness failure;
6. abnormal authentication denial or rate-limit volume.

Thresholds, paging destinations, dashboard URLs, and the named primary/secondary on-call owners are
deployment inputs. Until they are recorded and tested, monitoring signoff remains open.

## Triage

1. Record environment, release identifier, UTC time window, affected normalized route, and safe
   request IDs. Never paste request bodies, authorization headers, cookies, contact details, worker
   identities, addresses, or database errors into incident chat.
2. If liveness fails, inspect process/runtime health. If liveness succeeds but readiness fails,
   inspect database reachability, pool saturation, and platform networking.
3. If readiness succeeds but 5xx rises, correlate `api.request.completed` and
   `api.request.unhandled_error` using `requestId` and normalized route templates.
4. Preserve all production mutation kill switches. Never enable fixtures or replay an
   unknown-result mutation as an incident workaround.
5. A suspected cross-organization or privacy exposure is immediately a security/privacy incident.
   Preserve evidence and involve the approved privacy and legal contacts.

## Containment and recovery

- Stop or pause a rollout when failures correlate with the new release.
- Drain an unhealthy instance before investigation when the platform supports it.
- Prefer rollback or dependency restoration over manual database state changes.
- Verify `/ready` remains healthy for at least five minutes, then run an authenticated read-only
  canary and one expected-denial check.
- Confirm structured logs arrive and contain no secrets or direct contact data.
- Reconcile ambiguous mutations against the authoritative record and audit event before retrying.

## Shutdown

`SIGTERM` and `SIGINT` initiate Fastify shutdown and the registered Prisma disconnect hook. The
service emits `api.shutdown.started`, `api.shutdown.completed`, or a safe failure event. Deployment
grace periods must be at least ten seconds and must be verified in the target environment.

## Closure evidence

Record the timeline, release, safe request IDs, affected route/status counts, confirmed data or state
impact, recovery verification, corrective tests, owner, and due date. Observability logs are not the
domain audit ledger and must not be retained indefinitely. Retention duration and access controls
require privacy/security approval before deployment.
