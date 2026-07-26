# Resident Job Shared Money Contract Traceability Matrix

Status: READY FOR OWNER REVIEW

This matrix maps expected shared Money Engine contract concepts to Resident Workforce OS ownership, source records, outputs, test expectations, implementation phases, and unresolved decisions.

All implementation statuses in this matrix remain `NOT STARTED`.

This document authorizes no Payroll, Finance, Payment Execution, schema, migration, permission, API, service, test, provider integration, banking integration, escrow or held-funds logic, push, merge, or deployment.

## 1. Traceability Principle

Resident Workforce OS will consume only a future domain-neutral Money Engine contract through a Resident Workforce Money Adapter.

The shared contract must not own HR, Payroll, Finance, STR, tax, booking, reservation, guest, host, worker classification, statutory deduction, labour-rule, or payment-provider semantics.

Traceability must prove:

- which shared concept is used
- which SYBNB artifact defines it
- which Resident Workforce OS owner consumes it
- which Resident Workforce OS source record supplies input
- which Resident Workforce OS output receives results
- which conformance test proves it
- which security control protects it
- which phase may implement it
- which owner decision is unresolved

## 2. Matrix Status Legend

Current status values:

- `NOT STARTED`
- `AWAITING SYBNB ARTIFACT`
- `OWNER DECISION REQUIRED`
- `READY FOR FUTURE IMPLEMENTATION`

For this phase, implementation status must remain:

```text
NOT STARTED
```

Conformance status must remain:

```text
NOT CLAIMED
```

## 3. Traceability Matrix

