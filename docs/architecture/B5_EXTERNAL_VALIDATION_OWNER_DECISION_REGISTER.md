# B5 External Validation Owner Decision Register

Status: **OPEN — LOCAL IMPLEMENTATION AUTHORIZED; EXTERNAL VALIDATION BLOCKED**

Checkpoint SHA: `a31fa96f52247bb684032c6a8d3d379c098c2603`

This register consolidates the frozen B5.7 authorization checklist, QA-reset database decision
package and OD-06 durable adapter-state decision package. It is an approval handoff, not an
approval record. A recommended safe default remains **PROPOSED** until a named person approves the
exact scope, checkpoint SHA, UTC date, expiration and durable reference.

## Local-development authorization boundary

The Release and Product Owner authorizes local implementation of the approved QA-reset and OD-06
designs at this checkpoint. Local code, non-applied schemas and migrations, fake/local providers,
tests, builds and documentation do not require the external-stage approval records below.

The approval register remains mandatory before any GCP, billing, IAM, external PostgreSQL or
Redis, staging mutation, deployment, production access or real-user-data activity. Proposed
defaults remain non-authoritative for those external actions.

## Authoritative source packages

- `docs/architecture/CLOUD_RUN_SERVICE_AUTHORIZATION_PLAN.md`
- `docs/architecture/QA_RESET_DATABASE_DECISION_PACKAGE.md`
- `docs/architecture/OD_06_DURABLE_ADAPTER_STATE_DECISION_PACKAGE.md`

If this register conflicts with a source package, work must stop for owner reconciliation. Approval
of one row does not implicitly approve another row or expand its scope.

## Approval-record requirements

Every approval must contain:

| Required field | Rule                                                                                     |
| -------------- | ---------------------------------------------------------------------------------------- |
| Named approver | Real person's name and assigned role; Codex, a service account or a team name is invalid |
| Exact scope    | One or more decision IDs and the precise implementation or external action authorized    |
| Checkpoint SHA | Exact 40-character SHA; branch names and “latest” are invalid                            |
| Approval time  | UTC date and time                                                                        |
| Expiration     | UTC date and time; indefinite/general approval is invalid                                |
| Reference      | Immutable ticket, signed record or other durable approval reference                      |
| Conditions     | Target, tenant, namespace, budget, evidence and rollback limits where applicable         |

Expiration, checkpoint drift, target drift, a missing witness or a broader requested action
invalidates the approval for that action. Approval of the release SHA authorizes only the stated
validation scope; it never authorizes production access, deployment or launch.

## Role assignment register

No missing name may be inferred or invented.

| Role                                  | Named person                                                      | Independence requirement                                                       | Required before                                                |
| ------------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------ | -------------------------------------------------------------- |
| Release Owner                         | Mohamed Almashhour, subject to scope-specific signed approval     | May not substitute for witness roles                                           | Any implementation authorization                               |
| Infrastructure Owner                  | Mohamed Almashhour, subject to scope-specific signed approval     | Operational owner                                                              | GCP project, IAM, network, Redis or Cloud Run action           |
| Billing Owner                         | Mohamed Almashhour, subject to action-specific signed approval    | Controls each chargeable action                                                | Any resource creation or spending                              |
| Database Owner                        | **MISSING**                                                       | Must be separate from the independent witness                                  | Schema implementation or database access                       |
| Independent Database Reviewer/Witness | Nour Al Mashhour — submitted record requires correction           | Must be separate from implementer and database operator for witnessed evidence | Migration approval, mutation test or restore/recovery exercise |
| Security Owner                        | Mohamed Almashhour, subject to scope-specific signed approval     | Security owner                                                                 | IAM, WIF, token, HMAC, secret or cutover decision              |
| Privacy/Retention Owner               | Mohamed Almashhour, subject to scope-specific signed approval     | Privacy/legal owner                                                            | Retention, deletion, legal hold or evidence policy             |
| Candidate-source Integration Owner    | Mohamed Almashhour, subject to scope-specific signed approval     | Integration authority                                                          | Distributed candidate limiter implementation                   |
| Offer-delivery Integration Owner      | Mohamed Almashhour, subject to scope-specific signed approval     | Integration authority                                                          | Durable delivery/idempotency implementation                    |
| QA Owner                              | Mohamed Almashhour, subject to scope-specific signed approval     | Owns synthetic tenants, reset runs and evidence                                | QA-reset external use                                          |
| Monitoring/Operations Owner           | Mohamed Almashhour, subject to scope-specific signed approval     | Operational authority                                                          | Monitoring and incident evidence                               |
| Secondary On-Call                     | Mohamed Majed Al Mashhour — corrected personal signature required | A person distinct from the primary responder                                   | Incident-response gate                                         |
| Evidence Reviewer                     | Mohamed Almashhour, except where independence is required         | Cannot satisfy an independent witness requirement                              | Acceptance of non-independent external evidence                |

