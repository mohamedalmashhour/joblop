# Staging secure-input handoff

Status: **PRE-PLAN INPUT COLLECTION ONLY — NO DEPLOYMENT OR SPENDING AUTHORIZED**

Release SHA: `4a3f4acc48f2c85a87daf3ec86bff1ca7962e1f3`

The local `.staging-inputs/` directory is excluded by `.gitignore`. Its files must never be staged,
committed, copied into chat, or attached to tickets.

## Local files

- `non-secret-identifiers.local`: ordinary identifiers and planning inputs. These values may still
  be operationally sensitive, so keep the file local.
- `owner-signature.local`: the owner's actual UTC signing time and approval reference. A file
  creation or receipt timestamp is not a signature.
- `secret-manager-entry.local`: instructions only. Do not put secret values in this repository.

## Ordinary identifiers

These are not authentication secrets: GCP project ID and number, billing-account reference,
approved network CIDRs, Secret Manager **names**, Stripe test account/configuration references
that contain no key or token, synthetic email-provider configuration references, monitoring
destination reference, and named staging owners.

Do not treat “not a secret” as “public.” Billing, monitoring and ownership metadata must remain
limited to authorized reviewers.

## Secret values

Passwords, API keys, Stripe secret and webhook keys, email-provider credentials, database URLs,
session secrets, bootstrap tokens, payment tokens, private keys and service-account keys are
secret values. They must not be entered in these files, Terraform variable files, GitHub files,
logs, commands, documentation or chat. Enter them through approved GCP Secret Manager procedures
only. Downloaded service-account keys are prohibited.

## Plan gate

Read-only GCP discovery and an official Terraform plan may begin only after all required
non-secret fields are completed and the local signature record contains the actual UTC signing
time. `terraform apply`, image publication, IAM/DNS changes and billable resource creation remain
blocked until the resulting plan and cost estimate receive explicit X1 approval.
