# GCP Staging Pre-Creation Package

Status: **BLOCKED — LOCAL PLANNING ONLY**

Release candidate:
`a4ef2680b6d1291454e126efc32704112cc83388`

Selected planning provider and region: Google Cloud Platform,
`northamerica-northeast2` (Toronto).

This package describes proposed resources. It does not authorize Google Cloud access, project or
billing attachment, API enablement, IAM changes, resource creation, credentials, external
validation, production access, deployment or spending. Names containing angle-bracket placeholders
are unresolved decisions, not real identifiers.

Secret values, database URLs, passwords, tokens, keys, personal information and production
credentials are prohibited from this document. After resources exist, record only Secret Manager
resource-reference names.

## 1. Resource naming convention

Use lowercase ASCII, hyphens where supported, and no personal or secret data.

Pattern:

`rwos-stg-ca-tor-<resource>-<purpose>`

| Resource                  | Proposed name or template                                                       | Notes                                                          |
| ------------------------- | ------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| GCP project ID            | `<globally-unique-project-id>`                                                  | Human/billing decision; do not invent locally                  |
| Project display name      | `Resident Workforce OS Staging Toronto`                                         | Mutable display label; never use as immutable evidence         |
| Labels                    | `application=rwos`, `environment=staging`, `region=toronto`, `release=a4ef2680` | Short SHA is a label only; evidence always uses the full SHA   |
| Artifact Registry         | `rwos-stg-ca-tor-containers`                                                    | Docker repository                                              |
| VPC                       | `rwos-stg-ca-tor-vpc`                                                           | Custom-mode network                                            |
| Cloud Run subnet          | `rwos-stg-ca-tor-run-subnet`                                                    | CIDR remains a network-owner decision                          |
| Private service range     | `rwos-stg-ca-tor-psa-range`                                                     | CIDR remains a network-owner decision                          |
| Cloud SQL instance        | `rwos-stg-ca-tor-pg`                                                            | Immutable provider resource name captured after creation       |
| Application database      | `rwos_staging`                                                                  | Explicit staging label required                                |
| Disposable admin database | `rwos_validation_admin`                                                         | Test runner creates and removes uniquely named child databases |
| Redis instance            | `rwos-stg-ca-tor-redis`                                                         | Memorystore Basic                                              |
| Evidence bucket           | `<globally-unique-project-id>-rwos-stg-ca-tor-evidence`                         | Globally unique bucket name unresolved until project decision  |
| Log bucket                | `rwos-stg-ca-tor-logs`                                                          | Toronto, 30-day proposed retention                             |
| Monitoring workspace      | Project-scoped                                                                  | Record project number as immutable evidence                    |
| Budget                    | `rwos-stg-monthly-200-usd`                                                      | Alerts do not cap spending                                     |
| Cloud Run API             | `rwos-stg-api`                                                                  | Exact release revision label required                          |
| Employer web              | `rwos-stg-employer`                                                             | Exact release revision label required                          |
| Admin web                 | `rwos-stg-admin`                                                                | Exact release revision label required                          |
| Worker entry              | `rwos-stg-worker`                                                               | Production-mode entry; fixtures disabled                       |
| Authentication limiter    | `rwos-stg-auth-limiter`                                                         | Shared Redis-backed limiter; fail-closed readiness             |
| Candidate adapter         | `rwos-stg-candidate-source`                                                     | Synthetic records only                                         |
| Offer adapter             | `rwos-stg-offer-delivery`                                                       | Non-real recipients; no notifications                          |
| QA reset                  | `rwos-stg-qa-reset`                                                             | Tenant A/B allowlist only                                      |

Proposed service-account IDs:

- `sa-rwos-stg-deployer`
- `sa-rwos-stg-api`
- `sa-rwos-stg-employer`
- `sa-rwos-stg-admin`
- `sa-rwos-stg-worker`
- `sa-rwos-stg-limiter`
- `sa-rwos-stg-candidate`
- `sa-rwos-stg-delivery`
- `sa-rwos-stg-reset`
- `sa-rwos-stg-evidence`

Google recommends user-managed Cloud Run service identities and warns against relying on broadly
privileged default service accounts.

## 2. Required Google Cloud APIs

API enablement is an external write and requires separate approval.

