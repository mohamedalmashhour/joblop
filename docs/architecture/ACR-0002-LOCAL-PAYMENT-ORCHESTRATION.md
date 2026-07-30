# ACR-0002 — Local Payment Orchestration

Status: **APPROVED FOR LOCAL FAKE-PROVIDER IMPLEMENTATION**

Decision date: 2026-07-30

Base checkpoint: `c378f5496768d40f71c742717e2ab9a634e61dc7`

## Context

Frozen architecture correctly separated invoice issuance from payment execution and prohibited
live payment providers. Product-owner authorization now permits a provider-neutral, local-only
payment orchestration milestone. This record does not authorize a merchant account, external
provider, real payment method, charge, receipt, deployment or production activation.

## Decision

The local platform may model setup authorization, provider-token references, authorization,
capture, void, refund, webhook processing, reconciliation and recovery through a deterministic
fake provider. Invoice issuance and collection remain separate auditable operations.

Supported versioned policies are:

- `invoice_only`;
- `authorize_before_assignment_capture_after_invoice`;
- `collect_after_invoice`;
- `manual_collection`.

Supported payment states are `pending`, `authorized`, `processing`, `succeeded`, `failed`,
`cancelled`, `partially_refunded`, `refunded`, and `disputed`.

Only provider references and opaque token aliases may be stored. Raw primary account numbers,
expiry dates, security codes, bank credentials, provider secrets and complete provider payloads
are prohibited.

## Safety and accounting boundaries

- Authorization is not collection, settlement or a guarantee of later capture.
- Invoice issuance never invokes a payment provider implicitly.
- Payment success does not prove worker payout and cannot classify a worker.
- Partial payments and refunds are append-only allocations; issued invoice snapshots are not
  rewritten.
- Unknown outcomes remain unresolved until signed provider evidence or governed manual review.
- Production fails closed without an approved provider, merchant identity, effective payment
  policy and required authorization.
- Simulated webhooks require an HMAC signature, bounded timestamp and unique event identifier.

## External decisions

Before external integration, owners must approve the legal merchant, provider and account,
contract-specific authorization timing and amounts, capture timing, partial-payment behavior,
refund/void authority, dispute ownership, retries, fees, settlement/reconciliation source,
receipt requirements, retention, webhook keys/rotation and PCI responsibilities.

## Intended provider and Québec fee decision

Mastercard through Stripe is the intended primary/default method. Canadian ACSS debit is the
secondary alternative. Until an authorized Stripe test account and secret-injection path exist,
both are represented by synthetic method references through the local fake provider.

Employers may pay a disclosed, effective-dated marketplace service fee defined by their contract.
That fee is calculated independently of payment method and never from Stripe's actual transaction
cost. For Québec, card-, Mastercard-, Stripe-, processing- and convenience-surcharge calculation
is disabled. Stripe processing cost remains an internal platform expense unless documented legal
and processor approvals establish a permitted alternative. Any future jurisdictional surcharge
must default off and fail closed without both approvals.

## Superseded boundary

The blanket exclusion of payment implementation is superseded only for this deterministic local
foundation. Live/sandbox providers, real credentials, real cards, real receipts, worker payouts,
tax filing, external staging and production remain excluded.
