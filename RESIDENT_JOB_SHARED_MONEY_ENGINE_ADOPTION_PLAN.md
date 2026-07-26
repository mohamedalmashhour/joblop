# Resident Job Shared Money Engine Adoption Plan

Status: READY FOR OWNER REVIEW

This report prepares Resident Workforce OS to consume a future shared Money Engine contract from the SYBNB platform.

This phase is architecture, planning, and repository assessment only.

It authorizes no Payroll implementation, Finance implementation, payment provider work, banking integration, escrow implementation, schema change, migration, API, service, repository coupling, shared-code extraction, copy/paste transfer, push, merge, or deployment.

## 1. Current Repository Status

Current branch:

```text
foundation/repository-foundation
```

Current HEAD at report creation:

```text
7db6629
```

Current HEAD commit:

```text
docs(resident-job): define payroll engine architecture
```

Implemented engines:

- Database Foundation
- Authentication Foundation
- Authorization Foundation
- Organization Membership Foundation
- Employer Organization Foundation
- Residence Foundation
- Department Foundation
- Work Groups Foundation
- Role Definitions Foundation
- Job Request Foundation
- Dispatch Foundation
- Worker Offer Foundation
- Assignment Foundation
- Attendance Foundation
- Timesheet Foundation

Frozen engines and baselines:

- Platform Core v1.0 baseline
- Worker Offer Engine baseline
- Assignment Engine baseline
- Attendance Engine baseline
- Timesheet Engine baseline
- Execution Layer baseline from Job Request through Timesheet

Pending engines:

- Payroll
- Finance
- Invoicing
- Employer Payments
- Worker Payments
- Payment Execution
- Banking provider integration
- Reconciliation
- Tax/remittance execution
- Analytics
- AI execution

Repository condition:

- Timesheet implementation is complete and accepted.
- Payroll architecture is documented and ready for owner review.
- Payroll implementation has not started.
- Finance implementation has not started.
- No shared Money Engine package exists in this repository.
- No SYBNB payment code has been copied into this repository.

## 2. Current Execution Chain

Frozen operational chain:

```text
Job Request
-> Dispatch
-> Worker Offer
-> Assignment
-> Attendance
-> Timesheet
```

The current chain ends at an approved and locked Timesheet.

Timesheet owns governed work-time calculation and review. It separates:

- raw elapsed minutes
- payable minutes
- billable minutes
- excluded minutes
- break minutes
- premium candidate minutes
- overtime candidate minutes
- rounding adjustment minutes

Timesheet does not own:

- gross pay
- net pay
- statutory deductions
- employer invoice amount
- platform margin
- worker payment
- employer collection
- accounting entries
- remittances
- payment execution

The financial chain must begin only after a Timesheet is approved and locked.

## 3. Current Financial Architecture Status

Financial implementation status:

```text
Payroll: NOT STARTED
Finance: NOT STARTED
Invoicing: NOT STARTED
Payment Execution: NOT STARTED
Banking: NOT STARTED
Escrow/Held Funds: NOT STARTED
```

Financial architecture status:

- Payroll architecture is documented as a future engine.
- Payroll is defined as the governed worker-compensation engine that consumes approved and locked Timesheets.
- Payroll is separate from Payment Execution.
- Worker Pay is separate from Employer Billing.
- Gross Pay is separate from Net Pay.
- Worker payment is separate from employer funding.
- Employer invoice and platform revenue remain future Finance concerns.

Current approved Payroll architecture flow:

```text
Approved and Locked Timesheet
-> Payroll Eligibility
-> Gross Pay Calculation
-> Earnings Classification
-> Deduction Boundary
-> Net Pay Boundary
-> Payroll Review
-> Payroll Approval
-> Payable Obligation
-> Payment Execution Boundary
```

Confirmed HR money model for future adoption:

```text
Employer Funding
-> Held Funds (future)
-> Assignment
-> Attendance
-> Approved Timesheet
-> Payroll
-> Worker Gross Pay
-> Statutory Deduction Boundary
-> Worker Net Pay
-> Worker Payment
```

This model is recurring per pay period and must remain separate from STR reservation settlement.

## 4. Existing Resident Workforce OS Readiness

Resident Workforce OS already has the upstream records needed to eventually consume a shared Money Engine contract:

| Existing capability          | Current status | Money Engine relevance                                         |
| ---------------------------- | -------------- | -------------------------------------------------------------- |
| Tenant organization          | Implemented    | identifies employer context                                    |
| Residence                    | Implemented    | identifies work location within the residence vertical         |
| Department                   | Implemented    | supports staffing context and future cost attribution boundary |
| WorkGroup                    | Implemented    | groups labor categories                                        |
| RoleDefinition               | Implemented    | identifies operational role                                    |
| JobRequest                   | Implemented    | captures staffing demand and commercial request context        |
| DispatchReview               | Implemented    | records platform dispatch review boundary                      |
| WorkerOffer                  | Implemented    | preserves worker-visible offer terms and response              |
| Assignment                   | Implemented    | records authoritative operational commitment                   |
| AttendanceRecord             | Implemented    | records presence evidence                                      |
| Timesheet                    | Implemented    | records approved and locked work-time input                    |
| TimesheetCalculationSnapshot | Implemented    | preserves calculation input versions and time values           |
| AuditEvent                   | Implemented    | supports audit continuity                                      |

These records can provide future Money Engine adapter inputs once Payroll and Finance are authorized.

## 5. What Does Not Exist Yet

Resident Workforce OS does not yet have:

- PayrollRecord
- PayrollCalculationSnapshot
- WorkerPayObligation
- EmployerFundingObligation
- PlatformRevenueEntitlement
- WorkerClassificationRecord
- JurisdictionEmploymentProfile
- WorkerCompensationTerms beyond current offer/assignment term snapshots
- statutory deduction provider boundary
- employer contribution boundary
- pay statement boundary
- finance or invoice engine
- payment execution engine
- settlement/reversal references
- reconciliation engine
- shared Money Engine contract
- shared conformance suite
- shared security suite
- SYBNB canonical invariant specification
- counsel-approved jurisdiction activation flow

These absences are expected. They are not defects in the current execution layer.

## 6. Payroll Readiness Assessment

Payroll readiness status:

```text
PARTIALLY READY
```

Ready inputs:

- approved and locked Timesheet
- Assignment reference
- Attendance reference
- JobRequest reference
- WorkerIdentity reference
- EmployerOrganization reference
- Residence and Department references
- WorkGroup and RoleDefinition references
- payable and billable minute separation
- Country Pack version reference
- calculation snapshot versioning
- audit foundation
- authorization foundation

Missing before Payroll implementation:

- owner approval of Payroll implementation after Money Engine adoption planning
- canonical shared Money Engine contract from SYBNB
- staffing-specific adapter contract
- employment compliance boundary approval
- jurisdiction profile model
- worker classification source
- compensation terms source and versioning decision
- statutory deduction boundary
- payroll policy versioning
- conformance suite fixtures
- security suite fixtures

Payroll should not begin until the owner confirms whether Payroll Phase 01 should:

- implement local interfaces first, or
- wait for the canonical shared Money Engine contract.

Recommended answer:

Wait for the canonical shared contract and conformance suite before implementing Payroll money calculations.

## 7. Future Finance Readiness Assessment

Finance readiness status:

```text
NOT READY FOR IMPLEMENTATION
```

Current upstream support:

- locked Timesheets preserve billable minutes separately from payable minutes
- JobRequest and Assignment preserve employer context
- EmployerOrganization exists
- audit and tenant boundaries exist

Missing before Finance implementation:

- employer commercial terms model
- employer funding obligation model
- platform revenue entitlement model
- invoice engine architecture
- payment collection boundary
- reconciliation boundary
- correction/reversal model
- provider selection
- held-funds strategy
- legal wording for held funds versus escrow
- accounting boundary decision
- tax boundary decision

Finance should remain deferred until Payroll adapter expectations and employer funding obligations are approved.

## 8. Adapter Boundary

Resident Workforce OS will sit above the shared Money Engine through a Resident Workforce Money Adapter.

Conceptual layering:

```text
Resident Workforce OS domain records
-> Resident Workforce Money Adapter
-> Shared Money Engine contract
-> Shared conformance/security behavior
```

Worker side:

```text
Locked Timesheet
-> Payroll Engine
-> HR Money Adapter
-> Shared Money Engine
-> WorkerPayObligation
-> Future Payment Execution
```

Employer side:

```text
Locked Timesheet
-> Finance/Invoice Engine
-> HR Money Adapter
-> Shared Money Engine
-> EmployerFundingObligation
-> Future Collection Execution
```

The adapter owns translation between HR domain records and domain-neutral money primitives.

The shared Money Engine may receive:

- amountMinor
- currency
- precision rules
- frozen commercial terms
- calculation policy references
- allocation inputs
- idempotency key
- correlation ID
- jurisdiction status
- audit metadata

The shared Money Engine must not receive or interpret:

- Timesheet semantics
- employee classification semantics
- payroll law
- worker identity beyond safe references
- employer operational details beyond safe references
- statutory deduction rules
- STR reservation meaning
- guest/host meaning