| API                   | Service name                          | Reason                                                         |
| --------------------- | ------------------------------------- | -------------------------------------------------------------- |
| Service Usage         | `serviceusage.googleapis.com`         | Enable and inventory only the separately approved APIs         |
| Resource Manager      | `cloudresourcemanager.googleapis.com` | Read immutable project ID/number and project metadata          |
| IAM                   | `iam.googleapis.com`                  | Create approved user-managed service accounts and IAM bindings |
| IAM Credentials       | `iamcredentials.googleapis.com`       | Short-lived identity tokens; no service-account keys           |
| Cloud Run Admin       | `run.googleapis.com`                  | Host the eight exact-release staging services                  |
| Artifact Registry     | `artifactregistry.googleapis.com`     | Store immutable container images                               |
| Cloud Build           | `cloudbuild.googleapis.com`           | Only if the owner approves provider-side image builds          |
| Compute Engine        | `compute.googleapis.com`              | Custom VPC, subnet and Direct VPC egress                       |
| Service Networking    | `servicenetworking.googleapis.com`    | Private services access for Cloud SQL                          |
| Cloud SQL Admin       | `sqladmin.googleapis.com`             | Create/configure the staging PostgreSQL instance and PITR      |
| Memorystore for Redis | `redis.googleapis.com`                | Create/configure the shared staging limiter backend            |
| Secret Manager        | `secretmanager.googleapis.com`        | Regional secret references and controlled runtime access       |
| Cloud Storage         | `storage.googleapis.com`              | Regional evidence bucket and lifecycle deletion                |
| Cloud Logging         | `logging.googleapis.com`              | Regional log bucket, audit/configuration evidence              |
| Cloud Monitoring      | `monitoring.googleapis.com`           | Dashboards, checks, alerts and notification channels           |
| Cloud Billing Budget  | `billingbudgets.googleapis.com`       | USD $100 warning and USD $200 ceiling alerts                   |
| Pub/Sub               | `pubsub.googleapis.com`               | Proposed independent notification/budget channel               |

Do not enable optional APIs such as BigQuery, GKE, Vertex AI, Maps, notifications, payment, payroll
or tax services.

## 3. Minimal IAM matrix

Use groups for human access, user-managed service accounts for workloads, no long-lived
service-account keys, and resource-level IAM conditions where supported.

| Principal                    | Proposed role/permission                                                         | Scope                                                    | Why required                                                            | Removal point                                                           |
| ---------------------------- | -------------------------------------------------------------------------------- | -------------------------------------------------------- | ----------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Named project creator        | `roles/resourcemanager.projectCreator`                                           | Approved organization/folder                             | Create the dedicated project only after explicit authorization          | Immediately after project creation                                      |
| Named billing owner/operator | Minimum permissions to associate the approved billing account                    | Approved billing account and project                     | Attach billing only after calculator and spending approval              | After billing attachment; retain viewer/cost role only if approved      |
| Named API enabler            | `roles/serviceusage.serviceUsageAdmin`                                           | Staging project                                          | Enable only the approved API list                                       | Immediately after API enablement                                        |
| Named IAM/security operator  | `roles/iam.serviceAccountAdmin` plus narrowly approved IAM administration        | Staging project/service accounts                         | Create service identities and bindings                                  | After initial IAM configuration; re-grant per change                    |
| Deployer service account     | `roles/run.admin`                                                                | Eight named Cloud Run services/project                   | Create exact approved revisions and scaling configuration               | Disable after validation deployment; re-enable only for approved change |
| Deployer service account     | `roles/iam.serviceAccountUser`                                                   | Each runtime service account                             | Attach the approved identity to its Cloud Run service                   | Remove when deployment/change window closes                             |
| Deployer service account     | `roles/artifactregistry.reader`                                                  | Named container repository                               | Read immutable container images during deploy                           | Disable with deployer after deployment                                  |
| Artifact publisher           | `roles/artifactregistry.writer`                                                  | Named repository                                         | Publish exact release images                                            | Remove after image publication                                          |
| Database operator            | `roles/cloudsql.admin`                                                           | Named staging instance/project during approved window    | Create/configure staging instance, database, backups and PITR           | Remove after creation; separately re-authorize restore/teardown         |
| Database reviewer/witness    | `roles/cloudsql.viewer` and log viewer                                           | Named staging project                                    | Independently verify configuration and evidence                         | Remove after signed review unless ongoing review approved               |
| Redis operator               | `roles/redis.admin`                                                              | Named staging project during creation window             | Create/configure the Basic 1 GiB instance                               | Remove after configuration; re-authorize teardown                       |
| Secret operator              | `roles/secretmanager.admin`                                                      | Approved regional staging secrets only                   | Create references, IAM and versions through an authorized human process | Remove after secret setup/rotation window                               |
| API runtime SA               | `roles/secretmanager.secretAccessor`                                             | Only API-required secret resources                       | Resolve database, limiter and integration references at runtime         | Remove when API is disabled/teardown begins                             |
| Employer runtime SA          | `roles/run.servicesInvoker` if IAM-authenticated internal API calls are approved | API service only                                         | Invoke the internal API without a reusable cloud credential             | Remove on service teardown                                              |
| Admin runtime SA             | `roles/run.servicesInvoker` if IAM-authenticated internal API calls are approved | API service only                                         | Invoke the internal API                                                 | Remove on service teardown                                              |
| Worker runtime SA            | `roles/run.servicesInvoker` if IAM-authenticated internal API calls are approved | API service only                                         | Invoke the internal API                                                 | Remove on service teardown                                              |
| Limiter runtime SA           | `roles/secretmanager.secretAccessor`                                             | Limiter token, HMAC-key and Redis secret references only | Resolve the minimum limiter runtime secrets                             | Remove on service teardown                                              |
| Candidate runtime SA         | No project role by default                                                       | Its own service only                                     | Adapter uses application token boundary, not broad cloud access         | Delete on teardown                                                      |
| Delivery runtime SA          | No project role by default                                                       | Its own service only                                     | Adapter uses application token boundary, not broad cloud access         | Delete on teardown                                                      |
| QA reset runtime SA          | `roles/secretmanager.secretAccessor`                                             | Reset-token/test-credential references only              | Validate QA reset caller and deterministic staging dataset access       | Remove on reset-service teardown                                        |
| Evidence writer SA           | `roles/storage.objectCreator`                                                    | Evidence bucket only                                     | Append redacted artifacts without read/delete permission                | Disable after each approved run                                         |
| Evidence reviewer group      | `roles/storage.objectViewer`                                                     | Evidence bucket only                                     | Review retained evidence without mutation                               | Remove after Phase 1 closure/retention decision                         |
| Logging reviewer             | `roles/logging.viewer`; private log viewer only if separately approved           | Staging project/log bucket                               | Review non-secret logs and audit evidence                               | Remove after Phase 1 review                                             |
| Monitoring operator          | Narrow monitoring editor/notification-channel roles                              | Staging project                                          | Create approved dashboards, checks and alerts                           | Remove after configuration; retain viewer if approved                   |
| Billing cost reviewer        | Billing viewer/costs manager as chosen by billing owner                          | Billing account or project                               | Review calculator-versus-actual cost and budget alerts                  | Remove after teardown and final invoice review                          |

