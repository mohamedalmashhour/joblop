# Provider Verification-Kit Completion Tracker

Status: **NO-GO — INDEPENDENT REVIEW AND LOCKED VERIFICATION KIT INCOMPLETE**

This document is the administrative gate for one future, bounded staging provider test. It does
not authorize IAM or SSO changes, Token Creator grants, credential minting, QA Reset, deployment,
Stripe or webhook operations, OTP requests, or any staging or production configuration change.

The authoritative pre-execution checklist is the Independent Review Readiness Package accepted on
2026-08-03. Execution remains prohibited until every mandatory row below is `VERIFIED` and a
separate, written authorization approves one bounded test window.

## Status and evidence rules

The only permitted item statuses are:

- `MISSING`
- `SUBMITTED — UNVERIFIED`
- `VERIFIED`
- `REJECTED`
- `EXPIRED`

Do not accept verbal approval, owner self-approval as independent review, screenshots without an
identifiable source and timestamp, inferred Stripe or IAM configuration, placeholder recipients,
or unverified release references. Never record secrets, OTPs, tokens, authorization headers, raw
payment data, personal data, or secret-bearing command output in this tracker.

Evidence must identify its authoritative source, reviewer, UTC capture time, immutable resource or
release reference, review scope, result, and expiry or next-review date. Store evidence only in the
approved redacted evidence location once that location is itself verified.

## Completion tracker

|   # | Required item                                                                             | Responsible owner                                      | Acceptable evidence                                                                                                                                                                                                         | Status    | Expiry/review date | Severity | Execution prohibited? |
| --: | ----------------------------------------------------------------------------------------- | ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ------------------ | -------- | --------------------- |
|   1 | Independent security reviewer identity, role, independence statement, and signed approval | Independent Security Reviewer                          | Signed, dated approval naming reviewer, employer/authority, independence from requester/operator, exact scope, findings, exceptions, and evidence references                                                                | `MISSING` | Not set            | Critical | Yes                   |
|   2 | Principal Access Boundary review                                                          | Independent Security Reviewer / Organization IAM Owner | Provider-sourced inventory and findings for every relevant PAB policy and binding, with project/organization identifiers, UTC timestamp, immutable evidence reference, and reviewer signature                               | `MISSING` | Not set            | Critical | Yes                   |
|   3 | Workforce Identity pools/providers and organization-policy review                         | Independent Security Reviewer / Organization IAM Owner | Provider-sourced inventory of relevant pools, providers, bindings, and organization policies with normalized findings, source identifiers, UTC timestamp, and reviewer signature                                            | `MISSING` | Not set            | Critical | Yes                   |
|   4 | IAM deny policies, IAM Conditions, and VPC Service Controls review                        | Independent Security Reviewer / Organization IAM Owner | Provider-sourced deny-policy, conditional-binding, Access Context Manager, and VPC-SC findings for the exact principal and resources, including explicit no-conflict conclusion                                             | `MISSING` | Not set            | Critical | Yes                   |
|   5 | Exact immutable release SHA                                                               | Release Owner                                          | Full Git SHA linked to reviewed source, signed build/provenance record, and confirmation that the SHA is the intended staging candidate                                                                                     | `MISSING` | Not set            | Critical | Yes                   |
|   6 | Exact Cloud Run service revisions                                                         | Staging Infrastructure Owner                           | Provider-sourced service names, regions, immutable revision names, image digests, readiness states, and UTC capture time for every target workload                                                                          | `MISSING` | Not set            | Critical | Yes                   |
|   7 | Approved Stripe test-account reference and test-mode inventory                            | Payment Integration Owner / Security Owner             | Redacted provider-console or API-derived inventory identifying the approved account by non-secret immutable reference; test-mode keys and objects independently classified; live mode explicitly excluded                   | `MISSING` | Not set            | Critical | Yes                   |
|   8 | Approved first and second synthetic payment scenarios                                     | Payment Integration Owner / Finance-Legal Owner        | Signed scenario specification naming payment method, synthetic actor, steps, expected provider/application states, negative assertions, reconciliation, cleanup, and selected second scenario                               | `MISSING` | Not set            | Critical | Yes                   |
|   9 | Approved test amounts and expected lifecycle states                                       | Payment Integration Owner / Reconciliation Owner       | Signed CAD amount table and state transition matrix covering authorization, capture/void/failure as applicable, application state, provider state, and prohibited settlement claims                                         | `MISSING` | Not set            | High     | Yes                   |
|  10 | Webhook endpoint and durable replay/idempotency design                                    | Payment Integration Owner / Security Owner             | Reviewed HTTPS staging endpoint, event allowlist, raw-body signature boundary, secret reference name, durable atomic replay store, idempotency scope/retention, timeout behavior, reconciliation, and redacted audit schema | `MISSING` | Not set            | Critical | Yes                   |
|  11 | Approved synthetic OTP recipient and provider configuration                               | OTP/Email Owner / Security Owner                       | Named synthetic mailbox or approved test phone destination proven unable to contact a real customer or worker; provider/environment boundary, retention, rate limit, expiry, replay, and log-redaction review               | `MISSING` | Not set            | Critical | Yes                   |
|  12 | Exact SSO change and restoration procedure                                                | Organization IAM Owner / Independent Security Reviewer | Written before/after configuration, exact scoped resources and commands, expected effect, maximum duration, semantic comparison method, guaranteed cleanup path, and reviewer approval                                      | `MISSING` | Not set            | Critical | Yes                   |
|  13 | Immutable deployment and rollback commands                                                | Release Owner / Staging Infrastructure Owner           | Reviewed commands pinned to full image digests/revisions, target project/region/services, preflight checks, health gates, drift check, rollback commands, and stop conditions                                               | `MISSING` | Not set            | Critical | Yes                   |
|  14 | Named security, payment, reconciliation, finance/legal, release, and OTP owners           | Program Owner                                          | Signed owner register with role, authority, scope, escalation route, and acknowledgement; independent reviewer identified separately                                                                                        | `MISSING` | Not set            | Critical | Yes                   |
|  15 | Approved bounded execution window                                                         | Release Owner / Independent Security Reviewer          | Separate signed authorization with UTC start/end, operator, exact actions, attempt limits, targets, release, evidence destination, stop conditions, and rollback authority                                                  | `MISSING` | Not set            | Critical | Yes                   |
|  16 | Evidence-retention and redaction location                                                 | Security/Privacy Owner                                 | Approved access-controlled location, retention/deletion period, permitted fields, redaction policy, access list, auditability, and incident handling; no secret values in the approval                                      | `MISSING` | Not set            | High     | Yes                   |

