# Resident Workforce OS — Phase 1 Owner Approval Pack

Status: **BLOCKED — PROVIDER SELECTED FOR PLANNING; EXTERNAL AUTHORIZATION REQUIRED**

Release proposed for isolated staging validation:
`a31fa96f52247bb684032c6a8d3d379c098c2603`

This pack records non-secret decisions and references only. Approval of this release authorizes
validation of this exact code revision in an approved isolated staging environment. It does **not**
authorize production access, production credentials, production mutation, deployment, release
promotion, traffic changes, migration of production data, or a production launch.

Do not enter credentials, tokens, connection strings, personal information, private keys, recovery
codes, or secret values in this document. After staging resources exist, record only approved
secret-manager reference names.

## Selected planning decisions

These decisions approve planning documentation only. They do not authorize provider access,
resource creation, billing, spending, API enablement, external validation, production access,
deployment or launch.

- Provider: Google Cloud Platform.
- Region: Toronto, `northamerica-northeast2`.
- Canadian residency: application data, PostgreSQL, Redis, regional secrets and evidence artifacts
  must remain in Canada.
- Planning budget ceiling: USD $200 per month. This ceiling is not authorization to spend. A final
  calculator estimate and billing-owner approval are required before any paid resource action.
- PostgreSQL: staging-only Cloud SQL PostgreSQL, single-zone shared-core, TLS, 20–30 GB and PITR
  enabled.
- Distributed limiter: staging-only Memorystore for Redis Basic, 1 GiB.
- Secrets: regional Secret Manager in Toronto.
- Evidence retention: proposed 30 days, subject to privacy/legal approval.
- Paging: Cloud Monitoring email plus a second independent notification channel. PagerDuty must not
  be purchased for Phase 1.
- Primary release and project owner: Mohamed Al Mashhour for 9375-7649 Québec Inc.
- Mohamed Al Mashhour provisionally holds infrastructure, security, QA, integration, monitoring,
  paging and evidence-review planning roles only.
- A separate named database reviewer or witness is required before database creation, mutation
  testing or restore rehearsal.
- A secondary on-call person is required before monitoring/incident evidence can be approved.

## 1. Owner approval table

Each approval must name the individual owner, their role, the UTC decision time, the exact release
SHA, the approved scope, any conditions, and an immutable approval-record reference.

| Owner                                | Required decision                                                                                | Named owner                                     | UTC approved at | Approval-record reference | Conditions                                                          | Status            |
| ------------------------------------ | ------------------------------------------------------------------------------------------------ | ----------------------------------------------- | --------------- | ------------------------- | ------------------------------------------------------------------- | ----------------- |
| Release owner                        | Approve the exact SHA for isolated staging validation only                                       | Mohamed Al Mashhour, 9375-7649 Québec Inc.      |                 |                           | Planning only; formal execution approval remains separate           | Planning selected |
| Infrastructure owner                 | Approve non-production provider project, region, network and staging services                    | Mohamed Al Mashhour (provisional planning role) |                 |                           | No provider access, billing or resource action authorized           | Planning selected |
| Database owner                       | Approve staging cluster, TLS policy, disposable target, temporary `CREATEDB` and cleanup         | Mohamed Al Mashhour (provisional planning role) |                 |                           | Separate named reviewer/witness required before any database action | Blocked           |
| Database reviewer/witness            | Independently review database creation, mutation-test and restore-rehearsal authority            | Missing                                         |                 |                           | Must be separate and named before database action                   | Blocked           |
| Security owner                       | Approve secret-manager namespace, staging principals, credential lifecycle and evidence handling | Mohamed Al Mashhour (provisional planning role) |                 |                           | Secret reference names only; no secret values                       | Planning selected |
| QA owner                             | Approve isolated tenants, test identities, reset authority, cleanup and retained artifacts       | Mohamed Al Mashhour (provisional planning role) |                 |                           | Planning only; identity/reset actions separately authorized         | Planning selected |
| Integration owner — candidate source | Approve staging-only candidate-source account, endpoint and test records                         | Mohamed Al Mashhour (provisional planning role) |                 |                           | Synthetic staging records only                                      | Planning selected |
| Integration owner — offer delivery   | Approve staging-only delivery account, endpoint and non-real recipients                          | Mohamed Al Mashhour (provisional planning role) |                 |                           | No real notification or recipient                                   | Planning selected |
| Integration owner — limiter          | Approve shared atomic staging limiter and multi-replica exercise                                 | Mohamed Al Mashhour (provisional planning role) |                 |                           | Planning only; resource/test action separately authorized           | Planning selected |
| Monitoring owner                     | Approve staging dashboards, rules, test alert routing and evidence retention                     | Mohamed Al Mashhour (provisional planning role) |                 |                           | Thirty-day retention remains subject to privacy/legal approval      | Planning selected |
| Paging/on-call owner                 | Approve non-production paging destination and drill participants                                 | Mohamed Al Mashhour (provisional planning role) |                 |                           | Email plus independent second channel; no PagerDuty purchase        | Planning selected |
| Secondary on-call                    | Participate in escalation and monitoring/incident evidence                                       | Missing                                         |                 |                           | Required before monitoring/incident evidence approval               | Blocked           |
| Evidence reviewer                    | Review non-secret evidence handling and retention                                                | Mohamed Al Mashhour (provisional planning role) |                 |                           | Privacy/legal approval remains separate                             | Planning selected |