The exact IAM role split for billing attachment, budgets and Monitoring notification channels
requires billing/security-owner confirmation. Do not use basic Owner/Editor roles as a convenience.

## 4. Cloud Run inventory and sizing

All services use request-based billing, second-generation execution environment, CPU only during
request processing, no GPU, startup/liveness checks, exact image digest, release label containing
the full SHA, and Toronto placement.

| Service                     |      CPU |  Memory | Concurrency |     Timeout | Min instances | Max instances | Access                                           |
| --------------------------- | -------: | ------: | ----------: | ----------: | ------------: | ------------: | ------------------------------------------------ |
| `rwos-stg-api`              |   1 vCPU | 512 MiB |          20 |  60 seconds |             0 |             4 | HTTPS; application auth; health/readiness probes |
| `rwos-stg-employer`         |   1 vCPU | 512 MiB |          40 |  60 seconds |             0 |             2 | HTTPS employer surface                           |
| `rwos-stg-admin`            |   1 vCPU | 512 MiB |          40 |  60 seconds |             0 |             2 | HTTPS admin surface                              |
| `rwos-stg-worker`           |   1 vCPU | 512 MiB |          40 |  60 seconds |             0 |             2 | HTTPS production-mode worker entry               |
| `rwos-stg-auth-limiter`     | 0.5 vCPU | 256 MiB |          80 |   5 seconds |             0 |             2 | Internal authenticated API dependency            |
| `rwos-stg-candidate-source` | 0.5 vCPU | 512 MiB |           1 |  15 seconds |             0 |             2 | Authenticated staging adapter                    |
| `rwos-stg-offer-delivery`   | 0.5 vCPU | 512 MiB |           1 |  15 seconds |             0 |             2 | Authenticated staging adapter                    |
| `rwos-stg-qa-reset`         | 0.5 vCPU | 512 MiB |           1 | 120 seconds |             0 |             1 | Token-authenticated QA endpoint; Tenant A/B only |

For the limiter evidence exercise, drive sufficient concurrent API requests to prove at least two
real API instances. Do not set two always-on minimum instances merely to manufacture evidence.
Record revision IDs and instance evidence. Maximum instances are cost/safety limits, not capacity
claims.

Whether employer/admin/worker services can use Cloud Run IAM identity tokens for API calls without
an application change remains unconfirmed. If not, preserve the existing application-token
boundary and do not alter code in this planning phase.

