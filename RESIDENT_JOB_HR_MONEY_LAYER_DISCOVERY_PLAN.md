# Resident Job HR Money Layer Discovery Plan

Status: READY FOR REVIEW

This document captures Resident Workforce OS discovery and planning while the independent SYBNB lane prepares the portable Platform Contract Kit.

This is not implementation.

It does not consume the SYBNB contract kit, because the kit has not been received in this workspace.

It does not access the SYBNB repository.

It authorizes no Payroll, Finance, Payment Execution, Employer Billing, Worker Payout, Escrow, held-funds logic, money calculation, schema, migration, permission, API, service, provider integration, banking integration, tax/withholding calculation, push, merge, or deployment.

## 1. Current Repository State

Repository:

```text
/Users/mohamedalmashhour/Documents/Codex/2026-07-09/hi/RESIDENT_WORKFORCE_OS_ENHANCED/resident-workforce-os
```

Branch:

```text
foundation/repository-foundation
```

Current HEAD during discovery:

```text
5c28a31
```

Latest committed work:

```text
docs(resident-job): define shared money implementation gate
```

Current untracked files observed:

- prior environment/tooling investigation documents
- the approved but currently uncommitted `RESIDENT_JOB_SHARED_MONEY_ENGINE_ADOPTION_PLAN.md`
- legacy architecture/governance folders under `docs/architecture/resident-job-platform/`
- this discovery plan

No existing untracked file was modified during this discovery.

## 2. Built Backend Foundations

The repository currently contains backend/schema/service/API work through Timesheet.

Implemented schema entities include:

- `User`
- `UserIdentity`
- `Session`
- `EmployerOrganization`
- `OrganizationMembership`
- `Residence`
- `Department`
- `WorkGroup`
- `RoleDefinition`
- `AccessRoleDefinition`
- `PermissionDefinition`
- `AccessRolePermission`
- `MembershipAccessRole`
- `JobRequestSequence`
- `JobRequest`
- `DispatchReview`
- `DispatchCandidate`
- `WorkerIdentity`
- `WorkerOffer`
- `WorkerOfferTermsVersion`
- `WorkerOfferDeliveryAttempt`
- `WorkerOfferResponse`
- `Assignment`
- `AttendanceRecord`
- `Timesheet`
- `TimesheetCalculationSnapshot`
- `AuditActorReference`
- `AuditEvent`

Implemented service boundaries include:

- authentication
- authorization
- organization membership
- employer organization
- residence
- department
- work group
- role definition
- job request
- dispatch
- worker offer
- assignment
- attendance
- timesheet

Implemented API boundaries include:

- `/auth/*`
- `/authz/*`
- `/work-groups/*`
- `/role-definitions/*`
- `/memberships/*`
- `/organizations/*`
- `/organizations/:organizationId/residences/*`
- `/organizations/:organizationId/departments/*`
- `/organizations/:organizationId/job-requests/*`
- `/platform/job-requests/intake/*`
- `/platform/dispatches/*`
- `/platform/worker-offers/*`
- `/worker/offers/*`
- `/platform/assignments/*`
- `/organizations/:organizationId/assignments`
- `/worker/assignments/*`
- `/platform/attendance/*`
- `/organizations/:organizationId/attendance`
- `/worker/attendance/*`
- `/platform/timesheets/*`
- `/organizations/:organizationId/timesheets`
- `/worker/timesheets/*`

## 3. Built Frontend Surfaces

Employer frontend surfaces include:

- onboarding
- employer dashboard
- shift creation and publication
- applicants and comparison
- AI suggestions as advisory UI
- manual assignment
- attendance states
- timesheet review states
- invoice fixture states
- payment fixture states
- reporting fixture states

Worker/mobile surfaces include:

- shift discovery
- shift detail
- application/offer views
- assignment offer content
- attendance content
- timesheet review content
- earnings content
- service/support content

Admin surfaces include:

- workers
- employers
- residences
- shifts
- finance
- payroll
- compliance
- reports
- system settings
- audit log
- AI control center
- notification center
- platform analytics

The frontend contains fixture-backed financial screens. These screens are not backend authorities and must remain labeled as fixtures until real Finance, Payroll, and Payment Execution exist.

## 4. Existing Money, Timesheet, Payroll, and Payment Pieces

## 4.1 Existing Money Helper

