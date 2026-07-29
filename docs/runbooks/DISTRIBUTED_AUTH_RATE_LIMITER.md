# Distributed Authentication Rate Limiter

Production cannot use the process-local limiter. The local B1 service implementation lives in
`apps/auth-limiter`. Runtime validation requires an HTTPS remote limiter origin, an access token, a
distinct HMAC key secret, an approved key ID and an environment-specific namespace before the API
can start. Real multi-replica Redis validation remains external and blocked.

## Remote contract

The API sends `POST /v1/auth-rate-limit/consume` with an authenticated, non-cacheable JSON request:

- action: `register` or `sign_in`;
- approved HMAC key identifier;
- HMAC-derived account and network keys;
- the versioned account, network, and window policy.

The service must evaluate both buckets in one atomic operation shared by every API replica. It
returns only:

```json
{ "allowed": true, "retryAfterSeconds": 60 }
```

or the same shape with `allowed: false`. `retryAfterSeconds` must be finite; the API clamps it to
1–3600 seconds. A timeout, non-success response, or malformed body fails authentication closed with
`503 RWOS_AUTH_UNAVAILABLE`. There is no production fallback to memory.

In B5.3 staging modes, `Authorization` carries only the Google identity token and
`x-rwos-app-authorization` carries the limiter application credential. The receiver requires an
injected verified API identity, exact audience, caller, operation, staging environment and release.
Dual/IAM modes never fall back to legacy.

`GET /health` is process liveness only. `GET /ready` performs a bounded atomic Redis
write/TTL/delete probe and returns `503` when Redis is unavailable or unsafe. The API dependency
check uses `/ready`; API readiness becomes unavailable when it fails.

## Privacy and key handling

- Raw email addresses, IP addresses, credentials, tokens, and derived digests must never be logged.
- Account and network keys are HMAC-SHA-256 values with action/type domain separation.
- `AUTH_RATE_LIMITER_KEY_SECRET` must not equal any session, database, or service token.
- Rotate secrets with a versioned namespace and document that rotation resets active buckets.
- The limiter accepts the current key ID and may accept one previous key ID until an explicit
  timestamp no more than 65 seconds after activation. Sixty seconds covers the active limiter
  window and five seconds covers the repository’s maximum configured limiter-client timeout.
- Unknown key IDs fail closed. The limiter never receives the HMAC secret.
- The limiter token and HMAC secret belong in the deployment secret manager, not environment files,
  tickets, logs, screenshots, or source control.

## Deployment verification

Before enabling traffic:

1. Run concurrent attempts through at least two API replicas and prove exactly the configured count
   is allowed across both.
2. Restart an API replica and prove the active limit remains.
3. Rotate submitted email addresses and prove the network bucket still limits.
4. Rotate source networks and prove the account bucket still limits.
5. Disconnect the limiter and prove sign-in returns generic `503`, calls no authentication service,
   and `/ready` returns `503`.
6. Restore it and prove readiness recovers without enabling any mutation kill switch.

The remote service, credentials, multi-replica concurrency exercise, and alert integration are
external deployment requirements. Until those exist, distributed rate-limit signoff remains open.

## Service configuration names

No values belong in source control:

- `PORT`
- `RWOS_ENV`
- `AUTH_LIMITER_REDIS_URL`
- `AUTH_LIMITER_SERVICE_TOKEN`
- `AUTH_LIMITER_RELEASE_SHA`
- `AUTH_LIMITER_AUTH_MODE`
- `AUTH_LIMITER_AUDIENCE`
- `AUTH_LIMITER_API_SERVICE_ACCOUNT`
- `AUTH_LIMITER_NAMESPACE`
- `AUTH_LIMITER_CURRENT_KEY_ID`
- Optional paired `AUTH_LIMITER_PREVIOUS_KEY_ID` and
  `AUTH_LIMITER_PREVIOUS_KEY_ACCEPT_UNTIL`
- Staging reset only: `AUTH_LIMITER_RESET_ENABLED`, `AUTH_LIMITER_RESET_TOKEN`,
  `AUTH_LIMITER_PROJECT_ID`, `AUTH_LIMITER_CLUSTER_ID`

The API uses `AUTH_RATE_LIMITER_KEY_ID` and `AUTH_RATE_LIMITER_NAMESPACE` with its existing origin,
service token and HMAC secret.

## Staging-only reset

`POST /v1/staging/reset` is disabled unless `RWOS_ENV=staging` and reset is explicitly enabled.
It requires a distinct reset bearer token and exact configured project ID, cluster ID, namespace
and `authorized-staging-limiter-reset` confirmation. It deletes only keys beginning with the exact
configured `rwos:authrl:staging:v1:` prefix. Production, wildcard, mismatched and unscoped requests
receive generic unavailable responses. A real reset requires separate authorization.

After the external exercise, validate its non-secret evidence record with:

```sh
RWOS_EVIDENCE_GATE=distributed_rate_limit \
RWOS_EVIDENCE_PATH='<approved evidence JSON>' \
RWOS_RELEASE_SHA='<full lowercase 40-character release SHA>' \
pnpm validate:evidence
```

This verifies release binding, immutable service identity, at least two replicas, shared counters,
restart persistence, account/network isolation, 429 behavior, fail-closed 503 behavior, and
readiness recovery. It cannot replace the real multi-replica exercise.
