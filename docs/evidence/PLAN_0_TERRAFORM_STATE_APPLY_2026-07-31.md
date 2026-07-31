# Plan 0 Terraform State Apply Evidence

Status: **PLAN 0 VERIFIED — PLAN A, PLAN B AND X1 NOT AUTHORIZED**

Verification completed UTC: `2026-07-31T04:36:09Z`

## Approved boundary

- Release: `28f3e7c2879c58390b5e7d90c8ef747d0107730d`
- Saved-plan digest: `8e103177fcf994e2ffebf0b2afae63862299c219d0fbde3f8120b2ba9a6553ab`
- Approved inventory: one Toronto GCS state bucket and one bucket-scoped
  `roles/storage.objectAdmin` binding for the approved operator.
- Authorized cost ceiling: CAD 1/month.

Preflight recalculated the digest and confirmed exactly two additions, zero changes and zero
deletions. The bucket did not exist. The protected local state path was absent, Git-ignored and
configured under a mode-`700` directory with umask `077`.

## Apply receipt

Terraform reported:

```text
Apply complete! Resources: 2 added, 0 changed, 0 destroyed.
```

Created:

1. `google_storage_bucket.terraform_state`
2. `google_storage_bucket_iam_member.terraform_operator`

No Plan A, Plan B, runtime, image, DNS, secret or provider resource was created.

## Bucket controls

Read-only post-apply verification confirmed:

- location `NORTHAMERICA-NORTHEAST2`;
- Standard storage class;
- public-access prevention `enforced`;
- uniform bucket-level access enabled;
- object versioning enabled;
- seven-day (`604800` seconds) soft deletion;
- noncurrent versions eligible for deletion only after 90 days while preserving at least 20 newer
  versions;
- `force_destroy = false` in Terraform state and configuration;
- exactly one bucket-scoped `roles/storage.objectAdmin` member, matching the approved operator;
- no `allUsers` or `allAuthenticatedUsers` IAM members.

Google-created legacy bucket roles remain visible for project-level principals. Plan 0 did not add
those bindings; uniform bucket-level access disables object ACLs, and public-access prevention
blocks public principals.

## State migration and recovery

- Active backend: GCS.
- Prefix: `terraform/state-bootstrap`.
- Remote state resources: exactly two.
- Versioned state generations verified: two.
- Total current and retained state bytes at verification: 7,607 bytes.
- A Terraform plan with locking enabled completed successfully.
- The GCS lock object was released after the plan.
- Fresh result: `0 additions, 0 changes, 0 deletions`.
- The superseded local state and local recovery copy were removed after remote verification.
- Saved plans, backend inputs and evidence logs remain mode `600` and Git-ignored.

Never use `terraform state push -force`. Recovery must select a reviewed object generation, verify
lineage and serial, and run a refresh-only comparison before any apply.

## Cost observation

No immediate billed amount was available at verification time; Cloud Billing usage can be delayed.
The stored state footprint was 7,607 bytes. The approved maximum remains CAD 1/month. This evidence
does not authorize Plan A, Plan B or any additional spending.
