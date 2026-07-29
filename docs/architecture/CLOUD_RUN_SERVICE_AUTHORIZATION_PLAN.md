# Cloud Run Service Authorization Plan

Status: **B5.1–B5.6 COMPLETE LOCALLY — B5.7 EXTERNAL IDENTITY/IAM VALIDATION BLOCKED**

Committed implementation baseline: `69686c527f41cc4b1138a8ddc84c6c9ef60f0d47`

External Validation Phase 1 remains **BLOCKED**. This document proposes authentication and
authorization boundaries only. It does not authorize Google Cloud access, IAM changes, token
generation, infrastructure, credentials, deployment, spending or production access.

## Decision summary

Use two independent controls for every trusted service-to-service request:

1. Cloud Run IAM authenticates a Google-signed OpenID Connect identity token and requires the
   caller's user-managed service account to have `roles/run.invoker` on the exact receiving
   service.
2. The receiving application verifies caller identity again and authorizes the exact operation,
   tenant, release SHA, manifest and idempotency scope. A valid IAM invocation alone never grants
   application permission.

Cloud Run services acquire ID tokens through Application Default Credentials (ADC) and the
official Google authentication library. Do not set `GOOGLE_APPLICATION_CREDENTIALS` on Cloud Run,
download service-account keys or implement token signing/exchange code. Google recommends
per-service user-managed service accounts and least-privilege Invoker grants for synchronous
service-to-service calls.[^cloud-run-s2s] [^service-identity]

The canonical Google-generated HTTPS URL of the receiving Cloud Run service is the audience:

```text
https://<RECEIVING_SERVICE>-<OPAQUE_HASH>-<REGION_CODE>.a.run.app
```

The exact URL is external information and must be recorded after resource creation. It must not be
guessed. Paths, query strings, traffic-tag URLs and custom domains are not audiences. A configured
Cloud Run custom audience is possible, but this plan recommends the canonical `run.app` URL for
Phase 1 because it binds the token to one receiver and avoids another configuration surface.
Cloud Run documents that the receiving service URL remains the audience even when the request uses
a traffic tag; custom domains are not accepted as the default audience.[^cloud-run-s2s]

## Current repository evidence

| Relationship                  | Current mechanism                                                                                                               | B5 gap                                                                                             |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Employer/Admin BFF → API      | `createFrontendSessionGateway` sends the user's session in `Authorization: Bearer`; server-only Next routes call the API origin | No Cloud Run caller token, provider or verified service principal                                  |
| Worker web/native → API       | Worker transport sends the user's session directly; native session is stored with Expo Secure Store                             | Public clients cannot safely hold service identity or mint Cloud Run ID tokens                     |
| API → auth limiter            | Shared long-lived bearer token; limiter applies constant-time comparison                                                        | Replace edge authentication with Google identity; retain HMAC-derived limiter keys as data privacy |
| API → candidate source        | Shared bearer plus `x-rwos-service-id`, operation and tenant headers                                                            | Headers are not independently bound to a verified Google principal                                 |
| API → offer delivery          | Shared bearer plus service, operation, tenant and idempotency headers                                                           | Same gap; release SHA is not carried on every call                                                 |
| Browser/native E2E → QA reset | Shared reset bearer plus service/operator, operation, target, release, manifest, checksum and approval headers                  | External runner identity and Cloud Run IAM authentication not implemented                          |
| Monitoring → services         | Health/readiness endpoints exist; no provider-side authenticated monitoring identity is configured                              | Exact monitoring principal and route-only application authorization required                       |

The existing user session remains end-user authentication and must not be replaced by a Cloud Run
service token. Server-to-server calls therefore need two authorization channels:

- `Authorization: Bearer <Google ID token>` for Cloud Run IAM; and
- `X-RWOS-App-Authorization: Bearer <application credential>` for independent application
  authorization.

The internal receivers never interpret `Authorization` as an application credential. Public
end-user routes remain a separate API/BFF architecture and are outside this receiver milestone.

## Trusted-call authentication contract

### Token provider

Future code should define an injected interface similar to:

```ts
interface IdentityTokenProvider {
  getToken(input: { audience: string; receiver: TrustedService }): Promise<{
    token: string;
    expiresAt: Date;
  }>;
}
```

The interface does not define a token format. Its Cloud Run implementation delegates to the
official Google authentication library and ADC. Unit tests inject a fake provider that returns
synthetic opaque values and never contacts Google or a metadata server.

The provider must:

- allowlist receiver and audience pairs from validated server-only configuration;
- cache per exact audience, never globally;
- refresh before expiry with a proposed five-minute safety margin;
- coalesce concurrent refreshes for the same audience;
- never persist a token to disk, logs, traces, error objects or response payloads;
- discard cached tokens on acquisition or validation failure;
- fail the business request closed on acquisition failure;
- use short request deadlines and never retry non-idempotent business operations merely because
  authentication failed.

Google documents that metadata-issued ID tokens expire in approximately one hour. The library
should remain authoritative for token acquisition; cache logic must use its returned expiry or the
verified `exp` claim rather than assuming a fixed lifetime.[^cloud-run-s2s]

### Receiver verification

Cloud Run IAM is the first verifier. Application authorization also needs the verified caller
principal so that an Invoker for one operation cannot spoof another caller's `x-rwos-service-id`.
The approved request sends the short-lived Google-signed ID token in `Authorization`, consumed by
Cloud Run IAM and passed to the injected receiver verifier. The distinct application credential is
sent only in `X-RWOS-App-Authorization`.

This is not a custom token protocol: both headers carry the same standard Google-signed OIDC ID
token. The application verifier extracts only the verified service-account subject/email and token
times. It must reject a missing signature, unknown issuer, wrong audience, expired/not-yet-valid
token, unapproved caller, malformed multiple header or verification failure. It must never decode
without signature verification.

The project owner and provisional security/dependency owner approved this dual-header acquisition
design for local B5.2 implementation. The alternative remains separate receiver services per
caller/operation, relying only on service-level IAM; that has a larger infrastructure footprint
but avoids application receipt of the signed token.

During the transition, API-to-limiter/candidate-source/offer-delivery requests carry the Google
identity token in `Authorization` and the existing application bearer in
`X-RWOS-App-Authorization`. The
application bearer must not be removed until B5.3 receiver verification and authorization, exact
per-service IAM grants, wrong-caller/wrong-audience tests, rollback evidence and separate
security/release-owner cutover approval are complete. The caller-identity copy may be removed only
if an approved architecture gives the application an equally strong verified caller identity,
such as separate receiver services per caller. Google `Authorization` remains required while
Cloud Run IAM protects the service.

### Application authorization envelope

After caller verification, the receiver evaluates a typed, bounded envelope carried in explicit
headers and the validated request body:

| Field                | Proposed location                        | Rule                                                                               |
| -------------------- | ---------------------------------------- | ---------------------------------------------------------------------------------- |
| Verified caller      | Google ID token claims                   | Exact service-account allowlist; never trust the claimed service header alone      |
| Claimed caller       | `X-RWOS-Service-ID`                      | Must map one-to-one to the verified caller                                         |
| Operation            | `X-RWOS-Operation`                       | Exact compiled route/operation allowlist                                           |
| Tenant               | `X-RWOS-Tenant-ID`                       | Exact immutable tenant allowlist and equal to the validated body/resource tenant   |
| Release              | `X-RWOS-Release-SHA`                     | Exact 40-character approved release SHA                                            |
| Manifest ID/checksum | Existing manifest headers where required | Mandatory for synthetic adapters and QA reset; exact configured values             |
| Idempotency scope    | `Idempotency-Key` plus request fields    | Required for mutations; scoped to caller + operation + tenant + resource + release |
| Request correlation  | `X-Request-ID`                           | Bounded non-secret identifier; never an authorization input                        |

Receivers return generic 401/403/unavailable responses and audit only safe caller alias,
operation, tenant alias or irreversible tenant digest, release, result and correlation ID.
Tokens, claims payloads, session credentials, request bodies and raw identity headers are excluded.