## 5. Cloud SQL pricing-calculator configuration

| Setting                   | Proposed value                                                                        |
| ------------------------- | ------------------------------------------------------------------------------------- |
| Product                   | Cloud SQL for PostgreSQL                                                              |
| Region                    | `northamerica-northeast2`                                                             |
| Edition                   | Enterprise                                                                            |
| Availability              | Single zone                                                                           |
| Machine                   | General-purpose shared core, `db-g1-small`                                            |
| vCPU/memory               | Provider-defined shared vCPU; approximately 1.7 GiB memory                            |
| Database version          | Must match the repository/provider-supported PostgreSQL version; human decision       |
| Storage                   | 25 GiB, provider-supported general-purpose storage for selected shared-core tier      |
| Storage auto-increase     | Enabled with a documented low staging cap                                             |
| Public IP                 | Disabled                                                                              |
| Private IP                | Enabled                                                                               |
| TLS                       | Required; `sslmode=verify-full` preferred                                             |
| Server CA                 | Google-managed CA compatible with selected private connection method                  |
| Backups                   | Automated daily                                                                       |
| Backup retention          | Seven days proposed for staging                                                       |
| PITR                      | Enabled                                                                               |
| Transaction-log retention | Seven days proposed, subject to provider limits                                       |
| Deletion protection       | Enabled during validation; explicitly removed only in approved teardown               |
| Database flags            | Defaults unless an application requirement is documented                              |
| Maintenance               | Provider default window; record actual setting                                        |
| Query Insights            | Disabled initially unless monitoring owner approves cost/data handling                |
| Application database      | `rwos_staging`                                                                        |
| Disposable admin database | `rwos_validation_admin`                                                               |
| Database identities       | Separate runtime and temporary validation roles; secret values only in Secret Manager |

Shared-core tiers are intended for low-cost test/development and do not carry the Cloud SQL SLA.
The separate database reviewer/witness must approve instance creation, the temporary `CREATEDB`
grant, mutation testing, backup/PITR rehearsal and teardown.

## 6. Memorystore configuration

| Setting        | Proposed value                                                                              |
| -------------- | ------------------------------------------------------------------------------------------- |
| Product        | Memorystore for Redis                                                                       |
| Region         | `northamerica-northeast2`                                                                   |
| Tier           | Basic                                                                                       |
| Capacity       | 1 GiB                                                                                       |
| Version        | Latest provider-supported Redis version compatible with the limiter; verify before creation |
| Network        | `rwos-stg-ca-tor-vpc`                                                                       |
| Connectivity   | Private IP through Direct VPC egress                                                        |
| TLS/auth       | Provider-supported in-transit controls plus distinct application token/HMAC boundary        |
| Persistence/HA | No HA claim; Basic is staging-only                                                          |
| Purpose        | Atomic shared auth-rate-limit counters across at least two real API replicas                |
| Teardown       | Delete after evidence and retention review                                                  |

Planning estimate: approximately USD $0.049/GiB-hour, or about USD $36 for 730 hours, subject to
current Toronto pricing and the official calculator.

## 7. Regional Secret Manager plan

Create regional secrets only in `northamerica-northeast2`, use regional endpoints, user-managed
service identities and resource-scoped accessor grants.

Proposed non-secret reference IDs:

- `rwos-staging-database-url`
- `rwos-staging-postgres-admin-url`
- `rwos-staging-limiter-token`
- `rwos-staging-limiter-hmac-key`
- `rwos-staging-candidate-source-token`
- `rwos-staging-offer-delivery-token`
- `rwos-staging-e2e-employer-credentials`
- `rwos-staging-e2e-admin-credentials`
- `rwos-staging-e2e-worker-credentials`
- `rwos-staging-e2e-revoked-credentials`
- `rwos-staging-e2e-reset-token`
- `rwos-staging-native-worker-credentials`
- `rwos-staging-native-reset-token`

These are proposed names, not created resources. The limiter token and HMAC key must be distinct
from each other and every other credential. Never create service-account keys or set
`GOOGLE_APPLICATION_CREDENTIALS` on Cloud Run.

## 8. Artifact, evidence, logging and monitoring plan

### Artifact Registry

- Docker repository: `rwos-stg-ca-tor-containers`.
- Region: Toronto.
- Retain images by immutable digest.
- Label the exact full release SHA.
- Keep the approved candidate image plus one rollback image during Phase 1.
- Configure cleanup only after security confirms evidence needs.
- Vulnerability scanning is a separate cost/authorization decision.

### Evidence bucket