## 9. Employment Compliance Boundary

Resident Workforce OS owns all employment and HR-specific compliance.

HR-owned responsibilities:

- Timesheets
- Payroll
- worker classification
- employment status
- legal employer determination
- statutory deductions
- minimum wage
- overtime
- labour rules
- pay cycles
- pay periods
- employer contributions
- remittances
- pay statements
- worker consent and disclosures
- jurisdiction eligibility
- counsel approval status
- worker payment eligibility
- employer funding eligibility

These are not shared with STR and must never be delegated to a domain-neutral Money Engine.

Counsel gate:

No jurisdiction may process live payroll until:

- worker classification is confirmed
- statutory deductions are confirmed
- labour rules are confirmed
- counsel approval is recorded

Jurisdiction behavior must fail closed.

Recommended jurisdiction states:

- `draft`
- `legal_review_required`
- `counsel_confirmed`
- `operationally_approved`
- `suspended`
- `retired`

Only `operationally_approved` may allow live Payroll or Payment Execution.

## 10. Shared Contract Assumptions

The adoption plan assumes SYBNB will provide a domain-neutral money contract that can be used without importing STR semantics.

Assumptions requiring confirmation:

- The contract supports immutable `Money` values with integer `amountMinor`.
- The contract supports explicit currency handling.
- The contract supports precision and rounding rules without floating point arithmetic.
- The contract supports frozen commercial terms.
- The contract supports pure allocation calculations.
- The contract supports deterministic calculation explanations.
- The contract supports idempotency.
- The contract supports correlation IDs.
- The contract supports jurisdiction fail-closed behavior.
- The contract supports immutable monetary audit references.
- The contract supports payment, payout, settlement, and reversal references as references only.
- The contract does not require STR booking semantics.
- The contract does not require tax logic.
- The contract can be consumed by separate adapters without repository coupling.
- The conformance suite can run inside Resident Workforce OS.
- The security suite can run inside Resident Workforce OS.

## 11. Expected Artifacts Required From SYBNB

SYBNB should provide:

- shared Money Engine adapter contract
- contract version
- invariant specification
- conformance suite
- security suite
- sample domain-neutral fixtures
- precision and rounding rules
- idempotency rules
- allocation validation rules
- immutable audit requirements
- settlement-reference model
- reversal-reference model
- payment-reference model
- payout-reference model
- failure-state behavior
- jurisdiction fail-closed requirements
- documentation of STR-specific concepts that must not be imported

SYBNB should not provide Resident Workforce OS with:

- guest/host terminology
- reservation lifecycle states
- lodging tax logic
- sales tax logic
- booking cancellation rules
- accommodation refund rules
- host payout eligibility rules
- STR payment-state names as authoritative HR states

## 12. Gap Analysis

| Area                      | Current Resident Workforce OS                | Required for Money Engine integration               | Gap severity |
| ------------------------- | -------------------------------------------- | --------------------------------------------------- | ------------ |
| Execution source records  | Complete through locked Timesheet            | Locked Timesheet as input                           | Low          |
| Payroll engine            | Architecture only                            | Implemented Payroll boundary                        | High         |
| Finance engine            | Not started                                  | Employer funding and invoicing boundary             | High         |
| Money contract            | Not present                                  | Canonical shared contract from SYBNB                | High         |
| Conformance suite         | Not present                                  | Shared tests imported or vendored                   | High         |
| Security suite            | Not present                                  | Shared money security tests                         | High         |
| HR adapter                | Not present                                  | Domain translation layer                            | High         |
| Employment compliance     | Not implemented                              | jurisdiction and classification validation          | High         |
| Worker classification     | Not implemented                              | employee/contractor/temporary classification source | High         |
| Jurisdiction activation   | Not implemented                              | fail-closed profile with counsel approval           | High         |
| Compensation terms        | Worker Offer/Assignment terms exist upstream | Payroll-ready versioned terms decision              | Medium       |
| Employer commercial terms | Not implemented                              | employer funding and platform revenue terms         | High         |
| Held funds strategy       | Not implemented                              | future funding/hold/pending settlement decision     | High         |
| Payment execution         | Not started                                  | future provider-specific execution                  | High         |
| Audit foundation          | Implemented                                  | monetary audit context                              | Medium       |
| Tenant isolation          | Implemented through authorization/membership | money workflows remain tenant-scoped                | Medium       |

Conclusion:

Resident Workforce OS is structurally ready to plan adoption, but not ready to implement money calculations until SYBNB provides the canonical shared contract and test suites.

## 13. Recommended Implementation Order

Recommended future sequence:

```text
Phase 0
Receive canonical contract from SYBNB

Phase 1
Import shared conformance suite

Phase 2
Implement Resident Workforce Money Adapter

Phase 3
Implement Employment Compliance layer

Phase 4
Implement Payroll Foundation

Phase 5
Implement Finance Foundation

Phase 6
Implement Payment Execution
```

Expanded order:

1. Receive SYBNB contract, invariant specification, conformance suite, and security suite.
2. Add Resident Workforce OS local contract tests without implementing Payroll.
3. Define local adapter interfaces and fixtures.
4. Implement employment compliance profile and fail-closed jurisdiction checks after owner approval.
5. Implement Payroll Foundation from locked Timesheets to worker gross/net obligation.
6. Implement Finance Foundation from locked Timesheets to employer funding obligation and platform revenue entitlement.
7. Implement conformance-proven calculation snapshots.
8. Implement payment execution references only after provider, legal, and security approval.
9. Implement payment providers only after a separate owner-approved phase.

## 14. Risks

| Risk                         | Description                                                                | Mitigation                                                  |
| ---------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------- |
| STR semantic leakage         | SYBNB booking terms could accidentally enter HR workflows                  | contract-first adoption; adapter must reject STR vocabulary |
| payroll law overreach        | Money Engine might be asked to interpret employment rules                  | keep employment compliance in Resident Workforce OS         |
| premature package extraction | shared code package might couple repos before contract stabilizes          | adopt contract and conformance suite first                  |
| false escrow language        | held funds might be described as escrow without legal/provider support     | use neutral terms until legal approval                      |
| jurisdiction risk            | live payroll could run without country/province approval                   | fail closed unless counsel-approved                         |
| rounding inconsistency       | worker and employer calculations could diverge                             | deterministic integer money and conformance tests           |
| duplicate payment risk       | retry behavior could create duplicate obligations or provider instructions | idempotency keys and immutable audit references             |
| privacy leakage              | Payroll adapter could expose personal, banking, or tax data                | minimum-necessary inputs and masked references              |
| audit gaps                   | calculations might not be traceable to frozen inputs and policy versions   | immutable calculation explanations and correlation IDs      |
| sequence risk                | Payroll may begin before conformance assets arrive                         | owner gate before Payroll implementation                    |

## 15. Owner Decisions Required

Before implementation, the owner must decide:

1. Which SYBNB artifact is the canonical Money Engine contract.
2. Whether the conformance suite is copied, vendored, or imported as a test artifact.
3. Whether a shared package is deferred until after local conformance passes.
4. Which contract version Resident Workforce OS should target.
5. Whether Security Suite v1 is available from SYBNB.
6. Which invariants are mandatory for Phase 01.
7. Whether Payroll implementation waits for the complete conformance suite.
8. Whether employer funding is preauthorized, post-timesheet, account-balance based, invoice-based, or hybrid.
9. Whether any held-funds language is legally permitted.
10. Whether the platform may hold funds directly or only reference provider-held funds.
11. Which payment provider, if any, will be considered later.
12. Which jurisdiction launches first.
13. Which counsel process approves jurisdiction activation.
14. What source owns worker classification.
15. What source owns legal employer determination.
16. Whether employee and contractor workflows are both in Phase 01.
17. Which statutory deduction provider or interface will be used.
18. Whether employer contributions are in Phase 01 or deferred.
19. Whether pay statements are in Phase 01 or deferred.
20. Whether same-day pay is permitted or deferred.
21. What pay cycle is approved.
22. What platform fee model is approved.
23. Whether employer invoices are generated before or after employer funding confirmation.
24. How reversals, corrections, refunds, chargebacks, and adjustments are represented.
25. Audit retention period for monetary records.
26. Payment-data retention and masking rules.

## 16. Contract-First Adoption Recommendation

Recommended adoption strategy:

```text
Shared Contract and Conformance Suite first.
Shared package extraction later.
```

Resident Workforce OS should not import SYBNB implementation code yet.

Reasons:

- avoids repository coupling
- avoids STR semantic leakage
- lets RWOS keep Payroll and HR compliance ownership
- lets SYBNB continue to evolve its payment implementation
- creates a neutral compatibility contract
- proves adoption with tests before shared-code extraction

## 17. Conformance and Golden Status

Resident Workforce OS becomes money-engine golden only after:

- shared conformance suite passes
- shared security suite passes
- jurisdiction behavior fails closed
- immutable monetary audit is preserved
- deterministic money calculations are proven
- employment compliance boundary is approved
- counsel gate is satisfied
- Payroll and Finance remain separate
- Payment Execution remains provider-specific and separately approved