Mohamed Almashhour's Release Owner approval `RWOS-RELEASE-MAM-2026-001` is accepted only as local
implementation authorization for the frozen QA-reset and OD-06 packages from
2026-07-29 13:39 UTC through 2026-08-28 13:39 UTC. It does not satisfy the missing Database Owner
or other specialist approvals. Nour's reviewer record requires correction. Mohamed Majed Al
Mashhour is the confirmed Secondary On-Call assignee and must personally sign under
`RWOS-ONCALL-MAJED-2026-001`; the exact availability window remains pending until staging is
scheduled, and the expiration and escalation channel remain required before staging validation.

## 1. Release-owner decisions

These decisions may be made by the Release Owner only within the recorded scope. Specialist
co-approval remains mandatory where shown.

| ID    | Unresolved decision                       | Recommended safe default                                                                                            | Additional approval                          | Exact scope enabled after all approvals                                   |
| ----- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- | ------------------------------------------------------------------------- |
| RO-01 | Bind work to a release checkpoint         | Keep `a31fa96f52247bb684032c6a8d3d379c098c2603`; stop on drift                                                      | Relevant specialist owners for changed files | Review or implement only the explicitly approved package at this SHA      |
| RO-02 | Sequence the blocked packages             | B5.7 identity validation after local design approvals; database and OD-06 work remain separate                      | All owners in the dependency order below     | Scheduling only; no external action                                       |
| RO-03 | Shared-bearer cutover and rollback window | Preserve dual-header fail-closed behavior until real IAM evidence and explicit cutover approval                     | Security Owner                               | A separately scoped staging cutover after evidence; no production cutover |
| RO-04 | Native worker ingress architecture        | Keep native path blocked; choose public authenticated API boundary or dedicated gateway through architecture review | Security Owner and Architecture authority    | Later design/implementation of the chosen worker ingress only             |
| RO-05 | Release/evidence acceptance               | Require immutable image digest, target IDs, test record and independent review                                      | Evidence Reviewer and gate-specific owners   | Acceptance of named staging evidence only                                 |

## 2. Database and security specialist decisions

### Database decisions

