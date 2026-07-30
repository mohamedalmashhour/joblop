# Infrastructure

The repository contains an **unapplied, staging-only** Terraform package under `staging/`.
It is a review artifact and does not authorize GCP access, billing attachment, API enablement,
resource creation, deployment or spending.

The package requires the exact project ID/number, billing authorization, workload-identity
repository, network ranges, immutable image digests and approved secret **names**. It rejects
non-Toronto regions, a non-staging environment, tag-only images and absent authorization inputs.
It never accepts secret values as Terraform variables and does not create or attach a billing
account.

Production infrastructure is intentionally absent. Copying or renaming this package for production
requires a separate architecture review and explicit production authorization after staging
evidence passes.

Local static validation:

```sh
pnpm exec vitest run scripts/staging-infrastructure.test.ts
```

Do not run `terraform apply` until the exact external-input checklist is complete and Mohamed has
approved the reviewed plan and spending ceiling.