- Standard regional Cloud Storage in Toronto.
- Uniform bucket-level access; public access prevention enabled.
- Default encryption; customer-managed keys are a separate security/cost decision.
- Evidence writer receives object-create only.
- Reviewers receive object-view only.
- Lifecycle rule: delete objects when age reaches 30 days, after privacy/legal approval.
- Cloud Storage soft deletion can retain deleted objects beyond lifecycle deletion; the owner must
  decide whether the default soft-delete period is acceptable.
- Do not enable object versioning unless evidence governance requires it.

### Logging

- User-defined regional Toronto log bucket when supported for the chosen configuration.
- Proposed retention: 30 days.
- Route application, Cloud Run, Cloud SQL, Redis, IAM-denial and audit evidence required for Phase 1.
- Do not log request bodies, authorization headers, cookies, credentials, personal information,
  database errors or record contents.
- Admin Activity audit logs are mandatory; Data Access audit logs require explicit security/cost
  approval.
- Do not lock retention until privacy/legal approves; locking is difficult or irreversible.

### Monitoring and paging

- Dashboards: health/readiness, 5xx, latency, instance count, Cloud SQL connections/storage,
  limiter availability, candidate/delivery health and reset-service denials.
- Uptime checks for API health/readiness and approved integration health endpoints.
- Alerts: sustained readiness failure, 5xx rate, latency, database failure, limiter outage,
  candidate/delivery failure and budget thresholds.
- Primary channel: named staging email.
- Second independent channel: unresolved human/provider decision; Pub/Sub is proposed for
  independent evidence routing.
- No PagerDuty purchase.
- A named secondary on-call is required before the monitoring/incident evidence gate.

## 9. Private networking design

1. Create a custom-mode VPC in the dedicated staging project.
2. Create a Toronto subnet; the network owner must choose a CIDR that does not overlap any approved
   corporate/provider network.
3. Allocate a separate private services access range. Cloud SQL private services access can consume
   a `/24` per region; final CIDR is a network-owner decision.
4. Configure private services access through Service Networking for Cloud SQL.
5. Create Cloud SQL with private IP only.
6. Create Memorystore on the same VPC.
7. Configure API and QA reset Cloud Run services with Direct VPC egress to the Toronto subnet.
8. Use private-ranges-only egress unless the security owner approves all-traffic routing.
9. Connect directly to Cloud SQL private IP on PostgreSQL port 5432 with required TLS.
10. Connect to Redis by private IP using Direct VPC egress.
11. Keep web/adapters off the VPC unless they require private resources.
12. Permit only required ingress and service-to-service paths. Do not create a public Cloud SQL or
    Redis endpoint.

Google recommends Direct VPC egress for Cloud Run-to-Memorystore connectivity because it avoids
managed connector instances and can reduce cost and latency.

## 10. Budget controls

- Calculator and budget currency: USD.
- Planning estimate: USD $70–165/month.
- Planning ceiling: USD $200/month.
- Alert 1: actual spend USD $100.
- Alert 2: forecasted or actual spend USD $200.
- Recipients: named billing owner and project owner; no address recorded here.
- Optional Pub/Sub programmatic notification requires separate approval.
- No automated billing disable action without a tested owner-approved runbook.
- Budgets generate alerts; they do not automatically cap spending.
- Billing owner must approve the official calculator result before billing attachment or paid
  resource creation.

## 11. Pricing-calculator worksheet

Every amount remains an estimate until the official calculator is saved and approved.

| Product/input                | Filled planning value                                               | Estimated monthly USD | Confirmation needed                     |
| ---------------------------- | ------------------------------------------------------------------- | --------------------: | --------------------------------------- |
| Cloud Run API                | 1 vCPU, 512 MiB, request billing, min 0, low test traffic           |                 $0–10 | Request count/duration                  |
| Six other Cloud Run services | Sizes in section 4, min 0, low test traffic                         |                 $0–20 | Request count/duration                  |
| Cloud SQL                    | Enterprise `db-g1-small`, single-zone Toronto, 25 GiB, backups/PITR |                $25–60 | Current SKU, version, backup/log volume |
| Memorystore                  | Basic, 1 GiB, Toronto, 730 hours                                    |     approximately $36 | Current Toronto SKU                     |
| Secret Manager               | 13 proposed references, one active version each, low access         |                  $1–5 | Exact reference/version count           |
| Artifact Registry            | Two container generations, estimated 2–5 GiB                        |                  $1–3 | Actual image sizes/scanning             |
| Evidence bucket              | Standard Toronto, estimated 5–20 GiB, 30 days                       |                  $1–5 | Artifact volume/soft delete             |
| Logging/Monitoring           | Low staging volume, 30-day logs and limited checks                  |                 $0–20 | Log GiB/check frequency                 |
| Networking                   | Direct VPC egress, private services access, low egress              |                 $5–20 | Internet/data transfer                  |
| Paging channels              | Email plus unresolved independent channel                           |                  $0–5 | Channel selection                       |
| Contingency                  | Pricing/usage variance                                              |                 $1–16 | Official calculator                     |
| **Planning total**           |                                                                     |           **$70–165** | Official saved calculator estimate      |
| **Non-spending ceiling**     |                                                                     |              **$200** | Billing-owner approval                  |

