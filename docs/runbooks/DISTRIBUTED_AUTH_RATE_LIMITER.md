# Distributed Authentication Rate Limiter

Production cannot use the process-local limiter. Runtime validation requires an HTTPS remote limiter
origin, an access token, and a distinct HMAC key secret before the API can start.

## Remote contract

The API sends `POST /v1/auth-rate-limit/consume` with an authenticated, non-cacheable JSON request:

- action: `register` or `sign_in`;
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

`GET /health` on the limiter must return a successful status only when it can perform decisions.
The API readiness probe becomes unavailable when this check fails.

## Privacy and key handling

- Raw email addresses, IP addresses, credentials, tokens, and derived digests must never be logged.
- Account and network keys are HMAC-SHA-256 values with action/type domain separation.
- `AUTH_RATE_LIMITER_KEY_SECRET` must not equal any session, database, or service token.
- Rotate secrets with a versioned namespace and document that rotation resets active buckets.
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
