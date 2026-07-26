# Resident Workforce OS — Payroll Engine Architecture

Status: READY FOR OWNER REVIEW

This document defines Payroll architecture only. It authorizes no schema, migration, permission, service, API, calculation implementation, pay stub, tax deduction, remittance, direct deposit, payment, finance, employer invoicing, accounting, notification, AI execution, frontend, push, merge, deployment, or implementation work.

Canonical flow:

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

Required clarifications:

- Timesheet does not equal Payroll.
- Payroll does not equal Payment.
- Payroll does not equal Bank Transfer.
- Payroll does not equal Employer Invoice.
- Payroll Liability does not equal Cash Settlement.
- Gross Pay does not equal Net Pay.
- Worker Pay does not equal Employer Billing.

## 1. Payroll Operating Principle

Payroll is the governed worker-compensation engine that consumes approved and locked Timesheets and produces auditable worker-pay obligations.

Payroll is:

- derived only from approved and locked Timesheets
- worker-specific
- organization-aware
- Country Pack aware
- versioned
- explainable
- auditable
- reversible through governed correction, reversal, or adjustment
- separate from payment execution
- separate from employer invoicing
- separate from accounting posting
- immutable after finalization except through formal adjustment or reversal

Payroll must preserve:

- Timesheet reference
- Timesheet version
- calculation policy version
- Country Pack version
- compensation terms version
- currency
- tax treatment boundary
- approval evidence

## 2. Canonical Payroll Flow

Recommended governed flow:

| Transition                  | Actor                   | Source State          | Target State                                     | Required Conditions                           | Permission                                       | Authoritative Input              | Calculation Version        | Audit Event                  | Failure Behavior                      | Retry Behavior               | Concurrency                 | Downstream Effect            | Human Approval          |
| --------------------------- | ----------------------- | --------------------- | ------------------------------------------------ | --------------------------------------------- | ------------------------------------------------ | -------------------------------- | -------------------------- | ---------------------------- | ------------------------------------- | ---------------------------- | --------------------------- | ---------------------------- | ----------------------- |
| Eligibility check           | Platform                | locked Timesheet      | eligible                                         | Timesheet locked, no active Payroll duplicate | `payroll.create`                                 | Timesheet                        | none                       | eligibility checked          | no Payroll created                    | safe retry                   | unique Timesheet constraint | none                         | no                      |
| Validate compensation terms | Platform                | eligible              | terms_validated                                  | current worker terms exist                    | `payroll.create`                                 | Assignment/Offer terms boundary  | terms version              | terms validated              | review required                       | retry after terms correction | expected terms version      | none                         | no                      |
| Create draft                | Payroll reviewer/system | terms_validated       | `draft`                                          | authorized actor, idempotency key             | `payroll.create`                                 | Timesheet + terms                | initial                    | Payroll created              | no partial record without transaction | idempotent retry             | transaction                 | none                         | later                   |
| Import payable time         | Payroll reviewer/system | `draft`               | `calculation_pending`                            | locked Timesheet version matches              | `payroll.calculate`                              | Timesheet                        | Timesheet version          | Timesheet imported           | stale Timesheet blocks                | retry after correction       | version snapshot            | none                         | no                      |
| Earnings classification     | Payroll reviewer/system | `calculation_pending` | `review_required` or `platform_review`           | rate inputs available                         | `payroll.calculate`                              | compensation terms               | calculation version        | earnings classified          | exception recorded                    | recalculation allowed        | expected version            | none                         | no                      |
| Gross pay calculation       | Payroll reviewer/system | `calculation_pending` | `review_required` or `platform_review`           | Country Pack/rate rule available              | `payroll.calculate`                              | Timesheet + terms + Country Pack | calculation version        | gross calculated             | review required                       | safe recalculation           | snapshot input versions     | none                         | no                      |
| Deduction boundary          | Payroll reviewer/system | `platform_review`     | `platform_review`                                | deduction interface available or deferred     | `payroll.calculate`                              | Country Pack/interface           | deduction boundary version | deduction boundary evaluated | exception if missing required input   | retry after source available | expected version            | none                         | no                      |
| Net pay boundary            | Payroll reviewer/system | `platform_review`     | `platform_review`                                | gross minus authorized deductions             | `payroll.calculate`                              | Payroll calculation              | calculation version        | net boundary calculated      | review required                       | recalculate                  | expected version            | none                         | no                      |
| Worker review               | Worker                  | `worker_review`       | `platform_review` or `correction_required`       | worker owns record                            | `payroll.worker_read` / `payroll.worker_dispute` | Payroll summary                  | current                    | worker reviewed/disputed     | dispute blocks finalization           | retry after correction       | expected version            | none                         | yes if enabled          |
| Platform review             | Payroll reviewer        | `platform_review`     | `approved`, `rejected`, or `correction_required` | calculation current                           | `payroll.review` / `payroll.approve`             | PayrollRecord                    | current                    | reviewed/approved/rejected   | correction required                   | safe retry                   | expected version            | none                         | yes                     |
| Finalize                    | Payroll approver        | `approved`            | `finalized`                                      | approval exists, no stale inputs              | `payroll.finalize`                               | PayrollRecord                    | finalized version          | finalized                    | blocked on conflict                   | retry after conflict review  | row lock/version            | WorkerPayObligation eligible | yes                     |
| Create obligation           | Payroll reviewer/system | `finalized`           | obligation_created                               | finalized Payroll                             | `payroll.payment_handoff`                        | finalized Payroll                | final                      | obligation created           | no payment execution                  | idempotent                   | unique obligation           | Payment boundary eligible    | no new Payroll approval |
| Payment feedback            | Payment engine future   | obligation_created    | unchanged calculation                            | provider feedback exists                      | future payment permission                        | PaymentExecutionReference        | n/a                        | feedback received            | status visibility only                | idempotent                   | reference uniqueness        | status update boundary       | no                      |