`packages/shared/src/domain/money.ts` currently defines:

- `currencies = ["CAD"]`
- `Currency`
- `MoneyAmount`
- `createMoneyAmount(amountMinor, currency)`

This helper is small and useful for current display/fixture surfaces, but it is not a shared Money Engine contract.

It lacks:

- multi-currency policy
- precision tables
- rounding modes
- allocation rules
- frozen terms
- idempotency
- correlation
- immutable audit
- settlement/reversal references
- fail-closed jurisdiction behavior
- conformance suite coverage
- S1-S7 security suite coverage

Recommendation:

Treat this as a local display/helper primitive only until the canonical contract kit is received.

## 4.2 Existing Timesheet Backend

Timesheet backend exists and is the current authoritative money-adjacent source boundary.

Timesheet stores:

- assignment reference
- attendance reference
- job request reference
- worker identity reference
- employer organization reference
- residence/department/work group/role definition references
- scheduled time snapshots
- actual attendance snapshots
- payable minutes
- billable minutes
- excluded minutes
- break minutes
- premium candidate minutes
- overtime candidate minutes
- rounding adjustment minutes
- review and lock state
- calculation snapshot versions

Timesheet does not calculate:

- gross pay
- net pay
- statutory deductions
- employer invoice amounts
- platform margin
- settlement
- payment execution

## 4.3 Existing Payroll Surface

Payroll backend implementation does not exist.

Current payroll assets are:

- admin Payroll page/UI
- Payroll Engine Architecture document
- payroll boundary language in Timesheet
- `timesheet` permissions that end at locked Timesheet handoff

No Payroll schema, service, API, or calculation implementation exists.

## 4.4 Existing Finance, Invoice, Payment, and Earnings Surfaces

Finance/payment backend implementation does not exist.

Existing frontend fixture surfaces include:

- employer invoices
- employer payment states
- worker earnings
- admin finance page
- admin payroll page

Observed fixture labels include:

- invoice state
- payment state
- authorization
- settlement
- receipt
- worker earnings estimate
- payable created
- payment scheduled
- paid
- reconciled

These are clearly described in the UI/content as fixture-backed or not connected to provider execution. They must not be treated as backend state machines.

## 5. What Does Not Exist Yet

The following do not exist as backend authorities:

- PayrollRecord
- PayrollCalculationSnapshot
- PayrollRun
- PayrollDeduction
- PayrollAdjustment
- WorkerPayObligation
- EmployerFundingObligation
- PlatformRevenueEntitlement
- WorkerClassificationRecord
- JurisdictionEmploymentProfile
- WorkerCompensationTerms as independent payroll terms
- EmployerCommercialTerms
- Invoice
- EmployerPayment
- WorkerPayable
- PaymentExecutionReference
- SettlementReference
- ReversalReference
- ReconciliationRecord
- Escrow account
- held-funds ledger
- provider integration
- statutory deduction provider
- tax/withholding calculation engine

This is expected and aligns with the frozen execution boundary.

## 6. Sequenced Work Items for the Future Payment Layer

The sequence below is proposed for review only. It assumes the SYBNB contract kit will arrive later as a portable artifact and that implementation remains blocked until the shared money implementation gate is accepted.

## 6.1 Work Item 0: Contract Kit Intake

Purpose:

Receive and review the portable SYBNB Platform Contract Kit without importing code into implementation paths.

Depends on:

- SYBNB contract kit export
- contract manifest
- isolation specification
- conformance harness
- S1-S7 security checks

Mapping to expected isolation specification Section 4:

- classify artifacts as canonical contract, canonical test, reusable example, STR-only implementation, provisional mapping, or unresolved item
- confirm STR-only artifacts are isolated
- confirm generic harness can run with HR fixtures

Output:

- accepted, quarantined, rejected, or owner-decision-required intake result

Implementation:

```text
NOT STARTED
```

## 6.2 Work Item 1: HR Fixture Mapping Against Contract Harness

Purpose:

Create synthetic Resident Workforce OS fixtures that represent locked Timesheet inputs and future money outputs.

Fixture chain:

```text
Locked Timesheet
-> Payroll eligibility fixture
-> Worker gross-pay obligation fixture
-> statutory deduction boundary fixture
-> Worker net-pay obligation fixture
-> Employer funding obligation fixture
-> Platform revenue entitlement fixture
```