No line authorizes spending. Taxes, currency conversion and support-plan charges are not included.

## 12. Values requiring human or provider decisions

- Globally unique GCP project ID and organization/folder.
- Billing account and named billing owner.
- Official saved calculator estimate.
- Project creation and billing-attachment authorization records.
- Exact PostgreSQL version and current supported shared-core/storage SKU.
- Database reviewer/witness.
- Database/network CIDRs and private-service range.
- Whether Cloud Build and vulnerability scanning are approved.
- Exact container image digests and immutable Cloud Run revision IDs.
- Data Access audit-log scope and expected logging cost.
- Second independent notification channel and recipient.
- Secondary on-call and incident commander.
- Privacy/legal approval for 30-day retention and Cloud Storage soft deletion.
- Evidence cleanup date.
- Tenant and safe test-account references.
- Secret Manager resource-reference names after creation.
- QA reset authority and operator.
- Whether application services support Cloud Run IAM identity-token calls without code changes.
- Immutable non-secret production cluster ID for staging/production separation proof; no production
  access is authorized.

## 13. Tenant A and Tenant B synthetic design

No names, emails, IDs or credentials are created here.

### Tenant A

- Active isolated organization.
- Active employer with unexpired membership and approved employer role.
- Active administrator with the minimum approved admin role.
- Active worker account with an active owned WorkerIdentity.
- Revoked role-assignment account.
- Expired-membership account.
- Inactive organization or membership account.
- Unknown-role account whose role is not in the authorization allowlist.
- Authenticated account without an active WorkerIdentity.
- Synthetic candidate records and non-real delivery references.
- At least two worker offers for accept/decline and one stale-version conflict.
- Confirmed Assignment reference with attendance remaining a handoff only.

### Tenant B

- Separate active organization.
- Employer, administrator and worker accounts scoped only to Tenant B.
- Records used solely to prove Tenant A callers receive generic denial/not-found behavior.
- No shared organization, membership, WorkerIdentity or record identifiers with Tenant A.

All identities are synthetic, staging-only and represented in evidence by safe opaque references.

## 14. QA reset boundary and cleanup

- Reset service accepts only authenticated `POST /v1/reset`.
- Allowed actions: `prepare` and `cleanup`.
- Require exact release SHA and the approved confirmation phrase.
- Hard allowlist exactly the approved Tenant A and Tenant B opaque IDs.
- Reject production project, production cluster, unknown tenant, wildcard and missing confirmation.
- Reset identity has no production IAM, project, database or network access.
- Reset may create/update/delete only deterministic staging test records enumerated in the approved
  initial-state and cleanup manifests.
- Reset never touches audit history, schema, migrations, provider configuration, real users or
  evidence artifacts.
- Prepare records safe counts and opaque references.
- Cleanup reconciles created records, removes test state in dependency order and proves zero
  unexpected residual records.
- Every reset emits a safe correlation ID, operator/service identity, tenant IDs, action, release
  SHA, UTC start/end and result without secrets or personal information.
- Any partial/unknown result blocks rerun until QA and database owners reconcile it.

## 15. Evidence retention and deletion

1. Store only redacted evidence in the Toronto evidence bucket.
2. Apply object lifecycle deletion at age 30 days only after privacy/legal approval.
3. Keep a non-secret evidence manifest containing object names, hashes, release SHA, creation time
   and deletion eligibility.
4. Review lifecycle configuration and soft-delete behavior before upload.
5. At day 25, notify the evidence/privacy owner of pending deletion.
6. At day 30, lifecycle deletion becomes eligible; provider execution can be delayed.
7. Verify deletion after the lifecycle window and any soft-delete period.
8. Record safe deletion timestamps and exceptions.
9. Legal hold or incident preservation requires a named owner decision; never silently bypass it.
10. Remove IAM access after evidence review even if provider retention continues.

## 16. Teardown plan

Estimated cleanup date: **missing human decision**. Proposed default is 30 calendar days after the
first authorized external validation run.

Teardown requires a separate, target-specific approval:

