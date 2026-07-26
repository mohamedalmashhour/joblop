# Resident Job Payment Execution Design

Status: READY FOR OWNER REVIEW

This document is design only. It creates no implementation, schema, migration, service, API, provider integration, money-state authority, payment execution, payout execution, push, merge, deployment, or commit.

Current sequencing:

```text
Phase 13 — Payment provider boundary
Phase 14 — Held-funds / settlement-reference boundary
Phase 15 — Worker payout execution, separate later flow
```

Payment Execution remains the last build phase and is blocked behind the contract gate, Canada employment-compliance/counsel gate, and payment-provider eligibility gate.

## 1. Operating Principle

Payment Execution records and verifies real employer/client funding events for staffing invoices only after invoice terms are frozen and the upstream money/compliance layers have approved the funding obligation.

Payment Execution does not calculate invoices, payroll, worker payables, tax, statutory deductions, platform margin, or worker payout amounts.

Canonical upstream order:

```text
Locked Timesheet
-> HR Money Adapter
-> Employment Compliance
-> Frozen Invoice / Employer Funding Obligation
-> Payment Execution
-> Separate Worker Payout Flow
```

## 2. Scope

Payment Execution may own, in a future implementation phase:

- employer/client payment initiation boundary
- hosted card checkout handoff
- bank-transfer instruction handoff
- provider or bank settlement-reference capture
- settlement-reference reconciliation
- payment status truthfulness
- payment attempt audit trail
- duplicate-payment prevention
- sandbox-reference rejection in production
- payment evidence visibility by role

Payment Execution must not own:

- invoice calculation
- invoice term mutation
- payroll calculation
- worker payable calculation
- worker payout execution
- tax filing or remittance
- statutory deductions
- accounting ledger
- provider credential storage in application records
- raw card data collection
- legal escrow claims unless counsel and provider approve them

## 3. Supported Employer Funding Rails

### 3.1 Hosted Card Payment

Employer/client funds a staffing invoice by being redirected to, or embedded through, a hosted provider payment page.

Design requirements:

- The client enters MasterCard/card details only on the provider-controlled hosted page.
- Resident Workforce OS never collects, logs, stores, transmits, or renders raw card numbers, CVV, magnetic-stripe data, or equivalent sensitive card data.
- The platform stores only provider-issued references that are safe to persist, such as payment intent reference, checkout session reference, settlement reference, provider event reference, status, timestamps, and reconciliation metadata.
- Provider webhooks or callbacks are treated as untrusted until signature/provider authenticity, environment, invoice reference, amount/currency, and idempotency are verified.
- Sandbox or test provider references must be rejected in production.
- A card payment is not `paid`, `settled`, or `funded` until a real provider settlement reference or provider-confirmed settlement evidence exists.

PCI note:

This design is intended to minimize card-data handling by using hosted provider collection. PCI eligibility, SAQ category, provider configuration, webhook handling, and operational controls require provider/security review before production.

### 3.2 Bank Transfer With Reconciliation

Employer/client funds a staffing invoice through a client-initiated bank transfer.

Design requirements:

- The platform may present payment instructions after invoice/funding obligation approval.
- The client initiates the transfer outside the platform's raw bank-credential collection path.
- The platform records only reconciliation-safe references and evidence.
- The platform may support a Sham-Cash-style proof pattern: client submits or references payment proof, support/finance reviews it, and the system records a reconciled settlement reference only after real bank/provider evidence confirms receipt.
- Proof of transfer is not settlement by itself.
- Uploaded or entered proof is `received` or `under_review` until reconciled against a real settlement reference.
- A bank transfer is not `paid`, `settled`, or `funded` until real settlement evidence is reconciled.
- Failed, duplicate, partial, returned, reversed, or unmatched transfers remain truthful and must not mutate the frozen invoice.

## 4. Worker Payout Separation

Worker payout is a separate future flow.

Employer funding does not automatically create worker payout execution.

Required separation:

```text
Employer payment received
!= worker payable calculated
!= worker payout approved
!= worker payout sent
!= worker payout settled
```

Worker payout may only begin after the future worker-payable and payout phases are approved. This design does not define worker payout schemas, provider calls, payout ledgers, banking data collection, or pay-statement rules.

## 5. Payment Status Truthfulness

Future status language should remain evidence-based:

| Status concept | Meaning |
| --- | --- |
| `payment_not_started` | No employer funding attempt exists. |
| `payment_initiated` | Hosted checkout or bank-transfer instruction was created, but no settlement evidence exists. |
| `proof_received` | Client submitted proof or a provider/bank event was received, but reconciliation is incomplete. |
| `reconciliation_pending` | Finance/support is matching proof or provider/bank event to the frozen invoice obligation. |
| `settlement_reference_recorded` | A real settlement reference has been verified and recorded. |
| `paid` | Only allowed after real settlement evidence satisfies the C5/C5b checks. |
| `partial` | Settlement evidence is less than the frozen invoice obligation. |
| `failed` | Provider or bank evidence confirms failure. |
| `returned` | Funds were returned after settlement. |
| `reversed` | A later reversal exists; original evidence remains immutable. |
| `disputed` | Funding is disputed; original evidence remains immutable. |

No status may imply legal escrow, provider-held balance, or worker payout unless those separate gates are approved and corresponding evidence exists.

## 6. Gates

### 6.1 Contract Gate

Payment Execution cannot begin until:

- the contract kit version intended for payment execution is present
- HR fixtures are bound to the actual invariant IDs
- conformance and applicable S1-S7 checks run green
- C5/C5b settlement-reference tests are executable
- C7 frozen-terms tests are executable
- C8 no-double-allocation tests are executable
- no-economics-leak tests cover employer, worker, and internal payload boundaries
- owner approves the first Payment Execution implementation item

### 6.2 Canada Employment-Compliance / Counsel Gate

Payment Execution cannot begin until counsel or qualified advisors confirm:

- employment classification boundary
- employer funding timing
- worker payout timing dependencies
- wage payment timing rules
- payroll withholding boundary
- pay-statement implications
- Quebec and other provincial requirements where applicable
- held-funds versus escrow language
- bank-transfer proof/reconciliation process
- whether provider-held funds can be described in client-facing terms

Engineering review cannot satisfy this gate.

### 6.3 Payment-Provider Eligibility Gate

Payment Execution cannot begin until a provider review confirms:

- hosted card payment availability for the target business model
- MasterCard/card acceptance rules
- supported countries/currencies
- settlement-reference fields and event semantics
- webhook signature verification
- sandbox versus production reference format
- idempotency support
- refund, reversal, dispute, and returned-payment semantics
- PCI scope expectations for hosted collection
- provider terms permit the intended staffing invoice flow

### 6.4 Bank-Transfer Eligibility Gate

Bank transfer cannot begin until operations/finance confirm:

- accepted bank-transfer rails
- required reconciliation evidence
- matching rules for invoice reference, amount, currency, payer, and date
- partial/overpayment/duplicate treatment
- manual review responsibilities
- retention and audit requirements
- privacy limits for proof uploads or bank evidence

## 7. Contract Invariant Mapping

### 7.1 C5 — No Paid Without Real Settlement Reference

Hosted card:

- checkout/session creation does not mark invoice paid
- authorization alone does not mark invoice paid unless provider semantics explicitly qualify and owner approves
- payment intent or provider event alone is not enough if it lacks settlement evidence
- `paid` requires a real provider settlement reference or approved settlement evidence

Bank transfer:

- client proof does not mark invoice paid
- bank-transfer instruction does not mark invoice paid
- manual note does not mark invoice paid
- `paid` requires real reconciled settlement evidence

Red probes required later:

- attempt to mark paid with no settlement reference
- attempt to mark paid with proof-only bank transfer
- attempt to mark paid with unmatched payment reference
- attempt to mark paid with partial amount

### 7.2 C5b — Sandbox Rejected in Production

Hosted card:

- sandbox checkout, sandbox payment intent, sandbox settlement, and test event references must fail in production.

Bank transfer:

- test proof, training references, and non-production reconciliation markers must fail in production.

Red probes required later:

- sandbox provider reference in production rejects
- real provider reference in production accepts
- sandbox reference outside production remains allowed only for test environments

### 7.3 C7 — Frozen Invoice Terms

Payment Execution must never mutate a frozen invoice or the terms that produced it.

Required behavior:

- provider fees, partial payments, reversals, or disputes create payment evidence or adjustment/correction records later; they do not rewrite the invoice terms
- changes to employer rates, platform margin, or policy versions after invoice issue do not restate the issued invoice
- client-facing receipts reference the frozen invoice version

Red probes required later:

- change live employer terms after invoice issue and verify the payment view still references frozen terms
- process a returned payment and verify the original invoice remains unchanged

### 7.4 C8 — No Double Allocation

Payment Execution must prevent the same settlement evidence from funding multiple invoice obligations.

Required behavior:

- one provider settlement reference can reconcile to only one payment allocation unless a later approved split/allocation model exists
- one bank transfer reference cannot be attached to multiple invoices
- duplicate webhook/event delivery is idempotent
- concurrent reconciliation attempts resolve to one winner

Red probes required later:

- two concurrent claims on the same settlement reference
- duplicate webhook delivery
- same bank transfer proof applied to two invoices

### 7.5 Owner S4 Alias — Append-Only Audit

Naming note:

The current contract kit labels append-only audit as C9 and security helper S3. The owner instruction refers to S4 as append-only audit. This document preserves the owner S4 alias while noting the current kit naming to avoid silent relabeling.

Required behavior:

- payment initiation appends audit evidence
- provider callback receipt appends audit evidence
- reconciliation decision appends audit evidence
- status transition appends audit evidence
- reversal, returned payment, or dispute appends audit evidence
- no payment audit row is updated or deleted to change history

Red probes required later:

- attempted audit mutation path fails static scan
- status correction creates a new audit event instead of overwriting prior evidence

### 7.6 C1 — No Cross-Party Economics Leak

Worker-visible surfaces must not expose:

- employer bill rate
- platform margin
- provider fees
- employer funding reference details
- internal finance formulas

Employer-visible surfaces must not expose:

- worker bank details
- worker net payout mechanics
- statutory deduction internals not intended for employer display
- internal worker-payable calculations beyond approved invoice/work summary

Provider-facing payloads must be minimum necessary and must not include unrelated worker personal information.

Red probes required later:

- worker payload containing employer bill rate fails
- employer payload containing worker payout internals fails
- provider payload containing unrelated worker PII fails

## 8. Rail-Specific Data Boundary

### 8.1 Hosted Card Rail

Allowed future stored references:

- provider name
- provider environment
- hosted checkout/session reference
- provider payment/reference id
- provider event id
- settlement reference
- status
- amount/currency from frozen invoice obligation
- timestamps
- audit actor or system actor

Prohibited:

- raw card number
- CVV
- card magnetic stripe or equivalent sensitive authentication data
- provider secret keys in records or logs
- unmasked payment credentials

### 8.2 Bank Transfer Rail

Allowed future stored references:

- invoice reference
- payer reference
- bank transfer reference where safe
- uploaded proof reference where safe
- reconciliation reviewer
- reconciliation decision
- settlement reference
- status
- timestamps

Prohibited:

- unrelated bank-account details
- unredacted client bank credentials
- worker banking data
- treating proof as settlement
- replacing provider/bank evidence with manual assertion

## 9. Sequencing

This design sequences after:

```text
Phase 2 — Contract conformance import
Phase 3 — Shared Money Engine adoption
Phase 3A — CAD helper retirement
Phase 4 — HR Money Adapter
Phase 5 — Idempotent source binding
Phase 6 — Employment classification gate
Phase 7 — Labour-rule validation
Phase 8 — Statutory deduction boundary
Phase 9 — Timesheet-to-invoice readiness
Phase 10 — Employer funding obligation
Phase 11 — Margin split
Phase 12 — Worker pay obligation
```

It is implemented only in:

```text
Phase 13 — Payment provider boundary
Phase 14 — Held-funds / settlement-reference boundary
Phase 15 — Worker payout execution, separate later flow
```

Worker payout is not implemented in Phases 13 or 14. Phase 15 remains separately reviewed.

## 10. Test-First Requirements For Later Implementation

Every Payment Execution implementation item must begin with failing tests for:

- no `paid` without settlement reference
- sandbox reference rejected in production
- frozen invoice terms preserved after payment events
- no double allocation of settlement reference
- append-only audit
- no cross-party economics leak
- no raw card data storage
- provider callback authenticity required
- duplicate webhook idempotency
- bank proof not treated as settlement
- partial payment remains partial
- reversal does not mutate original invoice evidence

## 11. Owner Decisions Required

Before implementation, owner must decide:

- approved hosted card provider
- whether MasterCard/card rail is available in the target jurisdictions
- whether bank transfer is manual reconciliation, provider-assisted reconciliation, or both
- what evidence qualifies as real settlement reference
- who can reconcile bank-transfer proof
- whether any provider-held funds may be described as held funds
- whether legal escrow terminology is prohibited or approved
- whether employer payment must settle before worker payout may begin
- whether partial payments are allowed
- whether overpayments create credit, refund, or manual review
- provider webhook retry and idempotency policy
- payment evidence retention period

## 12. Final Recommendation

Approve this design as a future Payment Execution architecture boundary only.

Do not implement Payment Execution until:

- upstream Phases 4-12 are complete and approved
- contract conformance gate is green for payment invariants
- Canada employment-compliance/counsel gate is cleared
- payment-provider eligibility gate is cleared
- owner approves the first implementation item

## Final Status

PAYMENT EXECUTION DESIGN READY FOR OWNER REVIEW
