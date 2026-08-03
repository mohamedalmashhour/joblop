# Proposed staging credential test — not authorized for execution

Status: **DRAFT / NO-GO**

This runbook describes one future, narrowly scoped credential validation. It is deliberately
non-executable until an independent organization-security review and separate written owner
authorization are recorded.

## Required external evidence

Before any IAM grant or credential request:

1. Independently inspect every organization Principal Access Boundary policy and binding.
2. Independently inspect relevant Workforce Identity pools, providers and organization policies.
3. Confirm in writing that no organization-level restriction alters or blocks the intended keyless
   impersonation path.
4. Approve exactly one staging credential test bound to the principal, service account, audience,
   role, duration and release under test.

If any review is incomplete, the test remains **NO-GO**.

## Fixed test identity contract

| Field                         | Required value                                                               |
| ----------------------------- | ---------------------------------------------------------------------------- |
| Environment                   | Staging only: `resident-workforce-os-staging`                                |
| Human principal               | `user:info@sybnb.app`                                                        |
| Target service account        | `sa-rwos-stg-employer@resident-workforce-os-staging.iam.gserviceaccount.com` |
| Token type                    | One short-lived OIDC identity token; never an exported OAuth access token    |
| Audience                      | `https://rwos-stg-qa-reset-7gmjfugnma-pd.a.run.app`                          |
| Expected token subject/caller | The exact target Employer staging service-account identity                   |
| Credential persistence        | None; no key file, token file, shell history value or logged token           |
| Attempts                      | One; no retry after an unexpected authorization result                       |

The Google-issued service-account OIDC identity token has a provider-controlled lifetime; the
approved test must accept at most one token whose observed `exp - iat` is no greater than 3,600
seconds. The test must not request a second token to shorten or refresh that lifetime. If the
provider returns a longer lifetime, stop immediately and treat the test as failed. Token contents
may be checked only through non-secret metadata (issuer, audience, subject and expiry); the encoded
token must never be printed or retained.

## Minimum IAM boundary

The final approved role must be granted on the individual target service account only. The proposed
minimum is the narrowest Google-defined role that supports the independently reviewed minting path.
If direct OIDC minting can operate with `roles/iam.serviceAccountOpenIdTokenCreator`, use that role.
If the selected Google tooling demonstrably requires `iam.serviceAccounts.getAccessToken`, stop and
obtain explicit approval before using service-account-scoped `roles/iam.serviceAccountTokenCreator`.

Never grant either role at project, folder or organization scope. Never change permissions held by
the target service account.

## Pre-test evidence

Capture without secret values:

- Active authenticated account and active project.
- Exact release SHA and ready Cloud Run revision.
- Service-account IAM policy, etag and normalized semantic form.
- Project and organization IAM policy etags and relevant normalized bindings.
- Existing PAB, Workforce and VPC Service Controls review receipts.
- User-managed service-account key count (must equal zero).
- Enabled state of IAM Credentials API.
- Current `iam.googleapis.com` audit configuration.
- Cloud Run audience and QA Reset trusted-caller configuration.

Stop if any input differs from the separately approved values.

## Proposed single test sequence

1. Acquire a local cleanup guard that records only non-sensitive timestamps and policy checksums.
2. Add the approved temporary role to the individual target service account.
3. Wait once for the approved propagation interval; do not probe by repeatedly minting credentials.
4. Run Policy Troubleshooter while the binding exists. Continue only if the exact principal,
   permission and service-account resource are `ALLOWED` with no unexplained deny result.
5. Request one short-lived OIDC identity token with the exact audience. Do not display or save it.
6. Validate only credential acceptance and exact caller/audience binding.
7. Do not invoke QA Reset during credential validation. QA Reset requires a later, separately
   approved mutation step after credential validation passes.
8. Remove the temporary role immediately, including on every failure path.
9. Verify the post-test IAM policy is semantically identical to the pre-test policy.
10. Verify the remote audit record, key count and absence of retained credentials.

## Audit-log queries

The approved operator may query Cloud Audit Logs for the bounded UTC test window using:

- Service names `iam.googleapis.com` and `iamcredentials.googleapis.com` only.
- The exact principal email and target service-account resource.
- Methods corresponding to the temporary IAM-policy update, Policy Troubleshooter evaluation and
  the single identity-token request.

Evidence must record method, authorization result, principal, resource and timestamp only. Raw
tokens, request authorization headers and credential payloads must never enter evidence.

## Cleanup and rollback

Cleanup is a finally-style requirement:

1. Remove the temporary service-account binding.
2. Re-read the service-account policy and compare its normalized bindings and conditions with the
   pre-test snapshot.
3. Confirm project and organization IAM were not modified.
4. Confirm user-managed key count remains zero.
5. Confirm no local credential artifact or environment value remains.
6. Record grant/removal times and the semantic-restore result.

If cleanup cannot be verified, declare a security incident, stop all testing and escalate to the
named staging Security Owner. Do not attempt compensating permission changes.

## Pass/fail criteria

PASS requires all of the following:

- Independent external review evidence is complete.
- Policy Troubleshooter reports `ALLOWED` for the exact approved tuple.
- Exactly one OIDC token request succeeds with exact audience, subject and bounded expiry.
- No persistent credential is created or logged.
- No retry occurs.
- Temporary IAM is removed and the pre-test semantic state is restored.
- Audit evidence contains the expected bounded events and no unexplained denial.

Any missing condition is FAIL. An unexpected allow, denial, identity, audience, expiry, policy
change, audit event or cleanup result requires an immediate stop. It must not trigger broader IAM,
a second token request or QA Reset.