| ID    | Unresolved decision                        | Recommended safe default                                                                                                                       | Required approver(s)                                                  | Exact implementation scope enabled                                                           |
| ----- | ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| DB-01 | QA-reset concurrency and durable lifecycle | Transaction-scoped PostgreSQL advisory locks plus persistent reset-control records                                                             | Database Owner, Security Owner                                        | Local schema/migration design and repository implementation for the approved QA-reset models |
| DB-02 | QA-reset schema shape                      | Five isolated QA models, restrict-delete relationships and no first-migration changes to operational models                                    | Database Owner, Privacy/Retention Owner                               | Exact approved Prisma models, constraints and one reviewed migration                         |
| DB-03 | QA target identity model                   | Approved UUID target IDs with separate readable non-authoritative manifest keys                                                                | Database Owner, QA Owner                                              | Manifest/repository changes for exact UUID ownership only                                    |
| DB-04 | QA advisory-lock derivation                | Fixed reviewed digest of exact cluster ID plus manifest checksum, never request-supplied SQL/lock values                                       | Database Owner, Security Owner                                        | Lock derivation and collision tests                                                          |
| DB-05 | OD-06 durable backend                      | PostgreSQL for delivery idempotency/attempts; Redis only for short-lived distributed counters                                                  | Database Owner, Infrastructure Owner, Integration Owners              | Approved delivery repository plus limiter abstractions                                       |
| DB-06 | Adapter database placement                 | Prefer the staging platform PostgreSQL instance with isolated tables/roles unless capacity or blast-radius review requires a separate database | Database Owner, Infrastructure Owner, Security Owner                  | Exact connection/topology configuration for later staging validation                         |
| DB-07 | Idempotency storage                        | Keyed digest plus separately indexed offer/terms UUIDs; do not store raw key unless operational need is approved                               | Database Owner, Security Owner                                        | Exact fields, uniqueness scope and digest implementation                                     |
| DB-08 | Unknown database outcomes                  | Mark `unknown`/`blocked`, reconcile read-only and prohibit automatic mutation retry                                                            | Database Owner, Integration Owner or QA Owner for the applicable flow | State-machine and recovery implementation                                                    |

### Security decisions

| ID     | Unresolved decision                   | Recommended safe default                                                                                                                  | Required approver(s)                                          | Exact implementation scope enabled                                          |
| ------ | ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- | --------------------------------------------------------------------------- |
| SEC-01 | Cloud Run token audience              | Exact canonical HTTPS `run.app` receiver origin, no path, tag URL or custom-domain default                                                | Security Owner, Infrastructure Owner                          | Exact trusted-service audience registry for staging                         |
| SEC-02 | Service identities and Invoker grants | Dedicated user-managed identity per caller class and exact receiver-level `roles/run.invoker` only                                        | Security Owner, Infrastructure Owner                          | Creation plan and later separately authorized IAM grants                    |
| SEC-03 | WIF for E2E callers                   | Dedicated browser, iOS, Android and manual-QA subjects with restrictive mappings/conditions and no downloaded keys                        | Security Owner, Infrastructure Owner, QA Owner                | Later WIF configuration and impersonation tests                             |
| SEC-04 | Token refresh and failure             | Five-minute pre-expiry refresh; cache per exact audience; fail closed on acquisition, caller or audience failure                          | Security Owner                                                | Staging identity-token behavior validation                                  |
| SEC-05 | Application authorization             | Preserve separate Google `Authorization` and `x-rwos-app-authorization` headers with exact caller/operation/tenant/release/manifest scope | Security Owner                                                | Staging validation and eventual scoped cutover                              |
| SEC-06 | Adapter rate-limit keys               | Separate HMAC secret, versioned namespace, privacy-preserving tenant/caller digests and reviewed rotation                                 | Security Owner, Infrastructure Owner                          | Distributed Redis limiter implementation/configuration                      |
| SEC-07 | Replay accounting                     | Count every authenticated request, including idempotent duplicate replays, against both buckets                                           | Security Owner, Integration Owners                            | Exact Redis Lua policy and tests                                            |
| SEC-08 | Secret access                         | Least-privilege service identity access to named regional secret references; no browser/Expo exposure or service-account keys             | Security Owner, Privacy/Retention Owner, Infrastructure Owner | Later secret-reference binding only; never secret values in repository/chat |

## 3. Independent-witness decisions and evidence

The Independent Database Reviewer/Witness must be named before schema approval, migration
rehearsal, database mutation, concurrency evidence or recovery/restore evidence.