Mapping to expected isolation specification Section 4:

- canonical test: shared invariant harness
- reusable example: HR fixture examples
- STR-only implementation: excluded
- unresolved item: any missing invariant that cannot be mapped to HR

Implementation:

```text
NOT STARTED
```

## 6.3 Work Item 2: Resident Workforce Money Adapter Boundary

Purpose:

Define and later implement the adapter that translates HR records into domain-neutral money contract inputs.

Inputs:

- locked Timesheet reference and version
- Assignment reference
- WorkerIdentity reference
- worker classification
- compensation terms version
- EmployerOrganization reference
- employer commercial terms
- jurisdiction profile
- currency
- Country Pack
- payroll policy
- platform-fee policy
- timestamp
- correlation ID

Outputs:

- worker gross-pay obligation
- statutory deduction boundary status
- worker net-pay obligation
- employer funding obligation
- platform revenue entitlement
- payout eligibility
- funding eligibility
- calculation explanation
- policy versions
- audit metadata

Mapping to expected isolation specification Section 4:

- canonical contract: Money, amountMinor, currency, allocation, idempotency, audit
- HR-owned adapter: Timesheet, Payroll, classification, deductions, worker/employer obligations
- STR-only implementation: excluded

Implementation:

```text
NOT STARTED
```

## 6.4 Work Item 3: Employment Compliance Layer

Purpose:

Create the HR-owned layer that guards Payroll before money calculations become authoritative.

Responsibilities:

- worker classification
- employment status
- legal employer
- jurisdiction profile
- minimum wage boundary
- overtime boundary
- statutory deduction boundary
- employer contribution boundary
- pay period
- pay statement boundary
- counsel approval gate

Mapping to expected isolation specification Section 4:

- HR-owned responsibilities
- not shared with STR
- not part of domain-neutral Money Engine
- fail-closed where unresolved

Implementation:

```text
NOT STARTED
```

## 6.5 Work Item 4: Payroll Foundation

Purpose:

Turn locked Timesheets into reviewed, auditable worker compensation obligations without executing payment.

Flow:

```text
Locked Timesheet
-> Payroll Eligibility
-> Compensation Terms Validation
-> Worker Classification Validation
-> Gross Pay Calculation
-> Statutory Deduction Boundary
-> Net Pay Obligation
-> Payroll Review
-> WorkerPayObligation
-> Payment Execution Boundary
```

Mapping to expected isolation specification Section 4:

- canonical contract: money primitives, deterministic allocation, audit/idempotency
- HR-owned: worker classification, deductions, withholding, payroll review
- STR-only: lodging/sales tax and host payout semantics excluded

Implementation:

```text
NOT STARTED
```

## 6.6 Work Item 5: Employer Funding and Held-Funds Boundary

Purpose:

Define employer funding as an obligation and future eligibility boundary before any provider integration.

Recommended Phase 01 behavior:

```text
EmployerFundingObligation only.
No escrow implementation.
No platform wallet.
No funds custody claim.
No provider balance claim.
```

Flow:

```text
Locked Timesheet
-> Employer commercial terms
-> EmployerFundingObligation
-> Funding eligibility
-> Future collection execution boundary
```

Mapping to expected isolation specification Section 4:

- canonical contract: payment/reference abstractions only
- HR/Finance-owned: employer funding obligation
- unresolved: legal terminology for held funds

Implementation:

```text
NOT STARTED
```

## 6.7 Work Item 6: Invoice Foundation

Purpose:

Generate employer-facing invoice lifecycle records from approved/locked source records and employer funding obligations.

Flow:

```text
Locked Timesheet
-> EmployerFundingObligation
-> PlatformRevenueEntitlement
-> Invoice Draft
-> Invoice Review
-> Invoice Issued
-> Payment Execution Boundary
```

Mapping to expected isolation specification Section 4:

- canonical contract: money values, allocation, immutable audit
- HR/Finance-owned: invoice lifecycle and employer terms
- STR-only: reservation invoices excluded

Implementation:

```text
NOT STARTED
```

## 6.8 Work Item 7: Margin Split and Platform Revenue

Purpose:

Represent platform revenue entitlement separately from worker pay and employer funding.

Required separation:

- Worker gross pay is not platform revenue.
- Worker net pay is not employer funding.
- Employer funding is not settlement.
- Platform revenue entitlement is not cash received.

