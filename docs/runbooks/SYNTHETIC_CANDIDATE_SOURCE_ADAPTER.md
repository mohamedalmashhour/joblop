# Synthetic Candidate-Source Staging Adapter

Status: **B2 IMPLEMENTED LOCALLY — DISTRIBUTED AND CONTAINER-RUNTIME VALIDATION BLOCKED**

Release binding: `a31fa96f52247bb684032c6a8d3d379c098c2603`

External Validation Phase 1 remains **BLOCKED**. This service is a staging-only synthetic test
adapter. It is not a worker directory, applicant system, ranking system or production integration.

## HTTP contract

| Method | Path                      | Behavior                                                        |
| ------ | ------------------------- | --------------------------------------------------------------- |
| GET    | `/health`                 | Process liveness only                                           |
| GET    | `/ready`                  | Configuration, release, tenant allowlist and manifest readiness |
| POST   | `/v1/candidates/search`   | One deterministic page, maximum 100 records                     |
| POST   | `/v1/candidates/evaluate` | One exact opaque synthetic candidate reference                  |

POST calls require the application bearer credential and exact:

- `x-rwos-service-id: rwos-api`;
- `x-rwos-tenant-id`, matching the body `organizationId`;
- `x-rwos-operation: candidates:search` or `candidates:evaluate`.

Local B5.3 middleware requires the separately verified API identity in dual/IAM modes.
`Authorization` is reserved for the Google identity token and `x-rwos-app-authorization` carries
the application credential. Exact audience, caller, operation, tenant, staging environment and
release are enforced without legacy fallback. Real IAM/verifier validation remains external.
Request bodies and response schemas follow
`MILESTONE_B_ADAPTER_LIMITER_QA_RESET_CONTRACT.md`. Bodies are limited to 16 KiB, unknown fields are
rejected, and no pagination cursor or write endpoint exists.

## Synthetic manifest

The in-process manifest is deterministic and carries:

- `synthetic=true`, manifest version and exact release SHA;
- immutable Tenant A or Tenant B ownership;
- 100 stable opaque candidate references per tenant;
- stable synthetic Worker Identity UUIDs;
- fictional role, fictional certification and fictional availability attributes;
- configured work-group and role-definition matching attributes.

It contains no names of real people, emails, telephone numbers, street addresses, government
identifiers or copied production records. Public labels use only `Synthetic Candidate A-NNN` and
`Synthetic Candidate B-NNN`. Tenant lookup occurs before manifest access and each returned record is
checked against its configured organization.

## Required runtime environment names

- `PORT`
- `RWOS_ENV` (`staging` only outside tests)
- `CANDIDATE_ADAPTER_RELEASE_SHA`
- `CANDIDATE_ADAPTER_SERVICE_TOKEN`
- `CANDIDATE_ADAPTER_AUTH_MODE`
- `CANDIDATE_ADAPTER_AUDIENCE`
- `CANDIDATE_ADAPTER_API_SERVICE_ACCOUNT`
- `CANDIDATE_ADAPTER_TENANT_A_ID`
- `CANDIDATE_ADAPTER_TENANT_A_WORK_GROUP_ID`
- `CANDIDATE_ADAPTER_TENANT_A_ROLE_DEFINITION_ID`
- `CANDIDATE_ADAPTER_TENANT_B_ID`
- `CANDIDATE_ADAPTER_TENANT_B_WORK_GROUP_ID`
- `CANDIDATE_ADAPTER_TENANT_B_ROLE_DEFINITION_ID`
- `CANDIDATE_ADAPTER_ALLOWED_TIMEZONES`
- `CANDIDATE_ADAPTER_TENANT_LIMIT_PER_MINUTE`
- `CANDIDATE_ADAPTER_SERVICE_LIMIT_PER_MINUTE`

Values and secret-manager references are deliberately absent.

## Rate limiting

Defaults are 30 requests per minute per tenant and 60 per minute for the authenticated calling
service. Configuration accepts only positive integers, caps tenant limits at 100 and service limits
at 200, and fails closed otherwise.

Enforcement is deliberately in-process for B2. It is safe only for a single replica. Two replicas
have independent counters; therefore an approved distributed store and real multi-replica staging
exercise remain required before multi-replica use.

## Privacy, retention and cleanup

Structured logs contain only bounded correlation ID, operation, organization UUID, fixed service
identity, release SHA, manifest version, count/status and latency. Credentials, raw headers,
candidate references, labels and candidate payloads are excluded.

The manifest is compiled synthetic configuration and no runtime candidate records are persisted.
Stopping/removing the service removes its in-memory limiter state. Platform logs/evidence remain
subject to the proposed 30-day retention and later privacy/legal approval. There is no adapter
cleanup or mutation endpoint.

## Local packaging recommendation

- CPU: 1 vCPU
- memory: 256 MiB
- concurrency: 40
- timeout: 10 seconds
- minimum instances: 0
- maximum instances: 1 until distributed rate limiting is validated
- scale to zero: safe

Container execution remains unverified until an approved runtime is available. No real candidate
provider, database, Redis, GCP resource or production system is required or permitted.
