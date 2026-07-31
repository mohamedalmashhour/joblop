# Plan A Budget Recovery Plan Evidence

Status: **SAVED FOR SEPARATE APPROVAL — NOT APPLIED**

Prepared UTC: `2026-07-31T15:37:15Z`

Evidence checkpoint: `0a7dcfbc751a38bf329cc577f1fff73e9fea1bca`

## CI and API preparation

Foundation Validation run `30641767480` passed for the evidence checkpoint.

Only `billingbudgets.googleapis.com` was enabled in project
`resident-workforce-os-staging`. A before/after enabled-service comparison showed that exact single
addition and no service removal. Google documents the Cloud Billing Budget API as free to use.
This recovery does not configure Pub/Sub or another usage-billed notification resource.

API enablement created no Terraform runtime resource and has CAD 0 expected direct cost.

## Existing state verification

- The refreshed remote state contains the existing 12 Plan A resources.
- No unexpected drift, update or deletion was found.
- Plan A state generations retained:
  - `1785509411331298`
  - `1785510497485279`
  - `1785510512813199` (current before recovery-plan generation)
- A locked unsaved refresh/preview succeeded and released its lock.
- The saved recovery-plan operation also released its lock.
- Historical lock generations remain available as lock-operation evidence.

## New saved recovery plan

Saved-plan SHA-256:

`05c8aa14fbdeb7de38386c865570c0a4785ab3f3020a951225c16d916afe3ddf`

Exact boundary: **1 addition, 0 changes, 0 deletions, 0 replacements**.

Only resource:

`google_billing_budget.staging`

Configuration:

- project-scoped monthly budget;
- CAD 500 amount;
- actual-spend thresholds at 33%, 67%, 90% and 100%;
- default eligible billing-account IAM recipients enabled;
- project-level recipients enabled;
- existing explicit owner notification channel attached.

IAM impact: **none**. The plan contains no IAM, runtime, application, image, secret, DNS, database,
Redis, Cloud Run, Stripe or email-provider resource.

Expected direct cost of creating and using the budget is CAD 0. A budget is an alerting control and
not a hard spending cutoff.

## Local protection

The saved plan, JSON inspection output, backend input, variable input, API inventories and preview
log are mode `600`, Git-ignored and untracked. The superseded prior Plan A saved plan and its JSON
were removed so they cannot be reused; their historical digest and evidence remain in Git.

## Exact proposed recovery authorization

> I authorize only the Plan A budget recovery saved plan with SHA-256
> `05c8aa14fbdeb7de38386c865570c0a4785ab3f3020a951225c16d916afe3ddf`.
> I authorize exactly 1 addition, 0 changes and 0 deletions. The only permitted addition is
> `google_billing_budget.staging`: a project-scoped CAD 500 monthly notification budget with
> thresholds at 33%, 67%, 90% and 100%, default eligible billing recipients, project-owner
> recipients and the existing explicit owner notification channel. Expected direct cost is CAD 0.
> Stop if the digest, inventory, state, recipients or cost differs. This does not authorize Plan B,
> image publication, runtime resources, secrets, DNS, external providers or production.

`X1_STAGING_AUTHORIZED=NOT_YET` remains unchanged.