1. Freeze new validation runs and capture the final safe inventory.
2. Verify test-record cleanup and resolve unknown mutations.
3. Export only approved non-secret evidence.
4. Disable Cloud Run traffic, then services.
5. Disable evidence-writer and deployer service accounts.
6. Remove runtime Secret Manager access; destroy secret versions through the approved security
   process without exposing values.
7. Delete QA test identities and synthetic data through the approved application boundary.
8. Delete Memorystore after limiter evidence is accepted.
9. Perform the separately authorized backup/PITR rehearsal before deleting Cloud SQL.
10. Remove Cloud SQL deletion protection only with database owner and reviewer/witness approval.
11. Delete the Cloud SQL instance and confirm backup-retention behavior.
12. Delete Cloud Run services, images according to the artifact policy, network connections and
    private ranges after dependency checks.
13. Preserve/delete evidence according to the 30-day and legal-hold decision.
14. Remove IAM bindings, service accounts, monitoring policies and notification channels.
15. Review final billing, then detach billing only if the billing owner authorizes it.
16. Delete the staging project only after immutable evidence and final approval are recorded.

## 17. Provider creation runbook with approval stops

No command is supplied because execution is not authorized.

1. Review the official calculator inputs.
   - **STOP:** billing owner approves the estimate and USD $200 ceiling.
2. Select organization/folder and globally unique project ID.
   - **STOP:** infrastructure owner approves project creation.
3. Create the dedicated project.
   - **STOP:** capture immutable project ID/number and review before billing attachment.
4. Attach the approved billing account.
   - **STOP:** confirm billing association; no service creation.
5. Create USD $100/$200 budget alerts.
   - **STOP:** verify recipients and evidence.
6. Enable only the API list in section 2.
   - **STOP:** inventory enabled APIs and unexpected defaults.
7. Create user-managed service accounts.
   - **STOP:** security owner reviews identities before IAM grants.
8. Apply temporary operator and runtime IAM.
   - **STOP:** review effective policy and remove broad/default grants.
9. Create Artifact Registry and publish exact digest.
   - **STOP:** security/release owners approve image evidence.
10. Create VPC, subnet and private services access.
    - **STOP:** network/database owners verify CIDRs and isolation.
11. Create regional Secret Manager references.
    - **STOP:** no versions until security separately authorizes secret creation.
12. Create Cloud SQL configuration.
    - **STOP:** separate database reviewer/witness approves before creation.
13. Create the database instance.
    - **STOP:** verify TLS, private IP, PITR, backups, identity and immutable ID.
14. Create Memorystore.
    - **STOP:** verify region, VPC, tier, capacity and immutable ID.
15. Create regional evidence/log storage.
    - **STOP:** privacy/legal owner approves retention and soft-delete handling.
16. Create Monitoring and notification channels.
    - **STOP:** named secondary on-call and second channel are required before drill.
17. Create candidate, delivery and reset adapters.
    - **STOP:** integration/QA owners approve scopes and synthetic data.
18. Create API/web Cloud Run services.
    - **STOP:** release owner verifies exact image digest/SHA and mutation controls.
19. Create Tenant A/B and test identities.
    - **STOP:** QA owner verifies safe references; no validation yet.
20. Inject secret references into an ephemeral authorized execution context.
    - **STOP:** security owner verifies references without revealing values.
21. Request separate authorization for `pnpm validate:staging`.
    - **STOP:** no external validation command without that approval.

## 18. Non-secret creation evidence

Capture without secret values:

- Named authorization record, UTC timestamp and operator identity for every external action.
- Project ID, permanent project number, organization/folder reference and region.
- Billing-association reference and saved calculator estimate; no payment details.
- Budget ID, USD $100/$200 thresholds and safe recipient-role references.
- Enabled API names and timestamps.
- Service-account resource names, IAM bindings, conditions and removal dates.
- Artifact repository name, image digest, full release SHA and scan decision.
- VPC/subnet/private-range resource names and non-sensitive topology; omit unnecessary network
  details from broadly shared evidence.
- Cloud SQL resource name, database version, region, tier, storage, private-IP confirmation, TLS/CA
  mode, PITR/backup settings and deletion protection; never connection strings.
- Redis resource name, region, tier, capacity, VPC reference and safe health result.
- Secret resource names, region, IAM and version metadata only; never payloads.
- Cloud Run service/revision names, image digests, service identities, scaling, health and HTTPS
  origins.
- Evidence/log bucket names, locations, retention/lifecycle configuration and IAM.
- Monitoring dashboard/policy/channel opaque IDs and test status.
- Tenant/test-account opaque references and reset authority.
- Audit-log event IDs for project, billing, API, IAM and resource changes.
- Cleanup results, exceptions, corrective owner and due date.