| ID     | Witnessed decision/evidence       | Recommended safe default                                                                 | Required signers                                                      | Scope enabled                                                             |
| ------ | --------------------------------- | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| WIT-01 | QA-reset schema/migration review  | Verify exact models, constraints, checksums and no operational-model overlap             | Database Owner plus independent witness                               | Local migration may proceed only under a separate implementation approval |
| WIT-02 | QA-reset concurrency              | Two simultaneous same-manifest operations yield one mutation and one durable receipt     | Database Owner plus independent witness                               | Acceptance of disposable-database concurrency evidence                    |
| WIT-03 | QA-reset unknown-outcome recovery | Fail closed, reconcile read-only, no broad delete or automatic retry                     | Database Owner, Security Owner, independent witness                   | Acceptance of recovery evidence                                           |
| WIT-04 | OD-06 delivery concurrency        | Same scoped key yields one eligible attempt; mismatched digest returns generic conflict  | Database Owner, Offer-delivery Integration Owner, independent witness | Acceptance of disposable PostgreSQL evidence                              |
| WIT-05 | Migration rehearsal               | Apply and roll back the exact reviewed migration on an authorized disposable target      | Database Owner plus independent witness                               | Migration evidence only; not staging/production approval                  |
| WIT-06 | Retention cleanup                 | Exact manifest/tenant/namespace bounded deletion with dry-run counts and holds preserved | Privacy/Retention Owner plus independent witness/evidence reviewer    | Acceptance of cleanup evidence                                            |

The implementer, automated agent, service identity and database operator cannot self-certify an
independence requirement.

## 4. Privacy, infrastructure, billing, integration and monitoring decisions

| ID      | Category       | Unresolved decision                                                  | Recommended safe default                                                                                              | Required approver(s)                                            | Exact scope enabled                                                                         |
| ------- | -------------- | -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| PRI-01  | Privacy        | QA and delivery evidence retention                                   | 30 days after terminal completion/expiry; no auto-delete for unknown, blocked, incident-held or legal-held records    | Privacy/Retention Owner                                         | Retention fields, bounded cleanup and evidence policy                                       |
| PRI-02  | Privacy        | Legal hold, deletion operator and approval record retention          | Holds override deletion; each batch needs dry-run counts and scope-specific approval                                  | Privacy/Retention Owner, Database Owner                         | Cleanup implementation only                                                                 |
| INF-01  | Infrastructure | Exact GCP project, project number, region and canonical service URLs | Isolated staging project in Toronto `northamerica-northeast2`, Canadian data residency                                | Infrastructure Owner, Security Owner                            | Populate immutable staging configuration after resources exist under separate authorization |
| INF-02  | Infrastructure | Exact service-account identities and monitoring service agent        | Dedicated identities; no default account and no downloaded keys                                                       | Infrastructure Owner, Security Owner                            | Later identity creation/attachment under action-specific approval                           |
| INF-03  | Infrastructure | Redis topology and behavior                                          | Staging-only Memorystore Basic 1 GiB; fail closed; exact namespace; no wildcard reset                                 | Infrastructure Owner, Security Owner                            | Later Redis creation/configuration and distributed tests                                    |
| INF-04  | Infrastructure | PostgreSQL topology                                                  | Staging-only single-zone shared-core PostgreSQL with TLS, 20–30 GB and PITR, subject to calculator/capacity review    | Infrastructure Owner, Database Owner                            | Later Cloud SQL creation/configuration under separate approval                              |
| BILL-01 | Billing        | Calculator estimate and action-by-action spending                    | USD 200/month ceiling; USD 100 and 200 alerts; alerts do not cap spending                                             | Billing Owner, Infrastructure Owner                             | Only the named resource-creation action and approved estimate                               |
| INT-01  | Integration    | OD-06 idempotency scope                                              | Environment, contract version, release, manifest, tenant, logical caller, operation and keyed idempotency digest      | Offer-delivery Integration Owner, Security Owner                | Delivery persistence implementation                                                         |
| INT-02  | Integration    | Adapter thresholds/outage behavior                                   | Preserve 30 tenant and 60 service requests per 60 seconds; both counters consume; fail closed without memory fallback | Candidate and Offer-delivery Integration Owners, Security Owner | Distributed limiter implementation                                                          |
| INT-03  | Integration    | Retry and unknown-outcome policy                                     | Durable eligibility; terminal replay returns stored result; unknown/blocked never auto-retries                        | Offer-delivery Integration Owner, Database Owner                | Delivery state machine implementation                                                       |
| QA-01   | QA             | Exact Tenant A/B synthetic identities, manifest and reset authority  | Two isolated synthetic tenants; no real personal data; exact release/manifest binding                                 | QA Owner, Privacy/Retention Owner                               | Local manifest finalization and later scoped reset evidence                                 |
| QA-02   | QA             | Reset permissions                                                    | Browser/iOS/Android scoped reset callers; manual QA dry-run only; monitoring status only                              | QA Owner, Security Owner                                        | Later QA-reset identity validation                                                          |
| MON-01  | Monitoring     | `/health`, `/ready`, uptime-check identity and incident criteria     | Liveness process-only; readiness dependency-aware; authenticated monitoring identity                                  | Monitoring/Operations Owner, Security Owner                     | Staging monitoring configuration/evidence                                                   |
| MON-02  | Monitoring     | Secondary on-call and independent channel                            | Name a second person and use email plus a separate approved channel                                                   | Monitoring/Operations Owner, Secondary On-Call                  | Incident drill and monitoring-gate evidence                                                 |