Idempotency records must bind a digest of:

```text
verified-caller | operation | tenant | resource-id | release-sha | idempotency-key
```

The digest is not a substitute for request-payload conflict detection. Offer delivery keeps its
existing payload hash and duplicate-suppression behavior. Candidate reads use no idempotency key.
QA reset continues to use deterministic plan checksums and receipts rather than a generic
idempotency key.

## Service trust matrix

`<..._RUN_URL>` means the immutable value recorded from the created Cloud Run service. It is
external information, not a proposed endpoint value.

| Caller                    | Receiver           | Audience                     | Application operations                                                                                          | User/session context                                     |
| ------------------------- | ------------------ | ---------------------------- | --------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| Employer web BFF          | API                | `<API_RUN_URL>`              | Employer session, memberships, employer-calendar reads and approved employer workflow routes                    | Existing employer session remains in `Authorization`     |
| Admin web BFF             | API                | `<API_RUN_URL>`              | Admin session/capability, calendar/dispatch reads and separately approved admin workflow routes                 | Existing admin session remains in `Authorization`        |
| Worker web BFF, if added  | API                | `<API_RUN_URL>`              | Worker session, calendar, offers and assignments within the approved launch boundary                            | Session remains server-side in an HTTP-only cookie       |
| Worker Expo/native client | API/public gateway | **None**                     | End-user worker routes only                                                                                     | User session only; no Cloud Run service identity in Expo |
| API                       | Auth limiter       | `<AUTH_LIMITER_RUN_URL>`     | `auth-rate-limit:consume`; separately approved staging reset identity only                                      | No user token forwarded                                  |
| API                       | Candidate source   | `<CANDIDATE_SOURCE_RUN_URL>` | `candidates:search`, `candidates:evaluate`; exact tenant, release and manifest                                  | No user token forwarded                                  |
| API                       | Offer delivery     | `<OFFER_DELIVERY_RUN_URL>`   | `worker-offers:deliver`; exact tenant, release, manifest and idempotency scope                                  | No user token forwarded                                  |
| Browser E2E runner        | QA reset           | `<QA_RESET_RUN_URL>`         | `qa-reset:dry-run`, `qa-reset:prepare`, `qa-reset:cleanup` under browser identity and exact two-tenant manifest | No application user session                              |
| Native E2E runner         | QA reset           | `<QA_RESET_RUN_URL>`         | Same operations under a distinct native identity and exact one-tenant scope                                     | No application user session                              |
| Monitoring service agent  | Every service      | Exact receiver URL           | `health:read` and `readiness:read` only                                                                         | No user token                                            |

The Expo/native application is not a trusted service. It cannot receive an IAM token provider,
service account, Secret Manager value or server credential. If Cloud Run IAM is mandatory on every
API route, a server-side worker BFF/public worker gateway becomes required before native staging.
That architecture and its cost are unresolved owner/security decisions. Until then, native uses
the API's application-level user session boundary and the API cannot be considered private solely
through Cloud Run IAM.

Employer and admin browser JavaScript calls same-origin Next BFF routes only. Server-side BFF code
acquires the API identity token. A direct browser-to-API call must never contain a service token.

## Minimal Cloud Run Invoker matrix

All grants are on the exact receiving Cloud Run service, never project-wide. Proposed service
account names are conventions only; project-qualified email addresses cannot be known before the
project ID is approved.