| Shared contract concept      | Canonical SYBNB artifact                       | HR owner                      | HR source record                                       | HR output                                     | Expected conformance test         | Expected security control          | Implementation phase | Current status | Unresolved decision                            |
| ---------------------------- | ---------------------------------------------- | ----------------------------- | ------------------------------------------------------ | --------------------------------------------- | --------------------------------- | ---------------------------------- | -------------------- | -------------- | ---------------------------------------------- |
| Money                        | Pending contract kit                           | HR Money Adapter              | Payroll/Finance input                                  | Money values for obligations                  | Money immutability and arithmetic | S3 tamper resistance               | Phase 2              | NOT STARTED    | Confirm canonical Money contract               |
| amountMinor                  | Pending contract kit                           | HR Money Adapter              | Timesheet-derived amounts after Payroll/Finance policy | integer minor-unit amounts                    | amountMinor precision tests       | S3 tamper resistance               | Phase 2              | NOT STARTED    | Confirm minor-unit rules                       |
| currency                     | Pending contract kit                           | HR Money Adapter              | Country Pack, employer terms, worker terms             | explicit currency on each amount              | currency mismatch tests           | S6 fail-closed policy              | Phase 2              | NOT STARTED    | Confirm launch currencies                      |
| precision                    | Pending contract kit                           | HR Money Adapter              | currency rules                                         | precision policy reference                    | precision fixture tests           | S3 tamper resistance               | Phase 2              | NOT STARTED    | Confirm precision source                       |
| rounding                     | Pending contract kit                           | HR Money Adapter              | calculation policy                                     | deterministic rounded outputs                 | rounding sequence tests           | S5 audit integrity                 | Phase 2              | NOT STARTED    | Confirm rounding owner                         |
| fee resolver                 | Pending contract kit                           | Finance Engine                | employer commercial terms                              | fee result or platform revenue candidate      | fee resolver tests                | S6 policy fail-closed              | Phase 5              | NOT STARTED    | Confirm platform-fee model                     |
| pure allocation              | Pending contract kit                           | HR Money Adapter              | obligation inputs                                      | balanced allocations                          | allocation invariant tests        | S2 idempotency/replay              | Phase 2              | NOT STARTED    | Confirm allocation categories                  |
| frozen terms                 | Pending contract kit                           | Payroll/Finance Engines       | Worker Offer, Assignment, employer terms               | versioned terms snapshot                      | stale/missing terms tests         | S5 audit integrity                 | Phase 4/5            | NOT STARTED    | Confirm compensation and employer terms source |
| Payment reference            | Pending contract kit                           | Payment Execution future      | WorkerPayObligation or EmployerFundingObligation       | payment reference only                        | payment reference tests           | S4 secrets/payment-data protection | Phase 6              | NOT STARTED    | Confirm provider boundary                      |
| Payout reference             | Pending contract kit                           | Payment Execution future      | WorkerPayObligation                                    | payout reference only                         | payout reference tests            | S4 secrets/payment-data protection | Phase 6              | NOT STARTED    | Confirm worker payout provider                 |
| settlement reference         | Pending contract kit                           | Payment/Reconciliation future | provider evidence future                               | settlement reference                          | settlement reference tests        | S7 settlement/reversal safety      | Phase 6              | NOT STARTED    | Confirm settlement evidence model              |
| reversal reference           | Pending contract kit                           | Payment/Reconciliation future | correction/reversal event future                       | reversal reference                            | reversal reference tests          | S7 settlement/reversal safety      | Phase 6              | NOT STARTED    | Confirm reversal process                       |
| immutable audit              | Pending contract kit                           | Audit + Payroll/Finance       | source records and policy versions                     | monetary audit context                        | audit immutability tests          | S5 audit integrity                 | Phase 2+             | NOT STARTED    | Confirm retention                              |
| idempotency                  | Pending contract kit                           | Every financial engine        | correlation ID and source version                      | idempotent result or safe duplicate rejection | idempotency tests                 | S2 idempotency/replay              | Phase 2+             | NOT STARTED    | Confirm key scope                              |
| jurisdiction                 | Pending contract kit                           | Employment Compliance         | Country Pack, jurisdiction profile                     | fail-closed decision                          | unsupported jurisdiction tests    | S6 fail-closed jurisdiction        | Phase 3              | NOT STARTED    | Confirm first jurisdictions                    |
| error normalization          | Pending contract kit                           | API/Service future            | failed validations                                     | safe normalized errors                        | normalized error tests            | S1/S4 safe disclosure              | Phase 2+             | NOT STARTED    | Confirm public/internal error split            |
| employer funding obligation  | Pending contract kit for money primitives only | Finance Engine                | locked Timesheet, employer terms                       | EmployerFundingObligation                     | employer obligation fixture tests | S5 audit integrity                 | Phase 5              | NOT STARTED    | Confirm funding model                          |
| worker gross-pay obligation  | Pending contract kit for money primitives only | Payroll Engine                | locked Timesheet, worker terms                         | Worker gross pay obligation                   | gross obligation fixture tests    | S6 employment policy fail-closed   | Phase 4              | NOT STARTED    | Confirm gross-pay policy                       |
| statutory deduction boundary | Not shared; HR-owned                           | Employment Compliance         | jurisdiction profile, worker classification            | deduction inputs or blocked state             | HR compliance fixtures            | S6 fail-closed policy              | Phase 3/4            | NOT STARTED    | Confirm deduction provider                     |
| worker net-pay obligation    | Pending contract kit for money primitives only | Payroll Engine                | gross obligation and approved deductions               | WorkerPayObligation                           | net obligation fixture tests      | S5 audit integrity                 | Phase 4              | NOT STARTED    | Confirm employee/contractor scope              |
| platform revenue entitlement | Pending contract kit for money primitives only | Finance Engine                | employer commercial terms                              | PlatformRevenueEntitlement                    | fee/allocation fixture tests      | S5 audit integrity                 | Phase 5              | NOT STARTED    | Confirm platform fee model                     |
| held-funds eligibility       | Pending contract kit for references only       | Finance/Payment future        | employer funding obligation                            | eligibility flag only                         | held-funds boundary tests         | S7 settlement/reversal safety      | Phase 6              | NOT STARTED    | Confirm legal terminology                      |
| payout eligibility           | Pending contract kit for references only       | Payment Execution future      | WorkerPayObligation                                    | payout eligibility flag                       | payout eligibility tests          | S1/S7 controls                     | Phase 6              | NOT STARTED    | Confirm payment timing                         |
| settlement                   | Pending contract kit for references only       | Payment/Reconciliation future | provider evidence future                               | settlement status reference                   | settlement tests                  | S7 settlement/reversal safety      | Phase 6              | NOT STARTED    | Confirm provider settlement flow               |
| reconciliation               | Future RWOS/SYBNB boundary                     | Finance/Reconciliation future | obligations and provider evidence                      | reconciliation result                         | reconciliation conformance future | S7 settlement/reversal safety      | Phase 6+             | NOT STARTED    | Confirm reconciliation owner                   |
| correction                   | Future RWOS boundary plus shared reversal refs | Payroll/Finance future        | corrected source record                                | correction event and recalculation boundary   | correction invariant tests        | S5/S7 controls                     | Phase 4+             | NOT STARTED    | Confirm correction rules                       |
| reversal                     | Pending contract kit for reversal refs         | Payment/Reconciliation future | reversal request/evidence future                       | reversal reference                            | reversal tests                    | S7 settlement/reversal safety      | Phase 6              | NOT STARTED    | Confirm reversal authority                     |