## 3. Payroll Entity Strategy

Entities considered:

- `PayrollRun`
- `PayrollRecord`
- `PayrollCalculationSnapshot`
- `PayrollEarning`
- `PayrollDeduction`
- `PayrollAdjustment`
- `PayrollApproval`
- `PayrollException`
- `WorkerPayObligation`
- `PaymentExecutionReference`
- `PayStatement`

Recommended smallest Phase 01 schema:

- Required: `PayrollRecord`
- Required: `PayrollCalculationSnapshot`
- Required: `WorkerPayObligation`
- Optional Phase 01: `PayrollRun`
- Deferred: `PayrollEarning` as separate table unless itemized calculations are required immediately
- Deferred: `PayrollDeduction` as separate table unless manual governed deductions are approved
- Deferred: `PayrollAdjustment`
- Deferred: `PayrollApproval` as separate table unless multiple signatures are required
- Deferred: `PayrollException`
- Deferred: `PaymentExecutionReference`
- Deferred: `PayStatement`

Reason:

Phase 01 should prove the locked-Timesheet-to-worker-obligation boundary without entity proliferation or payment execution.

## 4. Payroll States

Recommended minimum Phase 01 states:

- `draft`
- `calculation_pending`
- `review_required`
- `worker_review`
- `platform_review`
- `approved`
- `finalized`
- `correction_required`
- `reversed`
- `cancelled`

Excluded states:

- `paid`
- `deposited`
- `cleared`
- `failed_payment`

Those belong to Payment Execution.

| State                 | Meaning                                | Owner    | Allowed Actions                                  | Prohibited Actions                         | Next States                                                                  | Worker Visibility   | Employer Visibility | Platform Visibility | Recalculation           | Payment Handoff                     | Audit                |
| --------------------- | -------------------------------------- | -------- | ------------------------------------------------ | ------------------------------------------ | ---------------------------------------------------------------------------- | ------------------- | ------------------- | ------------------- | ----------------------- | ----------------------------------- | -------------------- |
| `draft`               | Payroll exists but not calculated      | Platform | calculate, cancel                                | approve, finalize, handoff                 | `calculation_pending`, `cancelled`                                           | hidden              | hidden              | full                | yes                     | no                                  | created              |
| `calculation_pending` | calculation queued or running          | Platform | complete calculation, fail to review             | finalize, handoff                          | `review_required`, `worker_review`, `platform_review`, `correction_required` | limited             | hidden/restricted   | full                | yes                     | no                                  | calculation started  |
| `review_required`     | exception requires review              | Platform | correct, recalculate, reject                     | finalize, handoff                          | `worker_review`, `platform_review`, `correction_required`, `rejected` future | limited             | restricted          | full                | yes                     | no                                  | exception detected   |
| `worker_review`       | worker can review compensation summary | Worker   | view, dispute                                    | approve platform Payroll, edit calculation | `platform_review`, `correction_required`                                     | full worker-facing  | hidden/restricted   | full                | no unless correction    | no                                  | worker reviewed      |
| `platform_review`     | platform reviews calculation           | Platform | approve, reject, request correction              | payment execution                          | `approved`, `correction_required`, `cancelled`                               | status/summary      | restricted          | full                | yes if stale            | no                                  | platform reviewed    |
| `approved`            | approved but not final                 | Platform | finalize, correction                             | payment execution                          | `finalized`, `correction_required`                                           | approved summary    | restricted          | full                | only through correction | no                                  | approved             |
| `finalized`           | immutable Payroll obligation source    | Platform | create obligation, reverse through governed flow | silent edit, recalculation                 | obligation boundary, `reversed` future                                       | finalized summary   | restricted          | full                | no silent recalculation | yes                                 | finalized            |
| `correction_required` | correction needed before finalization  | Platform | correct, recalculate, cancel                     | handoff                                    | `calculation_pending`, `worker_review`, `platform_review`, `cancelled`       | reason where lawful | restricted          | full                | yes                     | no                                  | correction requested |
| `reversed`            | finalized Payroll reversed             | Platform | read, replacement/supplemental future            | delete, payment claim                      | terminal or replacement future                                               | visible             | restricted          | full                | no                      | no new handoff from reversed record | reversed             |
| `cancelled`           | Payroll stopped before finalization    | Platform | read                                             | finalize, handoff                          | terminal                                                                     | status              | restricted          | full                | no                      | no                                  | cancelled            |