Mapping to expected isolation specification Section 4:

- canonical contract: pure allocation, fee resolver interface, frozen terms
- Finance-owned: platform fee policy and revenue entitlement
- STR-only: host commission deductions excluded

Implementation:

```text
NOT STARTED
```

## 6.9 Work Item 8: Worker Payout Boundary

Purpose:

Prepare WorkerPayObligation for future Payment Execution without moving funds.

Flow:

```text
WorkerPayObligation
-> payout eligibility
-> payout reference boundary
-> future provider execution
```

Mapping to expected isolation specification Section 4:

- canonical contract: payout reference, settlement reference, reversal reference
- HR-owned: worker eligibility, classification, pay-cycle timing
- STR-only: host payout semantics excluded

Implementation:

```text
NOT STARTED
```

## 6.10 Work Item 9: Payment Execution

Purpose:

Integrate provider-specific payment and payout execution only after Payroll, Finance, compliance, and contract conformance are approved.

Mapping to expected isolation specification Section 4:

- canonical contract: references and invariants
- platform-owned: provider execution
- unresolved: provider choice, custody model, settlement evidence, reversal authority

Implementation:

```text
NOT STARTED
```

## 7. Isolation Mapping Summary

Because the exported SYBNB isolation specification has not been received, the mapping below is provisional and based only on the approved Resident Workforce OS intake documents.

| Future work area      | Expected isolation class                         | Resident Workforce OS owner | Shared contract involvement                     | STR exclusions                         |
| --------------------- | ------------------------------------------------ | --------------------------- | ----------------------------------------------- | -------------------------------------- |
| Contract intake       | canonical contract/canonical test classification | Owner/reviewer              | manifest and tests only                         | all STR semantics rejected or isolated |
| HR fixtures           | reusable example in HR repo                      | HR adapter                  | generic harness only                            | no Guest/Host/Booking/Reservation      |
| Money adapter         | HR-owned adapter                                 | HR Money Adapter            | Money, currency, allocation, audit, idempotency | no STR lifecycle                       |
| Employment compliance | HR-owned                                         | Payroll/Compliance          | fail-closed signals only                        | no lodging/sales tax                   |
| Payroll               | HR-owned engine                                  | Payroll                     | money primitives and invariants                 | no host payout                         |
| Employer funding      | Finance-owned                                    | Finance                     | payment reference and allocation concepts       | no guest payment                       |
| Invoice               | Finance-owned                                    | Finance                     | money values and audit                          | no reservation invoice                 |
| Margin split          | Finance-owned                                    | Finance                     | fee resolver/pure allocation                    | no host commission                     |
| Worker payout         | Payment-owned future                             | Payment Execution           | payout reference and settlement refs            | no host payout semantics               |
| Payment execution     | Provider-owned future boundary                   | Payment Execution           | references/security invariants                  | no STR provider state assumptions      |

Final mapping must be repeated after the actual SYBNB isolation specification Section 4 arrives.

## 8. Potential Conflicts or Watch Items

## 8.1 Local Money Helper

`packages/shared/src/domain/money.ts` is CAD-only and permits non-negative integer minor amounts.

Risk:

If reused as the Money Engine contract, it would be incomplete.

Assessment:

Not a current conflict if kept as a display/helper primitive.

Required action later:

Compare with canonical Money contract and either wrap, replace, or isolate it.

## 8.2 Frontend Fixture Financial State Names

Frontend fixture screens include states such as:

- `Paid`
- `Settled`
- `Refunded`
- `Reconciled`
- `Finance Ready`
- `Payable Created`

Risk:

These labels could conflict if treated as backend authority.

Assessment:

Not a current conflict because they are fixture-backed and explicitly state that no provider, settlement, payroll, or backend success exists.

Required action later:

When backend money engines are implemented, replace or reconcile fixture state names with authoritative state machines.

## 8.3 Shared Platform Integration Types

`packages/shared/src/domain/platformIntegration.ts` already defines conceptual `Invoice`, `EmployerPayment`, and `WorkerPayable` states.

Risk:

These may be mistaken for implemented backend state machines.

Assessment:

Not a current conflict if treated as frontend/integration planning vocabulary only.

Required action later:

Align these states with canonical Payroll, Finance, and Payment Execution state machines before implementation.

