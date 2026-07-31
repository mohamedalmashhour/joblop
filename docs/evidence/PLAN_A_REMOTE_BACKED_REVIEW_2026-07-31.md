# Plan A Remote-Backed Review Evidence

Status: **SAVED FOR REVIEW — NOT AUTHORIZED OR APPLIED**

Prepared from release: `4db1fca296a67d00fe7b603b2cc3cfa763971b4d`

Saved-plan SHA-256:
`817ff51254cb8a6fa92e2223611fc4623575255402ad6070a691f4b0a518119a`

## Remote backend

- Bucket: `resident-workforce-os-staging-tfstate-800188428439`
- Prefix: `terraform/plan-a-bootstrap`
- Backend configuration, saved plan and JSON inspection output are mode `600` and Git-ignored.
- The bucket remains in Toronto with public-access prevention, uniform bucket-level access,
  versioning, seven-day soft deletion and the reviewed noncurrent-version lifecycle.
- Locked preview and saved-plan operations succeeded. The current lock was released; retained lock
  generations provide evidence of the lock operations.
- The initialized Plan A state has one versioned 181-byte generation. Plan 0 state and resources are
  not in this plan.

## Exact plan boundary

Plan: **13 additions, 0 changes, 0 deletions, 0 replacements**.

1. One Toronto Artifact Registry Docker repository with untagged-image cleanup after seven days.
2. Artifact Registry writer binding for the publisher service account.
3. Artifact Registry reader binding for the deployer service account.
4. One CAD 500 project-scoped billing budget.
5. One GitHub workload-identity pool.
6. One GitHub OIDC workload-identity provider.
7. One project-owner email notification channel.
8. Project-scoped `roles/run.developer` for the staging deployer.
9. One staging deployer service account.
10. One staging publisher service account.
11. GitHub workload-identity impersonation binding for the deployer.
12. GitHub workload-identity impersonation binding for the publisher.
13. A conditional, bucket-scoped `roles/storage.objectAdmin` binding for the deployer, restricted to
    the `terraform/plan-a-bootstrap/` and `terraform/plan-b-runtime/` object prefixes.

The plan contains no Cloud Run service, Cloud SQL, Redis, runtime secret, DNS record, application
deployment, public IAM member or domain-wide IAM grant.

## Identity and state-access review

The GitHub provider accepts tokens only when all of these claims match:

- repository `drmmashhour-ux/resident-workforce-os`;
- repository visibility `private`;
- ref `refs/heads/main`;
- environment `staging`;
- release SHA `4db1fca296a67d00fe7b603b2cc3cfa763971b4d`.

The exact additional Terraform-state principal is:

`serviceAccount:sa-rwos-stg-deployer@resident-workforce-os-staging.iam.gserviceaccount.com`

Its state permission is conditional on the two reviewed deployment-state prefixes. The publisher
service account has no Terraform-state role. The approved human Plan 0 operator binding remains
bucket-scoped and unchanged by the Plan A state.

## Budget and cost

- Currency: CAD.
- Alert amount: CAD 500 per month.
- Thresholds: 33%, 67%, 90% and 100% of current spend.
- Default billing-account IAM recipients remain enabled.
- Project-level recipients remain enabled.
- The explicit owner notification channel remains enabled.

Expected Plan A initial resource-usage cost is **CAD 0**. Before separately authorized image
publication, the repository is empty, and IAM, service-account, WIF and budget configuration do not
create runtime consumption. Artifact Registry becomes usage-billed only when artifacts are stored,
scanned or transferred; the first 0.5 GiB-month free tier is billing-account-wide and must not be
assumed available. Existing state storage remains governed by the separate Plan 0 maximum of CAD 1
per month. CAD 500 is an alert threshold, not a hard spending cutoff or permission to spend CAD 500.

## Exact proposed authorization wording

> I authorize only Plan A for release
> `4db1fca296a67d00fe7b603b2cc3cfa763971b4d` using saved-plan SHA-256
> `817ff51254cb8a6fa92e2223611fc4623575255402ad6070a691f4b0a518119a`.
> I authorize exactly 13 additions, 0 changes and 0 deletions as inventoried in
> `PLAN_A_REMOTE_BACKED_REVIEW_2026-07-31.md`: the Toronto Artifact Registry repository, GitHub WIF
> pool/provider, two staging service accounts, their reviewed least-privilege IAM bindings, the
> conditional deployer state-prefix binding, the CAD 500 budget and owner notification channel.
> I authorize CAD 0 expected initial resource-usage cost before image publication. I do not
> authorize Plan B, image publication, Cloud Run, Cloud SQL, Redis, runtime secrets, DNS, external
> providers or production. Stop if the saved-plan digest or inventory differs.

`X1_STAGING_AUTHORIZED=NOT_YET` remains unchanged for Plan B.
