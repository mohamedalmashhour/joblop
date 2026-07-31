# Plan A Partial Apply Evidence

Status: **PARTIAL APPLY — STOPPED FAIL CLOSED**

Observed UTC: `2026-07-31T15:10:19Z`

## Approved input

- Application release: `4db1fca296a67d00fe7b603b2cc3cfa763971b4d`
- Evidence commit: `266733ae535f98400c9b2f72863892d2f961d98a`
- Saved-plan SHA-256:
  `817ff51254cb8a6fa92e2223611fc4623575255402ad6070a691f4b0a518119a`
- Approved boundary: 13 additions, 0 changes, 0 deletions.

Preflight recalculated the digest and verified the exact inventory, IAM principals, WIF claims and
available remote lock before applying the saved plan.

## Result

Terraform created 12 of the 13 approved resources. The Cloud Billing Budget resource was not
created. The process released the GCS lock, and the remote state contains these 12 resources:

1. Toronto Artifact Registry repository.
2. Repository-scoped publisher writer binding.
3. Repository-scoped deployer reader binding.
4. GitHub workload-identity pool.
5. GitHub workload-identity provider.
6. Owner notification channel.
7. Project-scoped deployer Cloud Run developer binding.
8. Deployer service account.
9. Publisher service account.
10. GitHub deployer impersonation binding.
11. GitHub publisher impersonation binding.
12. Conditional deployer Terraform-state binding.

The remote-state generation after the partial apply is `1785510512813199`, size 22,610 bytes.
Three state generations are retained. Historical lock generations are retained, and no current lock
object remains.

## Verified controls

- Publisher has no Terraform-state access.
- Deployer state access remains conditioned on only the reviewed Plan A and Plan B prefixes.
- No public or domain-wide IAM grant is present in Plan A state.
- WIF still requires the approved private repository, `main`, `staging` and exact application
  release SHA.
- The explicit owner channel exists and is enabled. Its API verification status is `UNSPECIFIED`;
  no claim of manual confirmation is made.
- No Cloud Run service, Cloud SQL, Redis, runtime secret, DNS, image or application deployment was
  created.

## Root cause and fail-closed stop

A fresh read-only plan reports exactly one remaining addition: `google_billing_budget.staging`.
Read-only Google Cloud discovery reports that `billingbudgets.googleapis.com` is disabled for the
staging project. Enabling that API was not part of the 13-resource saved plan or the explicit Plan A
authorization.

The original saved plan can no longer be reapplied safely because 12 resources now exist and a new
plan would have a different digest. No retry, API enablement or replacement plan was performed.
Completing Plan A requires separate authorization to enable only the Cloud Billing Budget API and
review a new saved recovery plan containing exactly one budget addition, zero changes and zero
deletions.

Plan B, image publication and `X1_STAGING_AUTHORIZED` remain prohibited/not authorized.
