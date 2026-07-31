# Terraform Remote-State Strategy

Status: **PLANNING ONLY — PLAN 0, PLAN A AND X1 NOT AUTHORIZED**

Release checkpoint: `fb209790522bbc366bf14c99d78880c613a67835`

## Current state

The staging Terraform packages previously omitted a backend block, so Terraform used the local
backend by default. No `terraform.tfstate`, state backup, saved plan or `.terraform/` content is
tracked by Git. Repository ignore rules cover `.terraform/`, `*.tfstate`, `*.tfstate.*` and
`*.tfplan`.

No infrastructure has been applied. The existing local saved plans contain no applied state and
remain ignored with mode `600`.

## Plan 0 — remote-state bootstrap

Plan 0 is a separately reviewed configuration under `infrastructure/staging/state-bootstrap`.
It proposes one dedicated Standard-class GCS bucket in `northamerica-northeast2` and one
bucket-scoped operator binding.

Plan 0 intentionally retains an explicit local backend for its first approved apply because its
destination bucket does not exist yet. Its temporary path is
`.staging-inputs/terraform-plan0-bootstrap.tfstate`, outside the Terraform package and protected by
the repository-wide ignored local-input directory. `backend.tf` is replaced with the reviewed
`backend.gcs.tf.example` content only after the bucket controls are verified; the resulting change
is reviewed before `terraform init -migrate-state`.

Controls:

- uniform bucket-level access;
- enforced public-access prevention;
- Google-managed encryption at rest;
- object versioning;
- seven-day soft-delete recovery;
- noncurrent versions retained for 90 days, with at least 20 newer versions preserved;
- `force_destroy = false`;
- one verified operator with bucket-scoped `roles/storage.objectAdmin`;
- native GCS backend state locking.

An immutable bucket-retention lock is intentionally not proposed. Terraform's GCS lock object and
normal state-version maintenance require object deletion; a bucket-wide locked retention policy
could prevent lock cleanup. Versioning, soft delete and the bounded noncurrent-version lifecycle
provide recovery without making routine locking unusable.

## Credential-free backend configuration

Plan 0:

```hcl
bucket = "resident-workforce-os-staging-tfstate-800188428439"
prefix = "terraform/state-bootstrap"
```

Plan A:

```hcl
bucket = "resident-workforce-os-staging-tfstate-800188428439"
prefix = "terraform/plan-a-bootstrap"
```

Plan B, still prohibited:

```hcl
bucket = "resident-workforce-os-staging-tfstate-800188428439"
prefix = "terraform/plan-b-runtime"
```

Backend files contain no credentials. Authentication uses the approved short-lived Google identity.
Never add access tokens, service-account keys or credential paths to backend configuration.

## Safe bootstrap sequence

1. Review and explicitly approve the exact Plan 0 release SHA and plan digest.
2. Confirm the explicit local-backend path is under `.staging-inputs`, mode `600` when created, and
   Git-ignored. Back up any pre-existing Plan 0 state to an encrypted recovery location.
3. Initialize Plan 0 with `terraform init -reconfigure`; apply only the exact approved saved Plan 0.
   This is the sole local-state bootstrap operation.
4. Verify bucket location, public-access prevention, uniform access, versioning, soft delete,
   lifecycle and the exact IAM member.
5. Replace the reviewed local backend block with the reviewed GCS backend block. Run
   `terraform init -migrate-state -backend-config=...` for Plan 0. Confirm the prompt references only
   the approved local state, bucket and prefix.
6. Verify the remote state lineage and serial using metadata-only commands. Do not print state.
7. Securely destroy the temporary local state only after remote verification and a recoverable
   object generation exist.
8. Initialize Plan A with its separate prefix and generate a new Plan A. Do not reuse the earlier
   local-backend plan.
9. Plan B remains prohibited and later receives its own prefix.

If migration fails, preserve the local recovery copy, make no further changes, resolve access, and
retry `terraform init -migrate-state`. Never use `terraform state push -force`.

## Recovery

1. Stop all Terraform writers and confirm no active run owns the lock.
2. Identify the last known-good object generation and state serial without downloading it into the
   repository.
3. Restore that generation to a protected temporary object or mode-`600` local recovery file.
4. Review lineage, serial and the proposed recovery diff with the Infrastructure and Security
   owners.
5. Restore through a reviewed operation. Never overwrite a newer state or force-unlock another
   active writer.
6. Run a refresh-only plan and compare the complete resource inventory before any apply.
7. Record the object generation, actor, UTC time, reason and verification result.

## Cost

Plan 0 creates no compute, database, Redis, Cloud Run or application runtime. State storage is
expected to remain far below one GiB. Cost consists only of small Standard Storage, operation and
version/soft-delete retention charges. Use a conservative planning allowance of **CAD 1 per month**;
actual cost is usage-based and should normally be only cents. This is not spending authorization.

## Separate approvals

Plan 0:

> I authorize only the exact reviewed Plan 0 saved plan for the dedicated
> `resident-workforce-os-staging` Terraform-state bucket in Toronto and its one bucket-scoped
> operator IAM binding. I approve a maximum CAD 1/month state-storage allowance. This does not
> authorize Plan A, Plan B, image publication, runtime resources, DNS, providers or production.

Plan A, only after Plan 0 evidence and remote initialization:

> I authorize only the exact Plan A release SHA and remote-backed saved-plan digest produced after
> Plan 0 migration. I authorize only its reviewed bootstrap resources within the approved CAD
> ceiling. Plan B, images, runtime resources, DNS, production and live providers remain prohibited.