## 4. Resident Workforce OS HR Ownership Summary

Resident Workforce OS owns:

- locked Timesheet source records
- Payroll eligibility
- worker classification
- employment status
- legal employer determination
- compensation terms source
- statutory deduction boundary
- worker gross-pay obligation
- worker net-pay obligation
- employer funding obligation
- platform revenue entitlement
- employer funding model
- payout eligibility
- jurisdiction activation
- counsel approval gate

The shared Money Engine contract owns only reusable money mechanics.

## 5. Shared Contract Concepts That Must Remain Domain-Neutral

The following concepts must not contain HR or STR semantics:

- Money
- amountMinor
- currency
- precision
- rounding
- allocation
- fee resolver interface
- frozen terms
- payment reference
- payout reference
- settlement reference
- reversal reference
- immutable audit
- idempotency
- jurisdiction fail-closed behavior
- error normalization

## 6. Concepts Not Shared With SYBNB

Resident Workforce OS must not treat the following as shared:

- Timesheet approval
- Payroll approval
- worker classification
- employment status
- minimum wage
- overtime
- statutory deductions
- employer contributions
- remittances
- pay statements
- worker payment eligibility
- employer funding policy
- Country Pack labour rules
- counsel approval

## 7. STR Exclusion Mapping

The following SYBNB concepts must remain excluded:

| STR concept                | Resident Workforce OS mapping |
| -------------------------- | ----------------------------- |
| Guest                      | no mapping                    |
| Host                       | no mapping                    |
| Reservation                | no mapping                    |
| Booking                    | no mapping                    |
| Lodging tax                | no mapping                    |
| Sales tax logic            | no mapping                    |
| STR cancellation policy    | no mapping                    |
| Host payout semantics      | no mapping                    |
| Accommodation refund logic | no mapping                    |

If a canonical SYBNB artifact requires any of these concepts, the kit must be quarantined.

## 8. Conformance Status

Current conformance status:

```text
NOT CLAIMED
```

Reason:

- canonical conformance suite has not been received
- canonical S1-S7 security suite has not been received
- SYBNB invariant specification has not been received
- Resident Workforce Money Adapter has not been implemented
- Payroll has not been implemented
- Finance has not been implemented

## 9. Implementation Phase Mapping

Recommended phase mapping:

| Phase   | Purpose                                          | Status      |
| ------- | ------------------------------------------------ | ----------- |
| Phase 0 | Receive canonical SYBNB contract kit             | NOT STARTED |
| Phase 1 | Import or stage conformance suite after approval | NOT STARTED |
| Phase 2 | Implement Resident Workforce Money Adapter       | NOT STARTED |
| Phase 3 | Implement Employment Compliance layer            | NOT STARTED |
| Phase 4 | Implement Payroll Foundation                     | NOT STARTED |
| Phase 5 | Implement Finance Foundation                     | NOT STARTED |
| Phase 6 | Implement Payment Execution                      | NOT STARTED |

## 10. Validation

This matrix is documentation only.

It creates no code, schema, migration, permission, API, service, test, Payroll, Finance, Payment Execution, provider integration, banking integration, escrow logic, push, merge, or deployment.

## Final Status

SHARED MONEY CONTRACT TRACEABILITY MATRIX READY FOR OWNER REVIEW