| Proposed caller service account | Receiver               | Minimal grant       | Remove when                              |
| ------------------------------- | ---------------------- | ------------------- | ---------------------------------------- |
| `rwos-stg-employer-web-sa`      | API                    | `roles/run.invoker` | Employer staging service is retired      |
| `rwos-stg-admin-web-sa`         | API                    | `roles/run.invoker` | Admin staging service is retired         |
| `rwos-stg-worker-web-sa`        | API                    | `roles/run.invoker` | Worker BFF is rejected or retired        |
| `rwos-stg-api-sa`               | Auth limiter           | `roles/run.invoker` | Limiter integration is removed           |
| `rwos-stg-api-sa`               | Candidate source       | `roles/run.invoker` | Synthetic candidate validation ends      |
| `rwos-stg-api-sa`               | Offer delivery         | `roles/run.invoker` | Synthetic offer-delivery validation ends |
| `rwos-stg-browser-e2e-sa`       | QA reset               | `roles/run.invoker` | Browser validation window closes         |
| `rwos-stg-ios-e2e-sa`           | QA reset               | `roles/run.invoker` | iOS validation window closes             |
| `rwos-stg-android-e2e-sa`       | QA reset               | `roles/run.invoker` | Android validation window closes         |
| `rwos-stg-manual-qa-sa`         | QA reset               | `roles/run.invoker` | Manual dry-run review closes             |
| `<MONITORING_SERVICE_AGENT>`    | QA reset status only   | `roles/run.invoker` | Authenticated monitoring is removed      |
| `<MONITORING_SERVICE_AGENT>`    | Each monitored service | `roles/run.invoker` | Authenticated uptime checking is removed |

No web, admin, worker, adapter or monitoring identity receives Invoker on QA reset unless listed.
The QA reset service identity itself needs no Invoker grant merely to receive requests. Browser
and native E2E identities remain distinct to preserve scope and evidence attribution.

Cloud Monitoring HTTPS uptime checks support Service Agent Authentication, which generates an
identity token for the monitoring service agent. The exact agent is provider-created and must be
recorded rather than invented.[^monitoring] The application still restricts that caller to GET
`/health` and `/ready`; note that service-level `roles/run.invoker` cannot itself limit paths.
Cloud Run's internal startup/liveness/readiness probes are a separate platform facility and should
use the existing safe endpoints without application credentials.[^health-checks]

## Service accounts and regional Secret Manager references

### Proposed service accounts

- `rwos-stg-api-sa`
- `rwos-stg-employer-web-sa`
- `rwos-stg-admin-web-sa`
- `rwos-stg-worker-web-sa` only if the Worker BFF decision is approved
- `rwos-stg-auth-limiter-sa`
- `rwos-stg-candidate-source-sa`
- `rwos-stg-offer-delivery-sa`
- `rwos-stg-qa-reset-sa`
- `rwos-stg-browser-e2e-sa`
- `rwos-stg-ios-e2e-sa`
- `rwos-stg-android-e2e-sa`
- `rwos-stg-manual-qa-sa`

Each Cloud Run service uses its own user-managed service identity. Do not use the Compute Engine
default service account. Service identities are attached at deployment by an authorized deployer
with `iam.serviceAccounts.actAs`; runtime services do not receive deployer permissions.

### Proposed non-secret regional references

The complete resource prefix remains unresolved:

```text
projects/<GCP_PROJECT_NUMBER>/locations/northamerica-northeast2/secrets/<SECRET_ID>
```

Proposed IDs:

- `rwos-stg-api-session-signing-current`
- `rwos-stg-api-session-signing-previous`
- `rwos-stg-auth-limiter-hmac-current`
- `rwos-stg-auth-limiter-hmac-previous`
- `rwos-stg-auth-limiter-redis-auth`
- `rwos-stg-database-connection`
- `rwos-stg-browser-e2e-user-a`
- `rwos-stg-browser-e2e-user-b`
- `rwos-stg-native-e2e-worker`

Google identity tokens, service-account keys, QA manifest IDs/checksums, release SHAs, approval
references, service URLs and service-account emails are not Secret Manager payloads. Do not store
downloaded service-account keys. Each runtime identity receives Secret Accessor only on the exact
secret it consumes, preferably with time-bounded conditions for validation. Regional Secret
Manager is appropriate for the approved Canadian-residency policy.[^regional-secrets]

No secret value belongs in this document, `.env`, source control, container images, build arguments,
browser bundles, Expo configuration or evidence artifacts.

## Acquisition, caching and failure behavior