Budget alerts never stop charges. `BILL-01` must be approved separately for each provider write or
chargeable resource; a monthly ceiling is not permission to spend.

## B5.7 external identity and resource register

Every provider-created value remains **MISSING** until supplied from an authorized action and
captured as non-secret evidence.

| Required value/action                                                      | Current value | Owner(s)                     | Approval prerequisite                               |
| -------------------------------------------------------------------------- | ------------- | ---------------------------- | --------------------------------------------------- |
| GCP organization/account authority                                         | **MISSING**   | Infrastructure, Billing      | RO-01, INF-01, BILL-01                              |
| Staging project ID and immutable project number                            | **MISSING**   | Infrastructure               | INF-01 and separate project-creation authorization  |
| Canonical Cloud Run URLs/audiences                                         | **MISSING**   | Infrastructure, Security     | Project/services separately authorized and created  |
| API, limiter, candidate, delivery, QA-reset and E2E service-account emails | **MISSING**   | Infrastructure, Security     | SEC-02 and separate identity-creation authorization |
| Receiver-level Invoker bindings                                            | **MISSING**   | Infrastructure, Security     | Exact caller/receiver matrix approved               |
| WIF pool/provider IDs, subjects, mappings and conditions                   | **MISSING**   | Infrastructure, Security, QA | SEC-03 and separate federation authorization        |
| Cloud SQL instance/database immutable IDs                                  | **MISSING**   | Infrastructure, Database     | INF-04, DB decisions, billing and witness assigned  |
| Redis instance immutable ID and namespace                                  | **MISSING**   | Infrastructure, Security     | INF-03, SEC-06 and billing                          |
| Regional Secret Manager reference names                                    | **MISSING**   | Infrastructure, Security     | SEC-08 and separate secret-resource authorization   |
| Tenant A/B test-account and manifest references                            | **MISSING**   | QA, Privacy                  | QA-01                                               |
| Monitoring service agent, endpoints and notification references            | **MISSING**   | Monitoring, Security         | MON-01 and MON-02                                   |
| Evidence bucket and 30-day lifecycle reference                             | **MISSING**   | Infrastructure, Privacy      | PRI-01, BILL-01                                     |
| Final calculator estimate                                                  | **MISSING**   | Billing, Infrastructure      | Exact resource configuration                        |

Secret values, identity tokens, service-account keys, database URLs, passwords, Redis credentials
and personal test data are prohibited from this register.

## Approval dependencies and required order

1. **Assign named people.** Release, infrastructure, billing, database, independent database
   witness, security, privacy/retention, QA, both integration, monitoring, secondary on-call and
   evidence-review roles must be assigned.
2. **Bind the checkpoint and scope.** `RO-01` plus each applicable specialist approval must record
   the exact SHA, UTC date, expiration and reference.
3. **Resolve architecture and policy.** Approve DB-01 through DB-08, SEC-01 through SEC-08,
   PRI-01/02, INT-01 through INT-03, QA-01/02 and MON-01/02 as applicable. No proposed default is
   self-approving.