## 5. Timesheet Dependency

Payroll may only consume Timesheets that are:

- `approved`
- `locked`

Phase 01 recommendation:

Require `locked` Timesheets for Payroll creation. Treat `approved` as insufficient until lock occurs.

Safe behavior:

- Timesheet corrected before Payroll finalization: Payroll moves to `correction_required` or recalculates against the new locked Timesheet version.
- Timesheet requires post-lock adjustment: Payroll stops at review or reversal boundary; Timesheet history is preserved.
- Timesheet reversed: Payroll creation blocked; existing Payroll requires governed reversal or replacement.
- Payroll already exists: duplicate creation rejected by unique Timesheet consumption rule.
- Payment execution has begun: Payroll may record payment feedback boundary only; calculation is not silently altered.

Payroll must never rewrite Timesheet data.

## 6. Worker Compensation Terms

Options evaluated:

- A. Worker Offer terms only
- B. Assignment compensation snapshot
- C. Separate WorkerCompensationTerms entity
- D. Country Pack + RoleDefinition + Worker agreement

Recommendation:

Use Assignment compensation snapshot as the smallest safe Phase 01 boundary, referencing Worker Offer terms version and Country Pack version. Defer a separate `WorkerCompensationTerms` entity until compensation needs exceed the Assignment snapshot.

Compensation inputs may include:

- base hourly rate
- premium rate
- travel allowance
- transport allowance
- cancellation compensation
- minimum-call compensation
- currency
- effective date
- terms version
- classification boundary

Do not implement a full employment-contract engine in Payroll Phase 01.

## 7. Gross Pay Calculation

Gross pay architecture must support:

- regular earnings
- overtime candidate earnings
- night premium
- weekend premium
- holiday premium
- emergency premium
- short-notice premium
- travel time
- transport allowance
- cancellation compensation
- minimum-call compensation
- manual approved adjustment

All gross-pay rules must be:

- versioned
- explainable
- Country Pack aware
- worker-visible where lawful
- auditable

Do not hardcode Quebec formulas as universal rules.

## 8. Deduction Boundary

Future deductions may include:

- income tax
- pension
- employment insurance
- statutory deductions
- garnishments
- benefit deductions
- authorized worker deductions
- repayment adjustments

Options:

- A. defer statutory deductions completely
- B. define interfaces only
- C. support manual governed deductions
- D. implement Country Pack calculations

Recommendation:

Phase 01 should define interfaces only and defer statutory calculation until an approved Country Pack exists. Manual governed deductions may be designed but should not be implemented without owner approval.

Do not invent legal formulas.

## 9. Net Pay Boundary

Payroll defines:

```text
Gross Earnings
- Authorized Deductions
= Net Pay Obligation
```

Net Pay Obligation does not equal Payment Completed.

Payroll calculates the obligation. Payment Execution settles it later.

## 10. Payroll Currency

Payroll must preserve:

- payroll currency
- compensation-term currency
- worker payment currency boundary
- rounding precision
- Country Pack currency rules

Phase 01 recommendation:

Use the compensation-term currency as the PayrollRecord currency. Do not implement foreign-exchange conversion. If currency mismatch occurs, move Payroll to `review_required`.