| Condition                   | Required behavior                                                                                                          |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Normal Cloud Run call       | Official library uses ADC and attached user-managed service identity to obtain token for exact `aud`                       |
| External E2E runner         | Approved Workload Identity Federation principal impersonates its dedicated E2E service account and calls `generateIdToken` |
| Token cached and fresh      | Reuse only for the same exact audience                                                                                     |
| Within refresh margin       | Coalesced refresh; do not serve token beyond verified expiry                                                               |
| Acquisition failure         | Fail closed before outbound business request; generic unavailable result; safe metric                                      |
| Wrong audience              | Receiver returns generic denial; no fallback audience and no retry with broader scope                                      |
| Wrong or unknown caller     | Application denial even if edge invocation succeeded                                                                       |
| Expired/not-yet-valid token | Deny; clear cache; one acquisition refresh may occur only before any business request is sent                              |
| Receiver 401/403            | Do not retry the business operation automatically; record safe denial metric                                               |
| Receiver 5xx/timeout        | Follow the operation's existing retry/idempotency contract; authentication does not expand retries                         |

Workload Identity Federation supports keyless external workloads and deployment systems. External
identity grants must be limited by subject/attribute and condition rather than an entire identity
pool.[^wif] E2E federation, service-account impersonation and token generation remain B5.7 external
actions requiring separate approval.

## Public-client and bundle protections

1. Only server-owned modules may import the real Google token provider or authentication library.
2. Put provider code in a server-only workspace package with a package export map that exposes no
   browser entry.
3. Next BFF code must use `server-only`; client components call same-origin BFF routes.
4. Expo code may use only end-user sessions from Secure Store. No service-account email,
   Workload Identity Federation configuration, Secret Manager reference, identity token, API
   shared secret or reset credential may use an `EXPO_PUBLIC_` name.
5. Environment schemas maintain explicit server/public allowlists. Unknown public-prefixed
   authentication variables fail validation.
6. CI scans emitted Next and Expo assets for credential names, JWT-like values, private-key
   markers, metadata URLs, Google credential variables and server-only package imports.
7. Source maps, logs, errors, telemetry and screenshots redact `Authorization` and
   `X-RWOS-App-Authorization`.
8. Browser/native E2E reset calls run from Node orchestration processes, never Playwright page
   context, browser JavaScript or the mobile binary.
9. `GOOGLE_APPLICATION_CREDENTIALS`, service-account JSON and private keys are prohibited in
   Cloud Run configuration and repository validation.

## Required future code and dependency changes

This table records the implementation state after local B5.2.

| Area                 | Future change                                                                                                            | Dependency decision                                              |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| Shared server auth   | New interfaces for identity-token provider, verified caller, authorization envelope and fake providers                   | None for B5.1                                                    |
| Google acquisition   | Cloud Run ADC implementation using the official Node Google authentication library                                       | `google-auth-library@10.9.0`, approved and installed server-only |
| Google verification  | Verify signature, issuer, audience, time and caller claims using official verifier                                       | Same reviewed library; do not hand-roll JWT crypto               |
| Frontend gateway     | Extend server fetch abstraction to add Cloud Run and application authorization headers without exposing tokens           | No new dependency expected                                       |
| API receiver         | Trusted-call middleware, exact caller/operation matrix, tenant/release binding and generic denials                       | No new dependency beyond verifier                                |
| API outbound clients | Limiter, candidate and delivery clients accept injected provider; add release/caller/tenant/manifest/idempotency headers | No additional dependency                                         |
| Limiter              | Replace shared service bearer with verified IAM caller; separate reset caller and scope                                  | No additional dependency                                         |
| Candidate/Delivery   | Replace shared bearer authentication; bind claimed caller to verified principal and exact release/manifest               | No additional dependency                                         |
| QA reset             | Distinct browser/native verified callers; retire shared service bearer only after IAM validation                         | No additional dependency                                         |
| Worker web           | Owner decision: add server BFF or public worker gateway before requiring private API IAM                                 | Architecture decision                                            |
| E2E runners          | Inject fake provider locally; later WIF-based provider in separately authorized external environment                     | Official auth library/CI action subject to review                |
| Public-bundle audit  | Static import/env/output scanners for Next and Expo                                                                      | Prefer existing tooling                                          |