An empty field or informal conversation does not constitute approval.

## 2. Provider-selection worksheet

The provider and region are selected for planning only. This worksheet does not authorize provider
access, billing, spending, account creation, API enablement or resource creation.

| Capability                | Candidate provider/service                                             | Account/project boundary             | Region/residency                                       | Required isolation and control                                            | Owner decision        | Status                          |
| ------------------------- | ---------------------------------------------------------------------- | ------------------------------------ | ------------------------------------------------------ | ------------------------------------------------------------------------- | --------------------- | ------------------------------- |
| Staging hosting           | GCP Cloud Run                                                          | Dedicated non-production GCP project | Toronto, Canada                                        | Remote HTTPS, exact immutable build, production-mode safety configuration | Selected for planning | External authorization required |
| PostgreSQL                | Cloud SQL for PostgreSQL, single-zone shared-core, TLS, 20–30 GB, PITR | Dedicated staging instance/project   | Toronto, Canada                                        | Explicit staging database; distinct from production; reviewer required    | Selected for planning | Blocked                         |
| Secret management         | Regional Secret Manager                                                | Dedicated staging namespace          | Toronto, Canada                                        | Least privilege, audit trail, rotation and no source-controlled values    | Selected for planning | External authorization required |
| Distributed rate limiting | Memorystore for Redis Basic, 1 GiB                                     | Staging shared backend               | Toronto, Canada                                        | Atomic decisions across at least two real API replicas; fail closed       | Selected for planning | External authorization required |
| Monitoring                | Cloud Monitoring and Cloud Logging                                     | Dedicated staging project/workspace  | Canada-resident workload; control-plane review pending | Health, readiness, errors, latency, database and integration signals      | Selected for planning | External authorization required |
| Paging                    | Cloud Monitoring email plus second independent channel                 | Non-production destinations          | Owner-approved recipients required                     | Controlled test pages, escalation and closure; no PagerDuty purchase      | Selected for planning | Information missing             |
| Artifact storage          | Regional Cloud Storage                                                 | Dedicated evidence bucket/project    | Toronto, Canada                                        | Encrypted, access controlled; proposed 30-day retention                   | Selected for planning | Privacy/legal approval required |
| QA reset service          | Private Cloud Run staging service                                      | Staging QA authority                 | Toronto, Canada                                        | Can affect only the two isolated test tenants; audited cleanup            | Selected for planning | External authorization required |
| Candidate source          | Cloud Run staging adapter                                              | Staging integration service          | Toronto, Canada                                        | Test records only; no real workers or personal information                | Selected for planning | External authorization required |
| Offer delivery            | Cloud Run staging adapter                                              | Staging integration service          | Toronto, Canada                                        | Non-real recipients; no real notifications                                | Selected for planning | External authorization required |

Provider acceptance must record the provider, service, immutable account/project identifier, region,
named owner, decision date, applicable residency constraints, and approval-record reference.

## 3. Test-identity worksheet

Use synthetic staging identities created through the approved identity process. Record safe opaque
account references and secret-manager reference names only—never emails, passwords, tokens, worker
details, or personal data.

### Test Employer Organization A — primary workflow organization