No live money movement should be authorized before golden status is achieved.

## 18. Security Suite Status

Security Suite status:

```text
PENDING SYBNB ARTIFACTS
```

Expected suite areas:

- authorization and tenant isolation
- idempotency and replay protection
- tamper resistance
- secrets and payment-data protection
- immutable audit integrity
- fail-closed jurisdiction and policy behavior
- settlement and reversal safety

No Resident Workforce OS security-suite implementation is authorized in this phase.

## 19. Reusable Shared Contract Scope

Reusable shared contract scope:

- Money value object
- Currency handling
- integer `amountMinor`
- precision rules
- rounding rules
- fee resolution interface
- pure allocation calculations
- allocation validation
- settlement reference
- payment reference
- payout reference
- reversal reference
- frozen commercial terms
- immutable monetary audit
- jurisdiction fail-closed behavior
- idempotency
- correlation IDs
- deterministic explanations
- conformance tests
- security suite

The shared contract is not a Payroll engine, Finance engine, tax engine, HR compliance engine, payment provider, bank integration, or accounting ledger.

## 20. Excluded STR Semantics

Never reuse:

- reservation terminology
- guest terminology
- host terminology
- lodging tax
- sales tax logic
- reservation cancellation rules
- booking lifecycle
- host payout semantics
- host commission deductions
- accommodation refund logic
- booking-specific settlement states
- STR payment state names as HR authority

Resident Workforce OS must supply its own HR adapter and must keep STR language out of Payroll and Finance records.

## 21. HR Adapter Responsibilities

The future Resident Workforce Money Adapter will:

- identify the HR transaction type
- validate locked Timesheet input
- resolve jurisdiction
- resolve currency
- load frozen worker compensation terms
- load frozen employer commercial terms
- validate worker classification
- validate employment status
- validate Country Pack status
- calculate worker gross-pay obligation through the approved contract boundary
- expose statutory deduction inputs to the HR compliance layer
- calculate worker net-pay obligation after authorized deduction inputs
- calculate employer funding obligation
- calculate platform revenue entitlement
- validate allocations
- determine worker payment eligibility
- determine employer funding eligibility
- produce calculation explanation
- emit immutable audit context

The adapter must not:

- move money
- store bank credentials
- make legal classification decisions without authoritative input
- infer statutory deductions without approved rules
- import STR booking semantics
- claim payment settlement occurred
- bypass Payroll or Finance approval

## 22. Proposed Money Invariants

Proposed invariants:

1. All money amounts use integer minor units.
2. No floating point arithmetic is used for money.
3. Currency is explicit on every monetary value.
4. Mixed-currency calculations fail closed unless FX is explicitly approved.
5. Frozen terms are required for every calculation.
6. Calculation inputs are versioned.
7. Calculation outputs are immutable after finalization.
8. Every calculation has a correlation ID.
9. Idempotency is required for obligation creation.
10. Worker-side obligations and employer-side obligations remain separate.
11. Gross pay does not equal net pay.
12. Employer funding does not equal worker payment.
13. Platform revenue entitlement does not equal cash settlement.
14. Payroll does not execute payment.
15. Finance does not classify employment.
16. Unsupported jurisdictions fail closed.
17. Missing classification fails closed.
18. Missing statutory deduction status fails closed.
19. STR tax rules cannot be used for HR payroll.
20. Settlement references do not prove settlement unless provider evidence exists.

## 23. Employer Funding Recommendation

Smallest safe Phase 01 recommendation:

```text
Employer Funding Obligation only.
No held-funds implementation.
No escrow claim.
No provider balance.
No platform wallet.
```

Reason:

Employer funding is financially and legally sensitive. Phase 01 should calculate and preserve employer funding obligations only, then defer collection execution until Finance and Payment Execution receive separate owner approval.

## 24. Held-Funds Recommendation

Do not use the word `escrow` unless a legally supported and provider-supported escrow arrangement is approved.

Preferred future terms:

- authorized funds
- held funds
- pending settlement
- restricted balance
- provider-held balance
- funding obligation

Phase 01 should avoid implementing funds holding. It should preserve the future boundary by recording whether funding is required, not by moving or holding funds.

## 25. Validation Result

Validation for this phase:

- documentation only
- no code changes
- no schema changes
- no migrations
- no permission changes
- no API changes
- no service changes
- no Payroll implementation
- no Finance implementation
- no Payment Execution implementation
- no Banking implementation
- no Escrow implementation
- no tests added or modified
- no push
- no merge
- no deployment

## Final Verdict

SHARED MONEY ENGINE ADOPTION PLAN READY FOR OWNER REVIEW