Changing a row requires a traceable evidence reference and named verifier. `SUBMITTED — UNVERIFIED`
does not reduce the gate. An expired or rejected item returns the overall decision to `NO-GO` even
if every other row is verified.

## Candidate second Stripe scenarios — selection required

These are non-executing candidates only. The Payment Integration, Security, Reconciliation, and
Finance/Legal owners must select and approve exactly one scenario in writing.

### Candidate A — card authorization failure and fail-closed reconciliation

Use an official Stripe test payment method that produces the owner-approved deterministic failure.
Assert that no paid, captured, or settled application state is recorded; retrieve the provider
object for reconciliation; verify safe user-facing failure, redacted audit output, and idempotent
retry behavior. Cleanup must leave no capturable authorization.

### Candidate B — duplicate/idempotent card request

Submit the same approved synthetic card authorization twice with the same application and Stripe
idempotency identity. Assert exactly one provider PaymentIntent, one logical application attempt,
and a deterministic replay result. Reconcile by immutable provider reference and cancel the
uncaptured authorization if the approved scenario creates one.

### Candidate C — approved Canadian ACSS test flow

Exercise only Stripe test-mode ACSS with approved synthetic banking fixtures. This candidate is
ineligible unless legal and security separately approve the mandate language, verification flow,
delayed state transitions, refund/dispute handling, retention, reconciliation, and customer
communications. It must not be inferred from general Stripe approval.

**Recommendation:** Candidate B provides the strongest immediate evidence for replay and financial
duplication controls while remaining deterministic and reversible. Candidate A is also bounded but
tests a narrower failure path. Candidate C has materially greater legal, timing, and operational
complexity. No candidate is selected by this document.

