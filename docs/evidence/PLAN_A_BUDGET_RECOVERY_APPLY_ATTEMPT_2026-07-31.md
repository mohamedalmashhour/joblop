# Plan A Budget Recovery Apply Attempt

Status: **NOT APPLIED — STOPPED FAIL CLOSED**

Observed UTC: `2026-07-31T16:04:10Z`

## Approved input and preflight

- Evidence checkpoint: `8df14ae7588f10715987edc231d03c5636fb4f4d`
- Foundation Validation run `30643691415`: success.
- Approved saved-plan SHA-256:
  `05c8aa14fbdeb7de38386c865570c0a4785ab3f3020a951225c16d916afe3ddf`
- Recalculated digest: exact match.
- Verified plan boundary: one addition, zero changes and zero deletions.
- Verified only addition: `google_billing_budget.staging`.
- Verified CAD 500 amount, 33/67/90/100 percent thresholds, default recipients, project-level
  recipients, existing owner channel and zero IAM impact.
- Remote lock was available.

## Attempt results

The first apply attempt created no budget. Google rejected the request because local user
credentials did not supply an explicit quota project for the Cloud Billing Budget API. Terraform
released the remote lock.

A read-only retry preview set `resident-workforce-os-staging` as the quota project and reconfirmed
exactly one budget addition, zero changes and zero deletions. The saved-plan digest remained the
approved value.

The retry of that same saved plan performed no mutation because Terraform rejected it as stale: the
remote state metadata had advanced after the failed operation/refresh. This is Terraform's expected
saved-plan safety behavior. A replacement saved plan would have a different digest and is outside
the authorization, so no replacement plan was generated or applied.

## Final read-only evidence

- Budget in remote state: absent.
- Existing Plan A resources in remote state: 12.
- Current remote lock: released.
- Retained state generations:
  - `1785509411331298`
  - `1785510497485279`
  - `1785510512813199`
  - `1785513778115519`
- No IAM, runtime, image, secret, DNS, provider or production mutation occurred during recovery.
- Expected and observed direct budget cost: CAD 0 because the budget was not created.

## Local validation

The complete `pnpm validate` suite passed when run with the required local-loopback permission:

- lint and typecheck passed;
- 1,128 tests passed and 13 policy/external-database tests remained intentionally skipped;
- environment, boundary and migration-integrity validation passed;
- secret scan passed;
- all production builds passed;
- public-bundle scan passed across 530 artifacts and 158 classified environment names.

An initial sandboxed run was non-evidentiary because the sandbox denied loopback listeners with
`EPERM`; the identical escalated local-only run passed.

## Required next authorization

The stale saved plan must not be reused. Completion requires generating a new locked saved plan
against generation `1785513778115519`, verifying it contains exactly the same single budget
addition, and obtaining separate approval tied to its new SHA-256 digest before applying it with the
explicit staging quota project.

Plan B and `X1_STAGING_AUTHORIZED` remain not authorized.