## 19. Final authorization form

Approval is per action. Signing planning approval does not authorize provider execution.

### Infrastructure owner

- Named owner: Mohamed Al Mashhour (provisional planning role)
- Organization: 9375-7649 Québec Inc.
- Approved project ID/folder:
- Approved Toronto resource inventory:
- Approved action:
- UTC approval:
- Immutable approval record:
- Expiry/conditions:

### Billing owner

- Named owner: **missing**
- Approved billing account reference:
- Official calculator estimate:
- Approved ceiling: USD $200/month
- Approved action (billing attachment/budget/resource spend):
- UTC approval:
- Immutable approval record:
- Expiry/conditions:

### Database reviewer/witness

- Named reviewer/witness: **missing**
- Independence/role:
- Approved Cloud SQL configuration:
- Approved action (creation/mutation test/restore/teardown):
- UTC approval:
- Immutable approval record:
- Expiry/conditions:

### Security owner

- Named owner: Mohamed Al Mashhour (provisional planning role)
- Approved IAM matrix:
- Approved regional secret references:
- Approved audit/data-access scope:
- Approved action:
- UTC approval:
- Immutable approval record:
- Expiry/conditions:

### QA owner

- Named owner: Mohamed Al Mashhour (provisional planning role)
- Approved Tenant A/B references:
- Approved test-account reference list:
- Approved reset/cleanup manifests:
- Approved action:
- UTC approval:
- Immutable approval record:
- Expiry/conditions:

### Secondary on-call

- Named person: **missing**
- Contact reference (not contact value):
- Approved notification channel:
- Drill role:
- UTC approval:
- Immutable approval record:
- Expiry/conditions:

### Privacy/legal owner

- Named owner: **missing**
- Jurisdiction/applicable-law decision:
- Canadian residency decision:
- Thirty-day evidence retention decision:
- Soft-delete/legal-hold decision:
- Approved action:
- UTC approval:
- Immutable approval record:
- Expiry/conditions:

## 20. Official Google Cloud references

- [Enable and disable services](https://docs.cloud.google.com/service-usage/docs/enable-disable)
- [Cloud Run service identity](https://docs.cloud.google.com/run/docs/securing/service-identity)
- [Configure Cloud Run services](https://docs.cloud.google.com/run/docs/configuring)
- [Cloud Run CPU configuration](https://docs.cloud.google.com/run/docs/configuring/services/cpu)
- [Cloud Run to Cloud SQL](https://docs.cloud.google.com/sql/docs/postgres/connect-run)
- [Cloud SQL private IP](https://docs.cloud.google.com/sql/docs/postgres/private-ip)
- [Cloud SQL IAM roles](https://docs.cloud.google.com/sql/docs/postgres/iam-roles)
- [Cloud Run to Memorystore with Direct VPC egress](https://docs.cloud.google.com/memorystore/docs/redis/connect-redis-instance-cloud-run)
- [Secret Manager regional locations](https://docs.cloud.google.com/secret-manager/docs/locations)
- [Secret Manager access control](https://docs.cloud.google.com/secret-manager/docs/manage-access-to-secrets)
- [Cloud Storage IAM roles](https://docs.cloud.google.com/storage/docs/access-control/iam-roles)
- [Cloud Storage lifecycle management](https://docs.cloud.google.com/storage/docs/lifecycle)
- [Cloud Logging buckets and retention](https://docs.cloud.google.com/logging/docs/buckets)
- [Cloud Billing budgets](https://docs.cloud.google.com/billing/docs/how-to/budgets)
- [Cloud Run pricing](https://cloud.google.com/run/pricing)
- [Cloud SQL pricing](https://cloud.google.com/sql/pricing/)
- [Memorystore pricing](https://cloud.google.com/memorystore/docs/redis/pricing)
- [Secret Manager pricing](https://cloud.google.com/secret-manager/pricing)
- [Artifact Registry pricing](https://cloud.google.com/artifact-registry/pricing)

## Stop condition

External Validation Phase 1 remains **BLOCKED**. The package is ready for human review, but the
billing owner, separate database reviewer/witness, secondary on-call, privacy/legal owner, project
ID/folder, official calculator estimate, CIDRs, second notification channel, exact resource IDs,
endpoints, test-account references, Secret Manager resource references, cleanup date and
target-specific external authorizations remain missing.

The first external action is creation of the dedicated non-production GCP project. It requires a
named infrastructure-owner approval for the exact project/organization/folder and a separate
billing-owner approval before billing attachment. Neither action is authorized by this document.