4. **Complete independent review.** The named database witness reviews the exact proposed schema,
   migration scope, concurrency, unknown-outcome and rollback criteria before database
   implementation.
5. **Authorize local implementation separately.** Approve exact files and scope for either
   QA-reset database or OD-06 work. One package does not authorize the other.
6. **Validate locally.** Use fake/local providers only, record exact results and stop on
   checkpoint, schema or scope drift.
7. **Approve infrastructure and billing per action.** Decide exact project/resources and calculator
   estimate. Each project, API, identity, network, database, Redis, secret reference or service
   creation needs its own authorization.
8. **Create immutable provider records under separate authorization.** Capture IDs and audit
   evidence without secrets. This remains prohibited until Step 7 is complete.
9. **Authorize B5.7 evidence execution separately.** Exact identities, audiences, IAM grants,
   tenants, targets, rollback condition, witness and expiration must be present.
10. **Review evidence.** Gate-specific owners and independent reviewers accept or reject evidence.
    This does not authorize production, deployment or launch.

## Implementation scopes gated by approvals

### QA-reset database implementation

After all applicable RO, DB, SEC, PRI, QA and WIT approvals, a separate local authorization may
permit only:

- approved QA-reset Prisma models, enums, constraints and one migration;
- exact advisory-lock and persistent control-record implementation;
- UUID manifest ownership and bounded cleanup behavior;
- provider-free unit, policy, concurrency and migration-integrity tests;
- relevant runbook updates.

It does not permit a real database, migration execution, external validation or deployment.

### OD-06 durable adapter-state implementation

After all applicable RO, DB, SEC, PRI, INF, INT and WIT approvals, a separate local authorization
may permit only:

- offer-delivery repository abstraction and approved PostgreSQL persistence;
- candidate/delivery distributed rate-limit abstractions and atomic Redis policy;
- dependency-aware readiness, fail-closed outages and retention cleanup logic;
- provider-free contract, concurrency, privacy and configuration tests;
- approved Prisma models/migration and narrowly required dependency changes, if explicitly named.

It does not permit a real PostgreSQL/Redis target, provider egress, external validation or
deployment.

### B5.7 external IAM validation

Only after local evidence, immutable resource values and action-specific infrastructure, billing,
security, QA, monitoring and release approvals may a separate order permit:

- exact staging service identities and receiver-level Invoker grants;
- exact canonical audience validation;
- approved WIF caller validation;
- correct/wrong caller and audience, expiry/refresh and monitoring checks;
- non-secret audit evidence and scoped rollback/revocation.

It never implies production access or launch approval.

## Validation and rollback requirements

Any later local implementation must run the repository's applicable lint, typecheck, complete and
focused tests, builds, Prisma validation/generation, migration-integrity checks, secret scan,
public-bundle/boundary checks and `git diff --check`. Fake/local evidence must not be reported as
real distributed or GCP evidence.

Stop or roll back only the isolated approved change when:

- an approval is missing, expired, ambiguous or bound to another checkpoint;
- an actual file, schema, dependency, target, identity, audience, namespace or cost differs;
- unrelated user-owned work overlaps;
- a real credential, personal record or production-like target appears;
- authorization can fail open or fall back to memory/shared identity;
- a transaction, Redis operation, deletion or provider action has an unknown result;
- cleanup would require a wildcard, broad predicate or unapproved restore;
- retention, legal hold, witness independence or evidence ownership is unresolved.

External rollback means stop, preserve evidence, reconcile read-only and revoke only explicitly
approved temporary access. It never means automatic replay, broad deletion, production access or
an unrehearsed restore.

## Consolidated approval form

General approval is invalid. Complete only the rows relevant to the exact next action.