| Identity or record              | Required state                                            | Safe account/record reference | Credential reference name | Owner | Status  |
| ------------------------------- | --------------------------------------------------------- | ----------------------------- | ------------------------- | ----- | ------- |
| Test Employer Organization A    | Active isolated staging organization                      |                               | Not applicable            |       | Pending |
| Employer                        | Active, unexpired Organization A membership and approved role |                            |                           |       | Pending |
| Administrator                   | Active authorized administrator                           |                               |                           |       | Pending |
| Worker                          | Active account with active owned WorkerIdentity           |                               |                           |       | Pending |
| Revoked account                 | Revoked membership or role assignment                     |                               |                           |       | Pending |
| Expired account                 | Expired membership                                        |                               |                           |       | Pending |
| Inactive account/organization   | Inactive membership or organization                       |                               |                           |       | Pending |
| Unknown-role account            | Role excluded from the authorization allowlist            |                               |                           |       | Pending |
| Missing-worker-identity account | Authenticated account without active owned WorkerIdentity |                               |                           |       | Pending |
| Candidate-source dataset        | Synthetic records owned by Test Employer Organization A   |                               | Not applicable            |       | Pending |
| Delivery dataset                | Staging-only provider references and non-real recipients  |                               | Not applicable            |       | Pending |

### Test Employer Organization B — isolation and denial organization

| Identity or record    | Required state                                           | Safe account/record reference | Credential reference name | Owner | Status  |
| --------------------- | -------------------------------------------------------- | ----------------------------- | ------------------------- | ----- | ------- |
| Test Employer Organization B | Active and immutable; different from Test Employer Organization A |                       | Not applicable            |       | Pending |
| Employer              | Active Organization B membership                         |                               |                           |       | Pending |
| Administrator         | Authorized only for the approved Organization B scope    |                               |                           |       | Pending |
| Worker                | Active WorkerIdentity owned by the Organization B test account |                          |                           |       | Pending |
| Cross-tenant records  | Safe opaque records used only for expected-denial checks |                               | Not applicable            |       | Pending |

### Reset and cleanup

| Item                   | Required record                                                                         | Value/reference | Owner | Status  |
| ---------------------- | --------------------------------------------------------------------------------------- | --------------- | ----- | ------- |
| Reset authority        | Immutable provider/QA authority identifier                                              |                 |       | Pending |
| Reset endpoint         | Remote HTTPS staging endpoint                                                           |                 |       | Pending |
| Reset credential       | Secret-manager reference name only                                                      |                 |       | Pending |
| Initial-state manifest | Versioned safe record defining deterministic Test Employer Organization A/B state        |                 |       | Pending |
| Cleanup manifest       | Versioned safe record proving test records/artifacts are removed or retained per policy |                 |       | Pending |

## 4. Inventory checklist

### Immutable non-secret IDs

- [ ] Exact release SHA:
      `a31fa96f52247bb684032c6a8d3d379c098c2603`
- [ ] Staging hosting account/project and immutable build IDs
- [ ] Staging PostgreSQL cluster ID
- [ ] Production PostgreSQL cluster ID supplied as non-secret separation evidence only
- [ ] Secret-manager account/project and namespace ID
- [ ] Distributed-limiter service and replica IDs
- [ ] Candidate-source staging account/service ID
- [ ] Offer-delivery staging account/service ID
- [ ] Monitoring workspace/dashboard/rule IDs
- [ ] Paging destination ID
- [ ] Artifact-store account/project/bucket ID
- [ ] QA reset authority ID
- [ ] Test Employer Organization A and Test Employer Organization B opaque tenant IDs
- [ ] Native iOS and Android signed-build IDs when native validation is authorized
- [ ] Physical-device IDs when native validation is authorized

### Remote HTTPS endpoints

- [ ] Internal staging API origin
- [ ] Employer staging origin
- [ ] Admin staging origin
- [ ] Worker staging origin or API
- [ ] Distributed-limiter origin
- [ ] Candidate-source origin
- [ ] Offer-delivery origin
- [ ] Monitoring health-check URL
- [ ] Paging test URL
- [ ] QA reset origin

Every endpoint must be remote HTTPS. Localhost, loopback, insecure HTTP, mutable aliases and
unapproved production endpoints are prohibited.

### Secret-manager reference names

Record names only after the resources and staging principals are approved:

- [ ] Staging `DATABASE_URL` reference
- [ ] Disposable PostgreSQL admin URL reference
- [ ] Distributed-limiter token reference
- [ ] Distributed-limiter HMAC secret reference
- [ ] Candidate-source token reference
- [ ] Offer-delivery token reference
- [ ] Browser employer credential references
- [ ] Browser administrator credential references
- [ ] Browser worker credential references
- [ ] Browser revoked-account credential references
- [ ] Browser QA reset-token reference
- [ ] Native worker credential references
- [ ] Native QA reset-token reference

The limiter token and HMAC secret must be distinct from each other and from every other credential.

## 5. Exact release-validation approval wording