## 11. Pay Periods

Supported models evaluated:

- per-shift payroll
- weekly
- biweekly
- semimonthly
- monthly
- custom pay periods
- emergency same-day pay
- off-cycle payroll

Recommendation:

Phase 01 should support one PayrollRecord per locked Timesheet, with optional grouping by a future PayrollRun. This best fits urgent staffing and avoids premature pay-period complexity while remaining compatible with future weekly/biweekly/global HR payroll.

## 12. Payroll Run Model

Options:

- PayrollRecord only
- PayrollRun only
- PayrollRun plus PayrollRecord

Recommendation:

Phase 01 minimum: `PayrollRecord`.

Optional Phase 01: `PayrollRun` only if batch approval is required immediately.

PayrollRun may later own:

- payroll period
- organization scope
- worker scope summary
- currency summary
- status
- record count
- total gross boundary
- total deduction boundary
- total net boundary
- approval
- finalization

## 13. Worker Pay Obligation

`WorkerPayObligation` is recommended as required Phase 01 if Payroll finalization is expected to hand off to future Payment Execution.

It may include:

- worker
- PayrollRecord
- amount
- currency
- due date
- status boundary
- payment method reference boundary
- legal-hold boundary
- payment execution reference boundary
- reversal reference boundary

Payroll creates the obligation. Payroll does not execute the payment.

## 14. Payment Execution Boundary

Future handoff:

```text
Finalized Payroll
-> Create WorkerPayObligation
-> Validate payment readiness
-> Payment provider or banking boundary
-> Payment attempt
-> Success/failure feedback
-> Payroll status visibility
```

Payroll must not:

- store full bank credentials
- initiate payment unless a future Payment Engine authorizes it
- claim payment succeeded without provider evidence
- retry blindly
- alter finalized calculation because payment failed

## 15. Pay Statement

Future PayStatement may include:

- pay period
- work references
- regular hours
- premium hours
- earnings
- deductions
- net-pay obligation
- currency
- calculation version
- employer/legal identity
- correction references

PayStatement does not equal proof of payment.

Recommendation:

Defer PayStatement as a separate entity for Phase 01. Permit PayrollRecord to expose a worker-facing summary until statutory pay-statement requirements are approved.

## 16. Worker Review

Workers may eventually:

- view draft or final Payroll summary
- view finalized Payroll
- confirm compensation inputs
- dispute earnings
- dispute deductions
- request correction
- view calculation explanation
- download pay statement

Phase 01 recommendation:

Allow worker read and dispute of worker-facing Payroll summaries. Silence must not equal approval.

Workers must not see:

- employer invoice rate
- platform margin
- internal risk notes
- other workers' records
- employer payment data

## 17. Employer Visibility

Employer visibility should be highly restricted or absent in Phase 01.

Employer organizations may need status-only visibility for operational support, but they must not see worker-private deductions, net pay, bank data, tax data, or platform payroll internals unless separately approved.

Employer must not alter Payroll calculations directly.

## 18. Platform Review

Payroll Reviewer or Platform Administrator authority may include:

- review calculations
- approve
- finalize
- reject
- request correction
- apply approved adjustment
- reverse Payroll
- view sensitive worker-pay information
- authorize payment handoff boundary

AI may identify anomalies but may not approve or finalize Payroll.

## 19. Corrections

Correction scenarios:

- before approval
- before finalization
- after finalization
- after payment execution
- retroactive adjustment
- reversal
- replacement Payroll
- supplemental Payroll

Recommendation:

Before finalization, allow correction and recalculation. After finalization, preserve the finalized record and use reversal/replacement or supplemental Payroll. Never silently overwrite finalized Payroll.

## 20. Reversals

Reversal may be necessary for:

- duplicate Payroll
- invalid Timesheet
- wrong worker
- wrong rate
- wrong currency
- legal hold
- payment failure
- fraud/compliance event
- employer cancellation boundary

Reversal must preserve original records. Do not delete finalized Payroll.

## 21. Multi-Timesheet Payroll

Future Payroll must support:

- multiple assignments
- multiple employers
- multiple worksites
- multiple roles
- multiple currencies
- multiple Country Packs
- multiple pay periods

Phase 01 recommendation:

Do not aggregate multiple Timesheets into one PayrollRecord. Use one PayrollRecord per locked Timesheet. Defer aggregation to PayrollRun architecture.

## 22. Tax and Statutory Boundary

Future Country Packs may define:

- tax withholding
- pension
- employment insurance
- worker classification
- contractor treatment
- taxable benefits
- reporting slips
- remittances
- employer contributions
- year-end reporting

Payroll Core should accept from Country Packs:

- jurisdiction
- worker classification
- taxable earning categories
- deduction interface result
- employer contribution interface result
- rounding rules
- pay statement disclosure requirements
- retention rules

Do not implement legal calculations without approved authoritative rules.

## 23. Contractor Versus Employee

Payroll must support future:

- employee
- temporary employee
- contractor
- agency worker
- internal staff
- staffing partner worker

Classification must come from an authoritative governed source. Payroll must not infer classification automatically.

## 24. Payroll Permissions

Proposed minimum permissions:

| Permission                | Actor                          | Context  | Status            | Risk                      | Test Requirement             |
| ------------------------- | ------------------------------ | -------- | ----------------- | ------------------------- | ---------------------------- |
| `payroll.create`          | Payroll Reviewer/platform      | platform | active            | duplicate Payroll         | duplicate creation denied    |
| `payroll.read`            | Payroll Reviewer/platform      | platform | active            | sensitive data exposure   | scoped reads                 |
| `payroll.calculate`       | Payroll Reviewer/platform      | platform | active            | incorrect calculation     | versioned snapshot tests     |
| `payroll.recalculate`     | Payroll Reviewer/platform      | platform | active            | stale overwrite           | expected version tests       |
| `payroll.review`          | Payroll Reviewer/platform      | platform | active            | bypass review             | lifecycle tests              |
| `payroll.approve`         | Payroll Approver/platform      | platform | active            | unauthorized approval     | role denial tests            |
| `payroll.finalize`        | Payroll Approver/platform      | platform | active            | payment handoff too early | finalized-only handoff tests |
| `payroll.reject`          | Payroll Reviewer/platform      | platform | active            | improper rejection        | audit tests                  |
| `payroll.adjust`          | Payroll Reviewer/platform      | platform | reserved/optional | silent changes            | adjustment audit tests       |
| `payroll.reverse`         | Payroll Approver/platform      | platform | reserved/optional | destructive reversal      | reversal preservation tests  |
| `payroll.audit_read`      | Payroll Reviewer/auditor       | platform | active            | audit privacy             | audit scope tests            |
| `payroll.worker_read`     | Worker                         | worker   | active            | cross-worker exposure     | own-record tests             |
| `payroll.worker_dispute`  | Worker                         | worker   | active            | unauthorized dispute      | own-record tests             |
| `payroll.payment_handoff` | Payroll/Payment boundary actor | platform | reserved          | payment confusion         | no payment execution tests   |
| `payroll.supervise`       | senior platform role           | platform | reserved          | broad authority           | default unassigned tests     |

Do not implement permissions until owner approves Payroll Foundation.

## 25. Access Roles

Roles evaluated:

- Platform Administrator
- Payroll Reviewer
- Payroll Approver
- Worker Access
- Employer Finance Viewer
- future Finance Reviewer
- future Payment Operator

Recommended smallest Phase 01 model:

- `PAYROLL_REVIEWER`
- `PAYROLL_APPROVER`
- Worker Access with worker read/dispute only
- Platform Administrator with supervised authority

Do not grant Payroll authority to Dispatcher.

Employer Finance Viewer should be deferred or restricted to status-only visibility.

## 26. Audit

Audit events:

- Payroll created
- calculation started
- calculation completed
- calculation failed
- exception detected
- worker viewed
- worker disputed
- review started
- approved
- finalized
- rejected
- correction requested
- adjustment proposed
- adjustment approved
- reversed
- payment handoff created
- payment feedback received
- sensitive access denied

Audit must include:

- actor
- role/context
- organization
- worker
- Payroll reference
- Timesheet references
- input versions
- calculation version
- Country Pack version
- prior state
- new state
- reason
- timestamp
- correlation ID

## 27. Concurrency

Required controls:

- duplicate Payroll creation prevention
- Timesheet correction during Payroll calculation
- simultaneous recalculation protection
- approval and rejection race protection
- finalization and correction race protection
- reversal and payment handoff race protection
- multiple Payroll runs consuming same Timesheet prevention
- duplicate WorkerPayObligation prevention
- stale compensation terms detection
- duplicate payment feedback idempotency

Recommended controls:

- optimistic concurrency
- unique constraints
- row locks for finalization
- transaction boundaries
- idempotency keys
- authoritative server timestamps

## 28. API Capability Map