The existing shared bearer credentials remain until a tested cutover; they must not silently
become an optional fallback. The cutover phase must use an explicit mode and fail closed so a
missing IAM token cannot downgrade to shared-secret authentication.

## Implementation phases

### B5.1 — Authentication interfaces and fake providers

- Define server-only provider/verifier interfaces, trusted-service/audience registry and typed
  authorization envelope.
- Implement injected fake providers/verifiers for deterministic local tests.
- Add wrong-audience, wrong-caller, expiry, cache isolation, refresh and acquisition-failure tests.
- No Google library, metadata access, credentials or external calls.

### B5.2 — Trusted-service token acquisition

- Implemented locally with `google-auth-library@10.9.0` behind an injected client factory.
- The default factory delegates to `GoogleAuth.getIdTokenClient(targetAudience)`. Local and test
  execution requires an injected factory, preventing implicit ADC or metadata discovery.
- Exact origin-only HTTPS `*.run.app` audiences are allowlisted per receiver. Tokens cache per
  audience, concurrent refreshes coalesce and a bounded five-minute pre-expiry margin is enforced.
- API outbound limiter, candidate-source and offer-delivery clients accept the identity headers
  while preserving their existing application bearer.
- External ADC, metadata-server, IAM and real-token behavior remain unverified and unauthorized.

### B5.3 — Application authorization

- Implemented locally for limiter, candidate source and offer delivery through the injected
  verifier abstraction.
- Exact API caller, audience, operation, staging environment, release, tenant and idempotency
  scope are enforced before service execution.
- `legacy-app-only` is test-only. `dual-required` and `iam-application` require both verified
  identity and the separate application credential with no fallback.
- Real Google signature verification and Cloud Run IAM validation remain external and blocked.

### B5.4 — QA-reset identity separation

- Assign distinct browser/native caller aliases and allowlists.
- Preserve exact target, approval, manifest, checksum, confirmation and receipt controls.
- Remove shared reset bearer only after successful IAM validation and approved cutover.

### B5.5 — Public-bundle credential audit

- Enforce server-only imports and public environment allowlists.
- Scan Next and Expo outputs and source maps.
- Prove browser page context and mobile binaries contain no trusted-service material.

### B5.6 — Local validation

- Unit, contract and integration tests with fake providers only.
- Two-caller spoofing tests, token-cache tests, generic error and log-redaction tests.
- Full lint, typecheck, test, build, secret scan, boundary validation and static bundle audit.

### B5.7 — Separately authorized GCP IAM validation

- Record exact project number, service URLs, service-account emails and monitoring service agent.
- Create/attach identities and exact receiver-level Invoker grants under separate authorization.
- Validate correct/wrong caller and audience, token expiry/refresh, uptime checks and audit evidence.
- No production access or deployment authority is implied.

## Remaining security and owner decisions

| Decision                                                                   | Required owner(s)                  | Status                                 |
| -------------------------------------------------------------------------- | ---------------------------------- | -------------------------------------- |
| Approve dual-header Google ID token for edge plus application verification | Security Owner                     | Approved for local B5.2 only           |
| Worker native path: public API boundary versus dedicated worker gateway    | Architecture, Security, Release    | Missing                                |
| Whether worker web receives a server BFF                                   | Architecture, Security             | Missing                                |
| Exact staging GCP project number and canonical Cloud Run URLs              | Infrastructure Owner               | Missing                                |
| Exact service-account email identities                                     | Infrastructure and Security Owners | Missing                                |
| Monitoring service-agent identity and whether uptime checks cover `/ready` | Monitoring and Security Owners     | Missing                                |
| WIF provider, external subjects, attribute mappings and conditions         | Security and Infrastructure Owners | Missing                                |
| Official Node auth-library version and dependency/SCA review               | Security and Engineering Owners    | `10.9.0` approved; local audit pending |
| Token refresh safety margin (proposed five minutes)                        | Security Owner                     | Proposed                               |
| Shared-bearer cutover and rollback policy                                  | Security and Release Owners        | Missing                                |
| Secret-level access conditions and expiry                                  | Security and Privacy/Legal Owners  | Missing                                |

