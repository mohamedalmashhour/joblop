# Worker Ingress Decision Package — RO-04 / OD-02

Status: **ALTERNATIVE A APPROVED FOR STAGING IMPLEMENTATION — EXTERNAL DEPLOYMENT EVIDENCE PENDING**

Local implementation checkpoint reviewed: `070284f`

Owner decision recorded 2026-08-01: Mohamed Almashhour approved Alternative A for controlled
staging. Production remains prohibited. The implementation uses a separate public `worker-api`
Cloud Run service backed by the same immutable API image; it does not make the private platform API
public. A fail-closed application boundary permits only health/readiness, worker authentication and
`/worker/*` workflow routes. Worker self-registration, employer, platform, finance and organization
routes return the same generic unavailable response before route execution.

## Decision

Choose the externally reachable boundary used by the public worker web/mobile application:

1. a public, user-authenticated API; or
2. a dedicated worker gateway in front of private platform services.

The repository does not establish a safe winner. Native and browser clients can hold a worker
session token, but they cannot safely hold a Cloud Run service identity, application bearer secret
or downloaded service-account key. Both alternatives therefore preserve the existing secure
session transport and keep private service-to-service authorization out of the client.

## Alternative A — public user-authenticated API

- Expose only the worker routes required by the existing mobile transport.
- Authenticate every request with the worker session and derive worker/organization scope
  server-side.
- Keep administrative, employer and internal service routes private.
- Apply public-edge rate limiting, bounded request schemas, generic denial responses and
  organization-isolation checks.
- Forward to private services only through a server-owned workload identity.

Advantages: fewer network components and direct alignment with the existing mobile route
contract.

Required review: public attack surface, edge rate limiting, session revocation, API routing,
monitoring, abuse response and rollback.

## Alternative B — dedicated worker gateway

- Expose a narrow gateway containing only worker-facing routes.
- Validate the worker session at the gateway and derive worker/organization scope server-side.
- Use a dedicated workload identity for exact private-service audiences.
- Prevent arbitrary path forwarding and bind each gateway operation to an explicit downstream
  route.
- Keep application authorization and service identity separate.

Advantages: smaller public surface on the platform API and an explicit worker trust boundary.

Required review: additional deployment/operations burden, gateway availability, identity-token
refresh, downstream audience registry, request/response mapping and rollback.

## Invariants for either choice

- No service credential, application bearer secret or private audience is embedded in Expo,
  browser JavaScript or downloadable configuration.
- Worker identity and organization scope are resolved from the authenticated server-side session;
  client-supplied organization identifiers never grant access.
- Cross-organization reads and mutations fail closed with non-enumerating responses.
- Only the existing attendance handoff is allowed; no real location tracking is introduced.
- No payroll, payment, invoicing, tax, real-notification or automated employment-decision behavior
  is added.
- Production and external staging remain disabled until separately authorized.

## Staging implementation record

The Release Owner selected Alternative A. Security and Release evidence must still record:

- selected alternative and rejected alternative;
- exact release SHA and scope;
- public hostname and route allowlist;
- session/token issuer, audience and revocation behavior;
- rate-limit and abuse-response policy;
- private caller identities and receiver audiences, if applicable;
- monitoring and rollback plan;
- UTC approval time, expiration and durable approval reference.

The decision unlocks local configuration of the selected ingress adapter and later isolated
staging validation. It does not authorize provisioning, deployment or production access.