| Decision IDs         | Required role                         | Named approver                                  | Exact approved scope                                   | Checkpoint SHA                             | Approval UTC | Expiration UTC | Immutable reference          |
| -------------------- | ------------------------------------- | ----------------------------------------------- | ------------------------------------------------------ | ------------------------------------------ | ------------ | -------------- | ---------------------------- |
| RO-01–RO-05          | Release Owner                         | Mohamed Almashhour                              | **MISSING**                                            | `a31fa96f52247bb684032c6a8d3d379c098c2603` | **MISSING**  | **MISSING**    | **MISSING**                  |
| DB-01–DB-08          | Database Owner                        | **MISSING**                                     | **MISSING**                                            | `a31fa96f52247bb684032c6a8d3d379c098c2603` | **MISSING**  | **MISSING**    | **MISSING**                  |
| WIT-01–WIT-06        | Independent Database Reviewer/Witness | Nour Al Mashhour — correction required          | **MISSING**                                            | `a31fa96f52247bb684032c6a8d3d379c098c2603` | **MISSING**  | **MISSING**    | **MISSING**                  |
| SEC-01–SEC-08        | Security Owner                        | Mohamed Almashhour                              | **MISSING**                                            | `a31fa96f52247bb684032c6a8d3d379c098c2603` | **MISSING**  | **MISSING**    | **MISSING**                  |
| PRI-01–PRI-02        | Privacy/Retention Owner               | Mohamed Almashhour                              | **MISSING**                                            | `a31fa96f52247bb684032c6a8d3d379c098c2603` | **MISSING**  | **MISSING**    | **MISSING**                  |
| INF-01–INF-04        | Infrastructure Owner                  | Mohamed Almashhour                              | **MISSING**                                            | `a31fa96f52247bb684032c6a8d3d379c098c2603` | **MISSING**  | **MISSING**    | **MISSING**                  |
| BILL-01              | Billing Owner                         | Mohamed Almashhour                              | **MISSING**                                            | `a31fa96f52247bb684032c6a8d3d379c098c2603` | **MISSING**  | **MISSING**    | **MISSING**                  |
| INT-01–INT-03        | Candidate-source Integration Owner    | Mohamed Almashhour                              | **MISSING**                                            | `a31fa96f52247bb684032c6a8d3d379c098c2603` | **MISSING**  | **MISSING**    | **MISSING**                  |
| INT-01–INT-03        | Offer-delivery Integration Owner      | Mohamed Almashhour                              | **MISSING**                                            | `a31fa96f52247bb684032c6a8d3d379c098c2603` | **MISSING**  | **MISSING**    | **MISSING**                  |
| QA-01–QA-02          | QA Owner                              | Mohamed Almashhour                              | **MISSING**                                            | `a31fa96f52247bb684032c6a8d3d379c098c2603` | **MISSING**  | **MISSING**    | **MISSING**                  |
| MON-01–MON-02        | Monitoring/Operations Owner           | Mohamed Almashhour                              | **MISSING**                                            | `a31fa96f52247bb684032c6a8d3d379c098c2603` | **MISSING**  | **MISSING**    | **MISSING**                  |
| MON-02               | Secondary On-Call                     | Mohamed Majed Al Mashhour                       | Corrected personal signature; staging schedule pending | `a31fa96f52247bb684032c6a8d3d379c098c2603` | **MISSING**  | **MISSING**    | `RWOS-ONCALL-MAJED-2026-001` |
| WIT-02–WIT-06, RO-05 | Evidence Reviewer                     | Mohamed Almashhour, except independent evidence | **MISSING**                                            | `a31fa96f52247bb684032c6a8d3d379c098c2603` | **MISSING**  | **MISSING**    | **MISSING**                  |

## Final state

- B5.7: **BLOCKED**
- QA-reset database implementation: **BLOCKED**
- OD-06 implementation: **BLOCKED**
- External Validation Phase 1: **BLOCKED**
- GCP, PostgreSQL, Redis and secret access: **NOT AUTHORIZED**
- Staging readiness: **NOT READY**
- Production readiness: **NOT READY**

No implementation may proceed until actual people are assigned to every role required by the exact
next action and submit complete, dated, expiring, scope-limited approval records.