Future capabilities only; no endpoint URLs are authorized here.

| Capability             | Actor                   | Permission                | Input             | Output               | Validation              | Idempotency      | Concurrency       | Audit             | Side Effect             |
| ---------------------- | ----------------------- | ------------------------- | ----------------- | -------------------- | ----------------------- | ---------------- | ----------------- | ----------------- | ----------------------- |
| Create Payroll         | platform                | `payroll.create`          | locked Timesheet  | PayrollRecord        | Timesheet locked        | required         | unique Timesheet  | created           | none                    |
| Read Payroll           | platform                | `payroll.read`            | Payroll ID        | Payroll summary      | scope                   | n/a              | n/a               | read optional     | none                    |
| List Payroll           | platform                | `payroll.read`            | filters           | list                 | scope                   | n/a              | n/a               | optional          | none                    |
| Calculate              | platform                | `payroll.calculate`       | Payroll ID        | snapshot             | terms/current Timesheet | calculation key  | expected version  | calculated        | none                    |
| Recalculate            | platform                | `payroll.recalculate`     | Payroll ID        | snapshot             | not finalized           | calculation key  | expected version  | recalculated      | none                    |
| Read Explanation       | platform/worker         | read permissions          | Payroll ID        | explanation          | scope                   | n/a              | n/a               | read optional     | none                    |
| Worker View            | worker                  | `payroll.worker_read`     | own Payroll ID    | worker summary       | ownership               | n/a              | n/a               | worker viewed     | none                    |
| Worker Dispute         | worker                  | `payroll.worker_dispute`  | reason            | dispute status       | ownership               | dispute key      | expected version  | disputed          | blocks finalization     |
| Review                 | platform                | `payroll.review`          | Payroll ID        | review state         | reviewer role           | n/a              | expected version  | reviewed          | none                    |
| Approve                | platform                | `payroll.approve`         | Payroll ID        | approved             | current calculation     | approval key     | expected version  | approved          | none                    |
| Reject                 | platform                | `payroll.reject`          | reason            | rejected             | reviewer role           | rejection key    | expected version  | rejected          | none                    |
| Finalize               | platform                | `payroll.finalize`        | Payroll ID        | finalized            | approved                | finalization key | row lock          | finalized         | obligation eligible     |
| Apply Adjustment       | platform                | `payroll.adjust`          | adjustment        | adjusted/review      | approved reason         | adjustment key   | expected version  | adjusted          | no payment              |
| Reverse                | platform                | `payroll.reverse`         | reason            | reversed             | final record            | reversal key     | row lock          | reversed          | payment boundary notice |
| Read Audit Summary     | platform                | `payroll.audit_read`      | Payroll ID        | audit summary        | scope                   | n/a              | n/a               | read              | none                    |
| Create Payment Handoff | platform/future payment | `payroll.payment_handoff` | finalized Payroll | obligation/reference | finalized only          | handoff key      | unique obligation | handoff created   | no provider payment     |
| Read Payment Feedback  | platform                | future payment permission | reference         | status               | reference exists        | feedback key     | idempotent        | feedback received | status only             |

Safe errors must not expose worker financial data, tax data, bank data, or cross-tenant existence.

## 29. Entity Impact

| Entity                       | Recommendation                                             | Rationale                                                            |
| ---------------------------- | ---------------------------------------------------------- | -------------------------------------------------------------------- |
| `PayrollRun`                 | optional Phase 01                                          | useful for batch grouping but not required for one Timesheet Payroll |
| `PayrollRecord`              | required Phase 01                                          | core worker Payroll record                                           |
| `PayrollCalculationSnapshot` | required Phase 01                                          | preserves calculation inputs and versions                            |
| `PayrollEarning`             | deferred                                                   | can be embedded/summarized initially unless itemization is required  |
| `PayrollDeduction`           | deferred                                                   | statutory/manual deductions need approved Country Pack/interface     |
| `PayrollAdjustment`          | deferred                                                   | formal adjustment architecture can follow                            |
| `PayrollApproval`            | deferred                                                   | use fields first unless multi-signature approval required            |
| `PayrollException`           | deferred                                                   | use status/reason first unless history table required                |
| `WorkerPayObligation`        | required Phase 01 if finalization creates payment boundary | separates Payroll from Payment Execution                             |
| `PaymentExecutionReference`  | deferred                                                   | belongs to Payment Engine boundary                                   |
| `PayStatement`               | deferred                                                   | statutory statement rules require Country Pack approval              |

