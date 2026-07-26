# Resident Job Extended Invoice and Travel Revenue Design

Status: READY FOR OWNER REVIEW

This document is design only. It creates no implementation, schema, migration, service, API, provider integration, tax calculation, payroll calculation, invoice engine, payment execution, worker payout execution, money-state authority, push, merge, deployment, or commit.

This design is parked behind:

```text
Contract gate
-> Canada employment-compliance / counsel gate
-> Invoice / employer-funding phases
-> Payment Execution phases
```

It must not be implemented until counsel confirms the GST/QST, worker-classification, employment-standards, and payment-provider implications.

## 1. Operating Principle

Resident Workforce OS will use two separate variable, configuration-driven schedules:

```text
Employer-billing schedule
!= Worker-payout schedule
```

Employer/client standard transport, outside-Montreal travel duration, mileage, and gas charges are platform revenue line items, not pass-through reimbursements.

Worker travel payment is a separate platform-set variable amount per worker and must not be assumed to equal employer standard transport, outside-Montreal travel duration, mileage, or gas charges.

## 2. Schedule A — Employer-Billing Schedule

The employer-billing schedule determines the employer/client invoice.

Future invoice candidate formula:

```text
worked hours at employer bill rate
+ standard +1hr employer transport charge, all jobs
+ outside-Montreal travel-duration charge, where applicable
+ employer mileage charge
+ employer gas charge
+ GST/QST on the full billable invoice, where counsel-approved and applicable
= employer invoice total
```

Timing:

```text
T+1 charge post-confirmation
```

Where:

- `T` is the combined worker sign-out plus employer confirmation event, not raw attendance and not unreviewed timesheet state.
- `T+1` means the employer/client charge is eligible the day after worker sign-out and employer confirmation, only when all upstream gates pass.

Employer-billing transport components are distinct:

| Component | Applies to | Meaning | Revenue treatment |
| --- | --- | --- | --- |
| Standard +1hr transport | All jobs | A configured one-hour transport charge added to every employer invoice. | Platform revenue |
| Outside-Montreal travel duration | Outside-Montreal jobs only, where configured | Actual travel time billed as a variable duration based on distance/travel evidence and approved configuration. | Platform revenue |
| Mileage | Jobs where mileage billing is configured | Distance-based charge under approved schedule. | Platform revenue |
| Gas | Jobs where gas billing is configured | Gas charge under approved schedule. | Platform revenue |

These components are not interchangeable. The standard +1hr transport component is not the outside-Montreal travel-duration component. Outside-Montreal travel duration is actual travel time billed under a separate variable, distance-sensitive schedule.

GST/QST treatment:

- counsel-approved GST/QST applies to the full billable employer invoice subtotal: worked hours, standard +1hr transport, outside-Montreal travel duration, mileage, and gas
- GST/QST is remitted tax, not platform margin
- GST/QST policy version must be frozen onto the invoice candidate

Money arithmetic:

- every amount is represented by the shared integer Money Engine
- amounts use integer `amountMinor` plus explicit currency
- no floating-point arithmetic is allowed
- mixed-currency arithmetic fails closed under C3
- GST/QST, subtotal, total, tax-remitted, provider-fee, worker-payout, and margin formulas must use Money Engine operations only

Employer-billing schedule is:

- admin-editable
- config-driven
- versioned
- effective-dated
- tenant or jurisdiction scoped where approved
- audit-gated
- never hardcoded

Employer-facing invoice may show:

- worked-hours line item
- standard +1hr transport line item
- outside-Montreal travel-duration line item where applicable
- mileage line item
- gas line item
- GST/QST line items on the full billable invoice where applicable
- invoice total
- frozen invoice version
- payment status based on real evidence

Employer-facing invoice must not show:

- worker pay rate
- worker travel amount
- worker payout calculation
- platform margin
- internal provider fees unless specifically approved for employer disclosure
- statutory deduction internals
- worker banking or tax data

## 3. Schedule B — Worker-Payout Schedule

The worker-payout schedule determines the worker-visible payout candidate.

Future worker payout candidate formula:

```text
worker hours at worker pay rate
+ platform-set variable travel amount for that worker
= worker gross payout candidate before any counsel-approved payroll or deduction treatment
```

Worker-payout schedule is:

- admin-editable
- config-driven
- versioned
- effective-dated
- worker, role, work group, region, or jurisdiction scoped only where approved
- audit-gated
- never hardcoded

Worker-visible payout may show:

- worked-hours basis
- worker pay rate where approved
- worker travel amount
- worker payout candidate or payout status where approved
- frozen worker terms version

Worker-visible payout must not show:

- employer bill rate
- employer standard +1hr transport charge
- employer outside-Montreal travel-duration charge
- employer mileage charge
- employer gas charge
- employer invoice total unless separately approved
- GST/QST collected from employer
- platform margin
- provider fees charged to platform or employer

## 4. Platform Margin Model

Platform margin is derived after invoice, tax, provider-fee, and worker-payout data are available and approved.

Design formula:

```text
platform margin
= (invoice total - remitted tax - provider fees) - worker payout
```

Important boundaries:

- `invoice total` comes from the frozen employer-billing schedule.
- `remitted tax` includes GST/QST or other counsel-approved taxes that the platform must remit and must not treat as revenue.
- `provider fees` are payment-provider costs, not worker compensation.
- `worker payout` comes from the worker-payout schedule and future payroll/payment gates.
- Margin is internal platform economics and must not leak to employer or worker surfaces.

This formula is design-only and does not authorize margin calculation implementation.

## 5. Tax and Counsel Flag

Counsel must specifically review the platform's intended treatment where:

- employer standard +1hr transport is platform revenue
- employer outside-Montreal travel duration is platform revenue
- employer mileage charge is platform revenue
- employer gas charge is platform revenue
- worker receives a different platform-set variable travel amount
- GST/QST may apply to the full employer-billed invoice, including worked hours, standard +1hr transport, outside-Montreal travel duration, mileage, and gas
- employee reimbursement rules may or may not apply to the worker-side travel amount
- contractor/self-employed treatment may differ from employee treatment
- provider fees may affect margin reporting but not employer-visible economics unless approved

Official reference points to verify include CRA GST/HST guidance for taxable supplies, CRA guidance on out-of-pocket expenses and reimbursements, and Revenu Quebec GST/QST taxable-supply guidance.

This document is not legal or tax advice.

## 6. Contract Invariant Mapping

### C1 — No Cross-Party Economics Leak

Employer sees:

- their invoice line items
- their invoice total
- payment status

Employer never sees:

- worker pay rate
- worker travel amount
- worker payout
- platform margin

Worker sees:

- their pay basis
- their variable travel amount
- their payout candidate/status where approved

Worker never sees:

- employer bill rate
- employer standard transport, outside-Montreal travel-duration, mileage, or gas revenue rates
- employer invoice economics
- platform margin

Provider-facing payloads must be minimum necessary and must not include unrelated worker personal information.

### C5 / C5b — Paid Status Requires Real Settlement Evidence

Employer invoice is not `paid` merely because:

- invoice was issued
- T+1 became eligible
- hosted checkout was created
- card authorization occurred without approved settlement semantics
- bank-transfer proof was uploaded
- manual support note was entered

`paid` requires real settlement evidence, and sandbox or test references must be rejected in production.

### C7 — Frozen Terms

Once an invoice is issued:

- employer-billing schedule version is frozen for that invoice
- worker-payout schedule version is frozen for the worker payout candidate
- later admin rate changes affect only future eligible invoices/payout candidates
- reversals, corrections, disputes, or partial payments must not rewrite historical invoice terms

### C8 — No Double Allocation

Future implementation must prevent:

- the same settlement reference from funding two invoices
- the same bank-transfer proof from reconciling two invoices
- the same worker payout candidate from being paid twice
- concurrent reconciliation from producing two winners

### Owner S4 Alias / Kit C9-S3 — Append-Only Audit

All schedule edits and money-relevant status changes must append audit evidence.

Audit-gated events include:

- employer bill-rate schedule edit
- employer standard +1hr transport schedule edit
- employer outside-Montreal travel-duration schedule edit
- employer mileage schedule edit
- employer gas schedule edit
- GST/QST policy version change
- worker pay-rate schedule edit
- worker travel-amount schedule edit
- invoice issue
- invoice payment status change
- provider-fee evidence capture
- settlement-reference reconciliation

No audit history may be updated or deleted to change prior evidence.

## 7. Admin-Editable Configuration Boundary

All rates must come from admin-managed configuration:

- employer bill rate
- employer standard +1hr transport charge
- employer outside-Montreal travel-duration charge
- employer mileage charge
- employer gas charge
- GST/QST policy version
- worker pay rate
- worker travel amount
- provider-fee treatment

Configuration requirements:

- versioned
- effective-dated
- auditable
- role-authorized
- jurisdiction-aware where applicable
- fail-closed if missing, expired, unsupported, or counsel-unapproved
- frozen onto downstream invoice or payout candidate at issue time
- Money Engine backed for all monetary amounts

No rate or tax value may be hardcoded in source code, tests, fixtures, or hidden constants except synthetic test fixtures clearly marked as non-production examples.

## 8. Sequencing

This design belongs after:

```text
Phase 4 — HR Money Adapter
Phase 5 — Idempotent source binding
Phase 6 — Employment classification gate
Phase 7 — Labour-rule validation
Phase 8 — Statutory deduction boundary
```

It begins conceptually in:

```text
Phase 9 — Timesheet-to-invoice readiness
Phase 10 — Employer funding obligation
Phase 11 — Margin split
Phase 12 — Worker pay obligation
```

It connects to Payment Execution only later:

```text
Phase 13 — Payment provider boundary
Phase 14 — Held-funds / settlement-reference boundary
Phase 15 — Worker payout execution, separate later flow
```

## 9. Required Red Probes For Later Implementation

Future implementation must start failing-first with probes proving:

- employer invoice cannot be generated from unlocked Timesheet
- employer invoice cannot be generated without employer-billing schedule version
- employer invoice cannot collapse standard +1hr transport and outside-Montreal travel duration into one component
- worker payout candidate cannot be generated without worker-payout schedule version
- missing GST/QST policy fails closed where required
- GST/QST subtotal cannot exclude worked hours, standard +1hr transport, outside-Montreal travel duration, mileage, or gas where counsel requires full billable invoice taxation
- floating-point money arithmetic is rejected
- counsel-unapproved travel/gas/mileage revenue treatment fails closed
- employer line item cannot reveal worker payout
- worker payload cannot reveal employer bill rate
- margin cannot appear in employer or worker payload
- schedule edits append audit evidence
- hardcoded rates are rejected by static or fixture scan
- later rate edits do not mutate frozen invoice terms
- settlement reference cannot be double allocated

## 10. Owner Decisions Required

Before implementation, owner must decide:

- whether employer transport-hour billing is enabled at launch
- whether outside-Montreal travel-duration billing is enabled at launch
- how outside-Montreal is defined and evidenced
- whether outside-Montreal travel duration uses actual time, distance bands, map estimates, manual entry, or provider evidence
- whether employer mileage billing is enabled at launch
- whether employer gas billing is enabled at launch
- whether GST/QST applies to the full billable invoice subtotal and how tax rounding is handled through the Money Engine
- whether worker travel amount is per shift, per hour, per distance band, per role, per worker, or manually configured
- who may edit employer-billing schedules
- who may edit worker-payout schedules
- whether employer schedules vary by organization, residence, region, work group, role, or contract
- whether worker schedules vary by worker, region, work group, role, or contract
- whether provider fees are internal only or partially employer-visible
- whether any travel amount is treated as reimbursement, taxable benefit, wages, contractor payment, or other category
- what audit and retention period applies to schedule edits

## 11. Final Recommendation

Approve this as a future invoice/payment design boundary only.

Do not implement until:

- contract conformance gates are satisfied
- Canada counsel confirms GST/QST and worker-classification treatment
- invoice/funding phases are reached
- payment-provider eligibility is confirmed
- owner approves the specific implementation item

## Final Status

EXTENDED INVOICE AND TRAVEL REVENUE DESIGN READY FOR OWNER REVIEW
