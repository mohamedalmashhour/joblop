# Resident Workforce OS Local Multi-Agent Remediation Report

Date: 2026-07-29

Committed implementation checkpoint: `69686c527f41cc4b1138a8ddc84c6c9ef60f0d47`

Verdict: **LOCAL REMEDIATION ADVANCED — STAGING AND PRODUCTION NOT READY**

Specialist reviews examined the dirty worktree across quality/completeness, security/safety,
design/accessibility and persistence. The implementation applied only findings that were locally
executable under the approved local-development boundary. No software agent was treated as a
human approver or independent witness.

## Problems fixed locally

| Finding                                                                                           | Resolution                                                                                                                                                                                        | Evidence                                                                                          |
| ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Employer workspace had no keyboard bypass and incomplete visible focus treatment                  | Added a skip link, focusable main target, RJDS focus-visible treatment and safer single-column narrow navigation                                                                                  | Local accessibility contract, lint, typecheck and builds                                          |
| Shared mobile button did not expose its disabled state                                            | Added `accessibilityState`                                                                                                                                                                        | Local accessibility contract and full tests                                                       |
| Shared mobile loading state lacked polite progress semantics                                      | Added accessible progress grouping and polite live-region behavior                                                                                                                                | Local accessibility contract and full tests                                                       |
| Production worker decorative `RW` mark was announced                                              | Removed the mark from the accessibility tree                                                                                                                                                      | Local accessibility contract and worker build                                                     |
| Worker static server headers were incomplete                                                      | Centralized CSP frame restriction, Permissions Policy, referrer, nosniff and frame denial across all responses; HSTS requires an explicit trusted HTTPS boundary                                  | Worker server runtime tests                                                                       |
| Worker server could expose source maps, dotfiles, unapproved assets or symlink escapes            | Added strict asset-type, dotfile and realpath containment checks                                                                                                                                  | Runtime tests for map, dotfile, unknown extension and symlink denial                              |
| Auth limiter silently defaulted the release SHA and hard-coded the fallback checkpoint            | Made `AUTH_LIMITER_RELEASE_SHA` mandatory and propagated the validated value                                                                                                                      | Configuration tests for missing, mismatch and exact binding                                       |
| Internal services reused the literal correlation ID `generated`                                   | Added unique opaque UUID-based IDs, safe inbound preservation and `x-request-id` response headers                                                                                                 | Runtime and source contract tests                                                                 |
| B-service response security headers lagged the API/Next boundary                                  | Added CSP and conservative Permissions Policy to limiter, candidate, offer and QA-reset responses                                                                                                 | Internal-service HTTP security contract                                                           |
| Auth-limiter environment inventory was incomplete                                                 | Added all non-secret runtime names to `.env.example` and packaging documentation                                                                                                                  | Environment validation and secret scan                                                            |
| Shared integration inventory falsely reported Assignment, attendance and timesheet APIs as absent | Recorded exact persisted API boundaries as `integration_pending`, retaining production-mutation and staging-evidence limitations                                                                  | Integration inventory tests                                                                       |
| QA-reset runtime stopped at an abstract/in-memory persistence boundary                            | Added guarded durable PostgreSQL inspection, exact 24-entity relational mutation, transactional execution and authenticated runtime composition                                                   | 89 QA-reset tests across 12 files, nine HTTP tests, plus 1/1 disposable-PostgreSQL lifecycle test |
| QA-reset evidence used ambiguous tenant language                                                  | Retained `tenant` only for internal security/data isolation and named the fictional fixtures Test Employer Organization A/B                                                                       | Manifest terminology and documentation checks                                                     |
| QA-reset relational isolation lacked one consolidated evidence count                              | Exercised 70 denial cases spanning live cross-organization swaps and retained-audit template tampering, with exact prepare and deletion-or-verified-retention behavior across all 24 entity types | Manifest, mutator, mutation-plan, repository and service tests                                    |

## External-only security boundary

The authentication-limiter staging reset endpoint currently authenticates with its distinct static
reset bearer plus exact staging project, cluster, namespace and confirmation. The security review
found that it does not yet enforce a separate verified Cloud Run caller identity.

The authorization plan requires a “separately approved staging reset identity,” but the exact
caller service account, canonical audience, application-header cutover and IAM validation remain
B5.7 decisions. External validation of that protocol requires the exact external identity and
infrastructure context. Therefore:

- reset remains staging-only, exact-scope and disabled by default;
- production, wildcard and unscoped resets remain denied;
- no reset-identity protocol change was made;
- Security and Infrastructure Owners must approve the exact external reset caller/audience and
  dual-header cutover before staging use;
- real IAM/reset evidence remains blocked.

## Fresh local validation

- Lint: PASS
- Typecheck: PASS
- Full-workspace suite: PASS — 925 passed, 13 intentionally environment-gated, 0 failed
- Production workspace builds: PASS, including employer/admin Next builds and worker Expo web
  export
- Environment validation: PASS
- Workspace boundaries: PASS
- Migration integrity: PASS
- Secret scan: PASS
- Public-bundle credential scan: PASS — 446 artifacts, 141 classified environment names
- `git diff --check`: PASS
- Focused HTTP/accessibility/security tests: PASS
- QA-reset application suite: PASS — 89 passed across 12 files, including all nine loopback HTTP
  tests
- Disposable local PostgreSQL validation: PASS — 11 migrations, five QA-reset control tables, 30
  constraints, atomic rollback and advisory-lock exclusion
- Local-disposable required PostgreSQL runner: PASS — 11 migrations and 4/4 required tests,
  including the 24-entity QA-reset lifecycle; no staging evidence emitted
- Repository-wide Prettier: BLOCKED by 450 pre-existing unformatted files outside this remediation
  batch

The changed files in this remediation are formatted. The repository was not mass-formatted because
the dirty worktree contains extensive unrelated user-owned changes.

The QA-reset proof uses only fictional **Test Employer Organization A** and **Test Employer
Organization B** fixtures with synthetic data. `tenantA` and `tenantB` remain internal
security/data-isolation identifiers. The implementation does not add payroll or worker payments,
employer invoicing, taxes, real notifications, automated AI employment decisions or real location
tracking.

## Remaining launch blockers

1. Assign every named role in `B5_EXTERNAL_VALIDATION_OWNER_DECISION_REGISTER.md`.
2. Approve and execute B5.7 exact staging IAM identity/audience validation.
3. Approve and witness QA-reset execution against the exact external staging database. The local
   schema, migration rehearsal and disposable-database proof are complete; Nour Al Mashhour’s
   independent witness review is deferred to this external-validation phase.
4. Approve OD-06 PostgreSQL/Redis ownership, retention and recovery decisions.
5. Supply and execute Contract Kit C3 v1.1.
6. Complete isolated staging, real PostgreSQL/Redis and container-runtime evidence.
7. Complete backup/PITR, monitoring/paging and an incident drill.
8. Complete fixture-free browser and signed physical-device native E2E.
9. Complete accessibility browser/keyboard/device/assistive-technology and human signoff.
10. Complete privacy/legal retention, export, deletion, legal-hold and backup-expiry approval and
    operational evidence.
11. Decide native worker ingress and any later location, communications or economic scope before
    implementation.

## Planning timeline

These are planning ranges, not commitments or spending authorization:

| Critical-path phase                                                              | Best-case elapsed time after prerequisites are supplied |
| -------------------------------------------------------------------------------- | ------------------------------------------------------- |
| Assign owners and approve exact architecture/scope                               | 1–3 business days                                       |
| Create separately authorized isolated staging resources and immutable identities | 1–2 business days                                       |
| Review local QA/OD-06 persistence evidence and authorize external rehearsal      | 1–3 business days                                       |
| Execute IAM, PostgreSQL, Redis, browser and provider validation                  | 2–4 business days                                       |
| Physical-device, accessibility and monitoring/incident evidence                  | 2–5 business days                                       |
| Privacy/legal and Contract Kit C3 acceptance                                     | Owner-dependent; commonly 3–10+ business days           |

If every owner, artifact, account, device and provider is immediately available, the technical
critical path is approximately **7–15 business days**. Missing legal decisions, C3 artifacts,
provider access, signed mobile builds or independent witnesses can extend it indefinitely. No
launch date can be promised until those inputs are supplied.

The authoritative launch matrix is **0 of 11 gates GREEN — 0%** because the dependency audit is
not bound to the current committed checkpoint. Local
completion does not claim external staging, production, migration, deployment or launch
readiness.