## 8.4 Schema Boundary Guardrail

`packages/database/src/schema-boundary.test.ts` explicitly keeps these deferred entities out of the Phase 01 schema:

- `PayrollHandoffReference`
- `FinanceHandoffReference`
- `Invoice`
- `EmployerPayment`
- `WorkerPayable`
- `Notification`
- `SupportCase`

Assessment:

This supports the shared contract boundary and prevents accidental money-engine implementation before approval.

## 8.5 S1-S7 Security Protocol

No S1-S7 suite has been received or run.

Risk:

Security conformance cannot be claimed yet.

Assessment:

No direct conflict detected because no money engine implementation exists.

Required action later:

Run the exported S1-S7 suite against HR fixtures before claiming readiness.

## 8.6 Tax and Withholding Boundary

Frontend invoice fixtures mention `Taxes` as pending configuration. Worker earnings fixtures say no tax/payroll/provider secrets are exposed.

Risk:

Tax labels could be confused with statutory deduction or tax-engine behavior.

Assessment:

Not a current conflict because the labels are fixture/pending only.

Required action later:

Separate employer invoice taxes, if any, from payroll withholding/statutory deductions. Do not reuse SYBNB sales-tax or lodging-tax capsule for HR payroll.

## 9. S1-S7 Readiness Review

| Control                               | Current HR repo status                               | Conflict detected  | Required future work                            |
| ------------------------------------- | ---------------------------------------------------- | ------------------ | ----------------------------------------------- |
| S1 authorization and tenant isolation | Authz/membership foundations exist through Timesheet | No direct conflict | Add money-specific permissions and tests later  |
| S2 idempotency/replay                 | Timesheet has version and uniqueness boundaries      | No direct conflict | Add obligation and payment idempotency later    |
| S3 tamper resistance                  | Audit/event patterns exist                           | No direct conflict | Add immutable money calculation snapshots later |
| S4 secrets/payment-data protection    | No payment credentials stored in backend             | No direct conflict | Add provider-secret boundary later              |
| S5 immutable audit integrity          | AuditEvent foundation exists                         | No direct conflict | Add monetary audit references later             |
| S6 fail-closed jurisdiction/policy    | Not implemented for payroll                          | Gap, not conflict  | Add JurisdictionEmploymentProfile later         |
| S7 settlement/reversal safety         | Not implemented                                      | Gap, not conflict  | Add references only after contract intake       |

## 10. Recommended Owner Review Questions

Before implementation begins, owner review should answer:

1. Should the HR repo wait for the exported kit before any Payroll code starts?
2. Which SYBNB artifact defines isolation specification Section 4?
3. Should HR fixtures be committed before or after the kit is moved into the HR workspace?
4. Should `packages/shared/src/domain/money.ts` be frozen as display-only until the shared contract is reviewed?
5. Which jurisdiction is first for employment compliance?
6. What is the source of worker classification?
7. Is the first HR implementation item contract tests only, adapter interface only, or employment compliance model first?
8. Is any held-funds language approved, or should Phase 01 use `EmployerFundingObligation` only?
9. Which existing frontend fixture states should be retired once backend financial engines exist?
10. Who approves S1-S7 security suite acceptance?

## 11. Recommended Next Steps

1. Keep SYBNB and Resident Workforce OS repository boundaries separate.
2. Wait for the SYBNB agent to export the portable contract kit.
3. Move the kit into the HR workspace only after owner review of kit contents.
4. Run intake checklist.
5. Complete artifact traceability against the actual isolation specification Section 4.
6. Decide whether to quarantine, reject, accept, or accept with non-blocking gaps.
7. If accepted, define the first implementation item.
8. Start with tests/fixtures before Payroll or Finance implementation.

## 12. Validation

This discovery plan is documentation only.

Confirmed:

- no SYBNB repo access
- no contract kit consumption
- no Payroll implementation
- no Finance implementation
- no Payment Execution implementation
- no Employer Billing implementation
- no Worker Payout implementation
- no Escrow or held-funds implementation
- no schema changes
- no migrations
- no permissions
- no APIs
- no services
- no tests
- no provider integrations
- no banking integrations
- no tax or withholding calculations
- no push
- no merge
- no deployment

## Final Status

HR MONEY LAYER DISCOVERY PLAN READY FOR REVIEW