Smallest viable schema:

- `PayrollRecord`
- `PayrollCalculationSnapshot`
- `WorkerPayObligation`
- optional `PayrollRun`

## 30. Country Pack Boundary

Future Country Packs may define:

- statutory deductions
- employer contributions
- overtime treatment
- taxable benefits
- worker classification
- pay-period rules
- currency
- rounding
- pay statement requirements
- remittance rules
- reporting slips
- retention
- dispute timelines
- legal disclosures

Do not hardcode Quebec rules into Payroll Core.

## 31. Global HR Compatibility

Payroll architecture must remain compatible with:

- temporary staffing
- permanent employees
- contractors
- enterprise employees
- staffing partners
- multi-country payroll
- multi-currency
- multilingual pay statements
- multiple legal employers
- multiple pay periods
- off-cycle payments
- same-day payments
- retroactive adjustments

Preserve current RoleDefinition strategy. Do not introduce GlobalOccupation in Payroll Phase 01.

## 32. Privacy and Retention

Payroll privacy requirements:

- worker payroll data is confidential
- employer visibility is restricted
- tax data is highly sensitive
- deduction evidence is restricted
- payment metadata is separate from Payroll calculation
- correction history is preserved
- legal hold may block deletion or reversal workflows

Do not invent retention periods without approved policy.

## 33. Exception Flows

| Exception                    | Authoritative Actor     | Preserved Records                    | State Result                 | Payment/Finance Impact | Audit                     |
| ---------------------------- | ----------------------- | ------------------------------------ | ---------------------------- | ---------------------- | ------------------------- |
| Timesheet unavailable        | platform                | Timesheet absence                    | no Payroll                   | none                   | eligibility failed        |
| Timesheet corrected          | platform                | original Timesheet and Payroll draft | correction_required          | no handoff             | correction                |
| compensation terms missing   | platform                | Timesheet                            | review_required              | none                   | terms missing             |
| invalid currency             | platform                | Timesheet and terms                  | review_required              | none                   | currency exception        |
| calculation failure          | platform                | draft and inputs                     | review_required              | none                   | calculation failed        |
| deduction source unavailable | platform/Country Pack   | gross calculation                    | review_required              | none                   | deduction unavailable     |
| worker dispute               | worker                  | Payroll draft                        | correction_required          | blocks finalization    | disputed                  |
| reviewer rejection           | platform                | Payroll record                       | rejected/cancelled           | none                   | rejected                  |
| finalization conflict        | platform                | approved record                      | platform_review              | no handoff             | version conflict          |
| duplicate Payroll            | platform                | existing Payroll                     | denied                       | none                   | duplicate denied          |
| payment handoff failure      | future payment/platform | finalized Payroll                    | finalized remains            | no calculation change  | handoff failed            |
| payment execution failure    | future payment          | obligation and payment ref           | status boundary              | no calculation change  | feedback                  |
| post-payment correction      | platform                | original Payroll/payment refs        | reversal/supplemental future | payment/finance notice | correction                |
| Country Pack unavailable     | platform                | Timesheet and terms                  | review_required              | none                   | Country Pack unavailable  |
| classification unresolved    | platform                | source records                       | review_required              | none                   | classification unresolved |

## 34. Test Strategy

Future tests must cover:

Lifecycle:

- valid transitions
- invalid transitions
- approval
- finalization
- rejection
- correction
- reversal

Calculation:

- regular pay
- premiums
- allowances
- zero earnings
- missing terms
- multi-Timesheet boundary
- multi-currency boundary
- rounding
- deduction interface unavailable

Security:

- worker own Payroll only
- other worker denied
- employer restricted
- cross-tenant denied
- Dispatcher denied
- Payroll Reviewer allowed
- Platform Administrator allowed
- sensitive data hidden

Concurrency:

- duplicate creation
- stale recalculation
- finalization/correction race
- reversal/payment race
- duplicate obligation
- stale terms

Boundaries:

- no payment execution
- no employer invoice
- no accounting posting
- no Timesheet mutation
- no hardcoded country formulas

## 35. Implementation Order

Recommended implementation order:

1. Payroll schema and migration
2. Payroll permissions and reviewer role
3. Payroll creation boundary
4. Timesheet import and validation
5. Compensation-term boundary
6. Calculation snapshot
7. Basic gross-pay framework
8. Deduction interface
9. Net-pay obligation
10. Worker review/dispute
11. Platform review and approval
12. Finalization
13. WorkerPayObligation
14. Payment handoff interface
15. Audit
16. APIs
17. Tests
18. Final report