## B5.1 readiness

**B5.1 can begin locally after explicit owner authorization.** It needs no provider access,
credentials, network calls or new dependency if limited to interfaces, registries, fake providers
and tests. B5.2 local implementation was subsequently authorized; external use remains blocked.

## Local implementation record

- B5.1: `@rwos/service-auth` now provides exact Cloud Run audience validation, injectable
  provider/verifier contracts, per-audience caching, refresh coalescing, fail-closed acquisition,
  typed application authorization and deterministic fake providers.
- B5.4: QA reset locally requires distinct browser, iOS, Android, manual-QA and monitoring
  identities. Google identity tokens use `Authorization`, server-side application credentials use
  `x-rwos-app-authorization`, and exact caller/audience/operation/environment/release/manifest
  checks fail closed. Browser/native impersonation is denied; manual QA is dry-run-only and
  monitoring is authenticated-status-only. Real IAM verification remains external and blocked.
- B5.5: the public-bundle policy scans mobile, Next client sources and generated public artifacts
  for server-only imports, classified environment variables, metadata references, trusted-service
  identity headers, private keys and reset/database/Redis credentials. The executable inventory
  currently classifies 136 names and fails closed on unknown public variables.
- B5.6: frozen-lockfile restoration, B5-focused and complete tests, serial builds, compiled bundle
  scanning, environment/import/workspace boundaries, static container tests, Prisma validation and
  generation, secret scanning and dependency audits have local evidence. Container execution,
  real Redis/PostgreSQL and external IAM remain outside local evidence.
- B5.2 now includes the Google acquisition adapter, strict audience registry, injected client
  factory and trusted outbound client integration. Tests use only injected synthetic clients; no
  ADC discovery, metadata call or real token was attempted.
- B5.3 receiver middleware and client header separation are implemented locally. External cutover
  remains blocked pending exact identities/audiences, real verifier validation and IAM evidence.
- B5.7 remains external and unauthorized.

## Local authentication closure

| Path                   | Local result                                                                                  |
| ---------------------- | --------------------------------------------------------------------------------------------- |
| API → auth limiter     | Exact audience/API caller/operation/release; account/network scope; dual headers; fail closed |
| API → candidate source | Exact audience/API caller/operation/tenant/release; dual headers; fail closed                 |
| API → offer delivery   | Exact audience/API caller/operation/tenant/release/idempotency; dual headers; fail closed     |
| Browser E2E → QA reset | Browser shape only; exact identity/operator/manifest/release; dual headers                    |
| iOS E2E → QA reset     | Native shape only; distinct iOS identity/operator; dual headers                               |
| Android E2E → QA reset | Native shape only; distinct Android identity/operator; dual headers                           |
| Manual QA → QA reset   | Browser-shaped dry-run only; distinct identity/operator; dual headers                         |
| Monitoring → QA reset  | Authenticated status only; distinct identity; reset operations denied                         |

All local verifier tests use deterministic injected claims. Wrong caller/audience, expired or
missing identity, application-credential failure, tenant/operation/release/manifest mismatch,
impersonation and attempted staging legacy fallback produce generic denial. No test contacts
Google, ADC, metadata, JWKS, staging or production.

## Official references

[^cloud-run-s2s]: Google Cloud, [Authenticating service-to-service](https://docs.cloud.google.com/run/docs/authenticating/service-to-service).

[^service-identity]: Google Cloud, [Introduction to Cloud Run service identity](https://docs.cloud.google.com/run/docs/securing/service-identity).

[^monitoring]: Google Cloud, [Create public uptime checks](https://docs.cloud.google.com/monitoring/uptime-checks).

[^health-checks]: Google Cloud, [Configure container health checks for services](https://docs.cloud.google.com/run/docs/configuring/healthchecks).

[^regional-secrets]: Google Cloud, [Regional Secret Manager best practices](https://docs.cloud.google.com/secret-manager/regional-secrets/best-practices-rs).

[^wif]: Google Cloud, [Workload Identity Federation](https://docs.cloud.google.com/iam/docs/workload-identity-federation).
