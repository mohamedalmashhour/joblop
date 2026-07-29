# Synthetic Offer-Delivery Staging Adapter

Status: **B3 IMPLEMENTED LOCALLY — EXTERNAL VALIDATION BLOCKED**

Release binding: `a31fa96f52247bb684032c6a8d3d379c098c2603`

External Validation Phase 1 remains **BLOCKED**. This adapter records fictional delivery outcomes
only. It has no email, SMS, push, telephone, messaging, notification, webhook or provider client,
and it cannot send a communication.

## Endpoint contract

| Method | Path                        | Behavior                                                        |
| ------ | --------------------------- | --------------------------------------------------------------- |
| GET    | `/health`                   | Process liveness only                                           |
| GET    | `/ready`                    | Release, configuration, tenant allowlist and manifest readiness |
| POST   | `/v1/worker-offers/deliver` | Deterministic simulated delivery                                |

No delivery-status endpoint is added because the existing API client does not require one. There
are no callbacks, provider webhooks, destination fields, write APIs beyond the local simulation
record, or background workers.

Delivery requests contain only `organizationId`, `workerOfferId` and `workerIdentityId` UUIDs. They
require:

- constant-time application bearer authentication;
- `x-rwos-service-id: rwos-api`;
- `x-rwos-operation: worker-offers:deliver`;
- `x-rwos-tenant-id` equal to the body organization;
- an exact bounded `worker-offer:<offer-id>:terms:<terms-id>` idempotency key.

Local B5.3 middleware requires the separately verified API identity in dual/IAM modes.
`Authorization` is reserved for the Google identity token and `x-rwos-app-authorization` carries
the application credential. Exact audience, caller, operation, tenant, staging environment,
release and idempotency scope are enforced. Real IAM/verifier validation remains external.

## Synthetic manifest

Tenant A and Tenant B each receive deterministic opaque UUID records for:

- immediate simulated success;
- temporary simulated failure followed by success;
- permanent simulated failure;
- duplicate success;
- expired request;
- revoked synthetic recipient;
- inactive synthetic organization.

Every record has `synthetic=true` and exact tenant ownership. The manifest contains no recipient
name, email address, telephone number, device token, URL, destination or message. Unknown,
cross-tenant, revoked, expired and inactive records return generic concealed errors.

## Idempotency and retries

The local store scopes idempotency by tenant, operation and key and retains only a SHA-256 digest of
the normalized request plus simulated result/attempt metadata. It never stores credentials or raw
headers.

- Same key and request before a scheduled retry returns the existing result.
- Same key with a changed normalized request returns `409`.
- Immediate/permanent outcomes never create another simulated attempt.
- Temporary simulation permits three total attempts.
- Retry eligibility is one second after attempt one and five seconds after attempt two.
- Attempt three returns deterministic simulated delivery.
- Tests inject time; the runtime never sleeps and has no unbounded worker.

In-memory records older than 30 days are removed opportunistically. The 30-day retention remains a
proposal requiring privacy/legal approval before external staging. Restarting or removing the
service clears all local records.

## Contact-data rejection and zero communication

The request schema accepts UUID references only and rejects unknown fields. Email addresses,
telephone numbers, URLs, device tokens, free-text destinations and oversized bodies fail closed.
The package has no provider dependency and performs no outbound request. Consequently B3 cannot
send or attempt to send any real or fictional communication.

## Rate limits and scaling

Additional server-only configuration names are `OFFER_DELIVERY_ADAPTER_AUTH_MODE`,
`OFFER_DELIVERY_ADAPTER_AUDIENCE`, and `OFFER_DELIVERY_ADAPTER_API_SERVICE_ACCOUNT`.

Defaults are 30 requests/minute per tenant and 60 requests/minute per authenticated service.
Tenant limits are capped at 100 and service limits at 200. Enforcement is in-process; maximum
instances must remain `1` until distributed enforcement and multi-replica staging behavior are
approved and validated.

Suggested local staging shape: 1 vCPU, 256 MiB, concurrency 40, timeout 10 seconds, min/max `0/1`.
Scale-to-zero is safe; local idempotency records do not survive a restart, which is an explicit
external-validation limitation.

## Required environment-variable names

- `PORT`
- `RWOS_ENV`
- `OFFER_DELIVERY_ADAPTER_RELEASE_SHA`
- `OFFER_DELIVERY_ADAPTER_SERVICE_TOKEN`
- `OFFER_DELIVERY_ADAPTER_TENANT_A_ID`
- `OFFER_DELIVERY_ADAPTER_TENANT_B_ID`
- `OFFER_DELIVERY_ADAPTER_TENANT_LIMIT_PER_MINUTE`
- `OFFER_DELIVERY_ADAPTER_SERVICE_LIMIT_PER_MINUTE`

Values and secret-manager references are deliberately absent.

## Safe logging

Audit events cover acceptance, retry, status transition, duplicate suppression, idempotency
conflict, denial, expiration and cleanup. Logs may include tenant UUID, scenario, attempt, count,
release, correlation ID and hashes of local references. They exclude tokens, credentials, raw
headers, payloads, messages, recipient references and idempotency keys.