Dependencies:

- Timesheet Engine baseline
- Execution Layer baseline
- approved compensation-term source
- approved Country Pack boundary
- approved Payroll entities and states
- approved Payroll permissions

## 36. Owner Decisions Required

| Decision                                     | Options                                | Recommendation                                                 | Impact                 | Risk                            | Required Before Schema |
| -------------------------------------------- | -------------------------------------- | -------------------------------------------------------------- | ---------------------- | ------------------------------- | ---------------------- |
| PayrollRun versus PayrollRecord              | record only, run only, both            | PayrollRecord required; PayrollRun optional                    | schema shape           | over-batching                   | yes                    |
| one Payroll per Timesheet versus aggregation | one-to-one, grouped                    | one PayrollRecord per Timesheet                                | simplicity             | later migration for aggregation | yes                    |
| required entities                            | narrow/wide                            | PayrollRecord, PayrollCalculationSnapshot, WorkerPayObligation | scope                  | missing future detail           | yes                    |
| compensation-term source                     | offer, assignment snapshot, new entity | Assignment compensation snapshot                               | source clarity         | stale terms                     | yes                    |
| worker classification source                 | manual, org, Country Pack              | governed source, no inference                                  | compliance             | misclassification               | yes                    |
| approval model                               | reviewer only, approver separate       | Payroll Reviewer + Payroll Approver                            | control                | over-permission                 | yes                    |
| worker review                                | none, read, dispute                    | worker read/dispute                                            | fairness               | privacy exposure                | yes                    |
| employer visibility                          | none, status, details                  | restricted/status-only                                         | privacy                | overexposure                    | deferrable             |
| deduction scope                              | defer, interface, manual, Country Pack | interface only                                                 | legal safety           | incomplete net pay              | yes                    |
| tax scope                                    | defer, Country Pack                    | defer until approved Country Pack                              | legal safety           | cannot do statutory payroll     | yes                    |
| currency policy                              | single, terms currency, FX             | terms currency, no FX                                          | simplicity             | mismatch exceptions             | yes                    |
| pay-period model                             | per Timesheet, period, run             | per Timesheet Phase 01                                         | urgent staffing fit    | future grouping needed          | yes                    |
| same-day pay                                 | no, boundary only, implement           | boundary only                                                  | future support         | user expectation                | deferrable             |
| correction model                             | edit, adjustment, reversal             | correction before finalization; reversal after                 | auditability           | complexity                      | yes                    |
| reversal model                               | delete, reverse, replace               | reverse/replacement                                            | auditability           | operational complexity          | yes                    |
| pay statement                                | record summary, entity                 | defer entity                                                   | legal caution          | limited worker doc              | deferrable             |
| WorkerPayObligation                          | yes/no                                 | yes if finalization handoff needed                             | clean payment boundary | added entity                    | yes                    |
| payment handoff                              | none, interface, execute               | interface only                                                 | boundary clarity       | no real payment                 | yes                    |
| reviewer roles                               | one/two                                | Payroll Reviewer + Approver                                    | separation             | admin overhead                  | yes                    |
| Country Pack responsibilities                | none, interfaces, formulas             | interfaces now                                                 | global readiness       | incomplete legal calc           | yes                    |
| audit retention                              | default, policy                        | require policy later                                           | compliance             | unknown retention               | deferrable             |
| privacy boundaries                           | narrow/broad                           | narrow worker-private model                                    | privacy                | limited employer view           | yes                    |

## 37. Validation

This architecture validates:

- Timesheet baseline remains frozen.
- Execution Layer remains frozen.
- Payroll consumes only approved and locked Timesheets.
- Payroll never rewrites Timesheets.
- Payroll remains separate from Payment Execution.
- Worker pay remains separate from employer billing.
- Country Pack boundaries remain open.
- No legal formulas are invented.
- AI remains advisory.
- Global HR compatibility remains possible.

## 38. Final Recommendation

Proceed to owner review.

Recommended Phase 01 Payroll scope:

- `PayrollRecord`
- `PayrollCalculationSnapshot`
- `WorkerPayObligation`
- optional `PayrollRun`
- one PayrollRecord per locked Timesheet
- Assignment compensation snapshot as compensation-term source
- Country Pack interfaces without legal formula implementation
- worker read/dispute
- platform review, approval, and finalization
- payment handoff boundary only

Verdict:

PAYROLL ENGINE ARCHITECTURE READY FOR OWNER APPROVAL