The named release owner may use the following wording without modification:

> I approve Resident Workforce OS commit
> `a31fa96f52247bb684032c6a8d3d379c098c2603` for External Validation Phase 1 in the
> specifically approved isolated non-production staging environment and only under the
> infrastructure, database, security, QA, integration, monitoring, reset, evidence-handling and
> cleanup controls recorded in this approval pack. This approval does not authorize production
> access, production credentials, production data, deployment, release promotion, traffic changes,
> production migrations, production mutations, or launch. Any change to the commit, build,
> provider inventory, environment boundary or approved controls requires a new approval.

Approval record:

- Named release owner: Mohamed Al Mashhour
- Organization: 9375-7649 Québec Inc.
- Role: Primary release and project owner
- UTC approval timestamp:
- Immutable approval-record reference:
- Conditions or expiry: Planning documentation only. No spending, provider access, external
  validation, production access or deployment.
- Exact approved release SHA:
  `a31fa96f52247bb684032c6a8d3d379c098c2603`

Production-access approval and deployment approval must be separate future records. They cannot be
inferred from this staging-validation approval.

## 6. Phase 1 execution sequence and stop points

No step authorizes the next step automatically.

1. **Collect named decisions.**
   - Review this pack and the Phase 1 inventory.
   - **STOP before recording approval** until each named human has made their own decision.
2. **Choose providers.**
   - Owners compare candidates and record decisions.
   - **STOP before creating any account, project, cluster, service, route or policy** until the
     infrastructure, database and security owners explicitly authorize that provider action.
3. **Create the isolated provider boundary.**
   - An authorized human operator creates the approved non-production project/account and network.
   - **STOP before every provider write** unless the exact target and action are recorded and
     approved.
4. **Create staging services.**
   - Authorized operators create the approved database, secret namespace, application services,
     limiter, integrations, monitoring, paging, artifact store and reset service.
   - **STOP before database creation, role grants, schema changes, endpoint enablement or
     integration activation** for the relevant owner’s explicit authorization.
5. **Create credentials and test identities.**
   - Authorized owners create staging-only credentials and synthetic accounts.
   - Store secret values only in the approved secret manager.
   - **STOP before secret creation or identity creation** unless security and QA approvals are
     recorded. Provide Codex only the reference names.
6. **Record immutable inventory.**
   - Record non-secret IDs, HTTPS endpoints and secret reference names in this pack or an approved
     evidence record.
   - **STOP if any endpoint resolves to production, any ID is mutable/ambiguous, or staging and
     production cluster IDs match.**
7. **Authorize staging validation.**
   - Release, infrastructure, database, security and QA owners confirm the exact release and
     inventory.
   - **STOP before connecting to any external service** until the execution operator has explicit
     authorization.
8. **Inject the ephemeral environment.**
   - An authorized operator resolves secret references into an ephemeral process environment.
   - Do not edit `.env`, source files or committed configuration.
   - **STOP if a value is missing, exposed, reused improperly, or not bound to staging.**
9. **Run read-only staging validation.**
   - Execute `pnpm validate:staging`.
   - **STOP on any failed health, TLS, identity, migration or environment check.**
10. **Run disposable PostgreSQL validation.**
    - Requires separate database-owner approval for the disposable target and temporary
      `CREATEDB`.
    - **STOP before database creation or mutation** until that approval is recorded.
11. **Run browser validation.**
    - Requires QA approval for Test Employer Organization A/B, accounts, reset authority, test data and artifacts.
    - **STOP before reset, test-data mutation or cleanup** unless the exact QA action is approved.
12. **Retain and review evidence.**
    - Store only redacted non-secret records in the approved artifact store.
    - **STOP before retention, sharing or deletion** unless the evidence policy and owner decision
      cover the action.
13. **Close Phase 1.**
    - Named owners review results, failures, cleanup and exceptions.
    - Phase 1 completion does not authorize production access or deployment.

## 7. Current blocking record

External Validation Phase 1 remains **BLOCKED**. GCP and Toronto are selected for planning, but the
separate database reviewer/witness, secondary on-call, exact GCP project/account and billing-owner
authorizations, final calculator estimate, immutable resource IDs, HTTPS endpoints, test-account
references, Secret Manager reference names, QA reset authority, privacy/legal retention approval
and per-action external authorizations remain missing.

The USD $200 monthly ceiling is a planning control, not permission to create paid resources or incur
charges.

Supporting inventory:
`docs/runbooks/EXTERNAL_VALIDATION_PHASE_1_INVENTORY.md`.
