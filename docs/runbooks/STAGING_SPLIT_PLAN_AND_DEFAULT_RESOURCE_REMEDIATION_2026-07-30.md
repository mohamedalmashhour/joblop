# Staging Split Plan and Default-Resource Remediation

Status: **PLANNING ONLY — X1 NOT AUTHORIZED**

Release checkpoint: `9f62b8a377800d5cf843083b5cbab30f70412fdb`

The rejected combined plan digest
`e60186c5b865c089214d4fb6e1ea852eb95112d243220d5a9f6ca58f4d7005b1`
must never be applied.

## Plan A — bootstrap

Plan A creates only the Toronto Artifact Registry repository, GitHub workload-identity federation,
separate publisher and deployer identities, their narrow repository/deployment roles, and a USD 300
monthly budget with 50%, 80%, 100%, and forecasted-100% alerts. Budget alerts are notifications,
not a hard spending cutoff.

Plan A does not create application runtime resources. Images remain unpublished until Plan A
receives its own approval.

## Plan B — runtime

Plan B remains blocked until Plan A is applied, all eight images are published and their immutable
digests are reviewed, monitoring ownership is named, and every required non-secret/secret reference
exists. It creates the dedicated `10.80.0.0/24` custom network, private PostgreSQL and Redis,
per-service identities and least-privilege bindings, bounded Cloud Run services, a 14-day log
bucket, and monitoring.

Cloud SQL starts at 10 GiB and cannot auto-grow beyond 20 GiB. All Cloud Run services keep minimum
instances at zero and maximum instances at one. Stripe, email and public registration remain
disabled until separately configured and approved.

## Emergency cost control

Budgets do not stop spend. If forecast or actual spend reaches 80%, the named Billing Owner and
Infrastructure Owner must freeze image publication and deployment. At 100%, the named Release Owner
must set Cloud Run maximum instances to zero or disable traffic using a separately reviewed change,
then stop Redis and Cloud SQL only after backup and rollback evidence is captured. Destructive
teardown requires a reviewed Terraform destroy plan; never use an unreviewed broad destroy command.

## Default-resource remediation proposal

Enabling Compute created the auto-mode `default` VPC, regional subnets, a default Compute service
account and Google-managed service agents. No RWOS configuration may use them.

After Plan B is proven on the dedicated custom VPC:

1. Verify no instance, forwarding rule, route, firewall policy, connector, peering or other project
   depends on the default VPC.
2. Verify no workload uses the default Compute service account.
3. Prepare a separate removal plan showing every affected resource and rollback boundary.
4. Remove the default service account's Editor grant before disabling the account, but only with
   explicit Security and Infrastructure Owner approval.
5. Delete the default VPC only after a second read-only dependency inventory is empty.

No default resource is modified by Plan A or Plan B.

## IAM matrix

| Principal | Scope | Role | Purpose |
| --- | --- | --- | --- |
| GitHub `main` WIF subject | Publisher service account | `roles/iam.workloadIdentityUser` | Short-lived image publication identity |
| GitHub `main` WIF subject | Deployer service account | `roles/iam.workloadIdentityUser` | Short-lived staging deployment identity |
| Publisher service account | Named Artifact Registry repository | `roles/artifactregistry.writer` | Push reviewed immutable images only |
| Deployer service account | Named Artifact Registry repository | `roles/artifactregistry.reader` | Resolve reviewed digests |
| Deployer service account | Staging project | `roles/run.developer` | Manage Cloud Run without project administration |
| Deployer service account | Each runtime service account | `roles/iam.serviceAccountUser` | Attach only the eight named identities |
| Employer/Admin/Worker identities | API Cloud Run service | `roles/run.invoker` | Exact web-to-API invocation |
| API identity | Limiter/Candidate/Delivery services | `roles/run.invoker` | Exact internal invocation |
| Each runtime identity | Only its referenced secrets | `roles/secretmanager.secretAccessor` | No project-wide secret access |

## Environment and secret matrix

| Service | Required non-secret groups | Secret references |
| --- | --- | --- |
| API | environment, internal/public origins, limiter/candidate/delivery origins and key IDs; Stripe and registration disabled | database, session, limiter token/HMAC, candidate token, delivery token |
| Employer/Admin | production-mode runtime and non-local API origin | none |
| Worker | staging runtime and public API origin | none |
| Auth limiter | dual-required auth, audience, caller, release, namespace and Redis endpoint | service token and HMAC |
| Candidate source | dual-required auth, audience, caller and release | service token |
| Offer delivery | dual-required auth, audience, caller and release | service token |
| QA reset | PostgreSQL-only persistence, dual-required auth, audience, caller and release | database and staging-only reset credential |

Terraform validates the required keys. Secret values are never Terraform variables; Plan B creates
only secret containers and least-privilege bindings. An authorized human must add versions through
Secret Manager before Plan B can become executable.

## Scaling, storage and planning cost

- Cloud Run: minimum `0`, maximum `1` per service; request-based costs remain workload-dependent.
- Cloud SQL: zonal `db-custom-1-3840`, 10 GiB SSD initial disk, hard auto-growth limit 20 GiB,
  seven retained backups and seven days PITR.
- Redis: Basic, 1 GiB.
- Application logs: dedicated Toronto bucket, 14-day retention.
- Artifact Registry: untagged images older than seven days are removed.

Plan A has no continuously running compute/database/cache. Expected baseline is approximately
USD 0–5/month, driven by stored image bytes and registry operations after publication. Plan B's
low-traffic planning range is approximately USD 90–130/month before unusual egress, log volume or
Cloud Run load. USD 300 is an alert ceiling, not a guaranteed cutoff. Sustained requests can exceed
it even with one instance per service, so Plan B still requires an official calculator estimate,
approved workload assumptions and the emergency procedure before authorization.

## Separate approval wording

Plan A:

> I authorize only Plan A bootstrap for project `resident-workforce-os-staging`, Toronto region,
> release SHA and exact plan digest stated in the final review, with USD 300 monthly and USD 75
> one-time ceilings. This authorizes the listed bootstrap resources only. It does not authorize
> Plan B, runtime resources, image publication beyond the reviewed workflow, DNS, production, live
> payments or real data.

Plan B:

> After Plan A evidence, published immutable image digests, complete provider references, named
> owners and a separately reviewed Plan B digest are supplied, I authorize only that exact Plan B
> runtime plan within the approved ceilings. Production, DNS, live payments, real email and real
> data remain excluded.

Current value: `X1_STAGING_AUTHORIZED=NOT_YET`.