## Approval-evidence template

```text
Evidence ID:
Tracker item number(s):
Authoritative source/provider:
Source account/project/organization (non-secret reference):
Immutable resource/release reference:
Captured at (UTC):
Captured by (name and role):
Reviewed by (name, role, and independence relationship):
Review scope:
Method used:
Redacted findings:
Exceptions or unresolved findings:
Decision: ACCEPT / REJECT
Effective date (UTC):
Expiry or mandatory review date (UTC):
Approved evidence-location reference:
Signature/reference:
Attestation: No secrets, tokens, OTPs, raw payment data, or personal data are attached.
```

## Independent-review sign-off template

```text
Review ID:
Reviewer name:
Reviewer role and authority:
Organization/employer:
Independence statement:
  I am independent of the requester and test operator and have no conflicting approval role.
Environment: resident-workforce-os-staging
Exact principal reviewed:
Exact target service account reviewed:
Exact audience reviewed:
Exact proposed temporary role and resource scope:
PAB evidence IDs:
Workforce Identity and organization-policy evidence IDs:
IAM deny / IAM Conditions / VPC-SC evidence IDs:
Stripe test/live separation evidence IDs:
OTP synthetic-destination evidence ID:
Findings:
Unresolved exceptions:
Decision: APPROVED FOR BOUNDED AUTHORIZATION / REJECTED
Effective date (UTC):
Expiry (UTC):
Signature/reference:
Attestation: This sign-off is not itself permission to execute; a separate bounded-window
authorization is required.
```

## Bounded test-window authorization template

```text
Authorization ID:
Authorizing Release Owner:
Independent Security Reviewer acknowledgement:
Named operator:
UTC start:
UTC end:
Maximum attempts:
Environment: resident-workforce-os-staging only
Full release SHA:
Cloud Run services and immutable revisions/image digests:
Approved principal, target service account, role, and audience:
Approved SSO before/after state and restoration procedure ID:
Approved Stripe test-account reference:
Selected payment scenarios and amounts:
Approved webhook endpoint/replay-design evidence ID:
Approved synthetic OTP destination evidence ID:
Permitted actions, in exact order:
Explicitly prohibited actions:
Pass criteria:
Immediate stop conditions:
Rollback command package ID:
Evidence destination and redaction policy ID:
Incident/escalation owners:
Signatures and UTC timestamps:
Attestation: Authorization expires automatically at the stated end time and permits no production,
live-payment, real-recipient, or unlisted action.
```

## Final preflight checklist

- [ ] Every tracker row is `VERIFIED`, unexpired, and linked to acceptable evidence.
- [ ] Independent reviewer identity, independence, authority, and signature are verified.
- [ ] PAB, Workforce Identity, organization-policy, IAM deny, IAM Conditions, and VPC-SC reviews are complete.
- [ ] Active account, staging project, region, release SHA, service revision, and image digest exactly match authorization.
- [ ] No production domain, database, service, identity, secret, recipient, or Stripe account is in scope.
- [ ] User-managed key count is zero before execution.
- [ ] Temporary IAM is scoped to the individual approved service account.
- [ ] Token audience, subject, one-request limit, memory-only handling, and maximum lifetime are fixed.
- [ ] Stripe account and every planned object are independently proven test mode.
- [ ] Both payment scenarios, CAD amounts, lifecycle states, reconciliation, and cleanup are approved.
- [ ] Webhook signature verification, durable replay storage, idempotency, and redacted audit events are approved.
- [ ] Synthetic OTP destination cannot contact a real customer or worker.
- [ ] SSO restoration and immutable deployment rollback commands were dry-reviewed, not executed.
- [ ] Evidence destination is access-controlled and excludes secrets, tokens, OTPs, and raw payment data.
- [ ] A separate bounded-window authorization is signed and currently effective.
- [ ] Operator understands that any mismatch, unexpected allow/deny, provider mode, state, recipient, log, or cleanup result requires immediate stop.

Even after this checklist becomes complete, no test starts automatically. A human operator must
validate the still-current evidence and invoke only the separately authorized bounded procedure.
