# Resident Job HR Money-Layer Sequenced Implementation Plan

Status: READY FOR ARCHITECTURE REVIEW

This document is planning only. It creates no code, schema, migration, service, API, permission, payment integration, payroll calculation, finance calculation, escrow logic, provider integration, push, merge, or deployment.

ADR-0002 remains authoritative. The money layer must not begin until the portable contract kit is present and its conformance suite plus S1-S7 security suite run green against Resident Workforce OS fixtures.

## 1. Scope Boundary

Resident Workforce OS will implement the hourly staffing money workflow only after the contract gate clears:

```text
Locked Timesheet
-> HR Money Adapter
-> Employment Compliance
-> Invoice/Funding Obligation
-> Held-Funds or Escrow Boundary
-> Margin Split
-> Worker Payout
```

This plan does not define data structures. It only sequences future implementation work against the approved build order:

```text
Money Engine
-> Adapter
-> Compliance
-> Payment Execution last
```

## 2. Explicit Gates

### Contract Gate

The contract gate blocks implementation until all of the following are true:

- canonical contract kit received
- source commit and version identified
- artifact inventory complete
- hashes or checksums recorded
- conformance suite runnable
- S1-S7 security suite runnable
- no secrets, production data, or personal data present
- STR-specific semantics isolated or excluded
- HR fixtures accepted
- conformance and S1-S7 run green against HR fixtures
- owner approves the first implementation item

### Counsel Gate

The counsel gate blocks employment-compliance implementation until qualified review confirms:

- worker classification rules
- legal employer responsibility
- payroll withholding obligations
- provincial employment-standards applicability
- minimum wage and overtime requirements
- Quebec-specific deductions and contributions where applicable
- held-funds or escrow terminology and legal boundary
- payout timing and pay-statement requirements

The counsel gate is not satisfied by engineering review.

## 3. Sequenced Implementation Plan

| Phase | Build order position | Future work item | What it does | Test-first approach | Contract invariant target |
| --- | --- | --- | --- | --- | --- |
| 0 | Gate | Contract kit intake | Receive and quarantine-review the portable contract kit before any implementation. | Run intake checklist on manifest, hashes, source commit, fixture policy, S1-S7 inventory, and domain-neutrality labels. | C9 domain isolation; S1-S7 availability |
| 1 | Gate | HR fixture approval | Prepare synthetic HR fixture expectations for locked timesheet inputs without creating money authority. | Failing fixture-wiring tests first: missing fixture, leaked STR semantic, personal data, or missing expected result blocks. | C1-C9, C5b, S1-S7 |
| 2 | Money Engine | Contract conformance import | Bring in only the approved contract harness or package after owner acceptance. | Run contract's own green suite unchanged before any HR adapter exists. Add red probes for currency mismatch, allocation imbalance, and disabled guard. | C1, C2, C3, C5b |
| 3 | Money Engine | Shared Money Engine adoption | Use the contract's currency-aware money mechanics instead of extending the CAD-only helper. | Contract tests must fail on floating-point math, implicit currency, unsupported precision, and unbalanced allocation. | C1, C2, C3 |
| 3A | Money Engine retirement boundary | CAD money.ts retirement | Inventories every current `money.ts` consumer, migrates each consumer to the contract Money Engine, proves behavior equivalence through contract fixtures, then deletes the CAD-only helper. ADR-0002 requires retirement, not extension. | Start with a failing inventory test that lists every `money.ts` import. Add migration tests proving each former consumer uses the contract Money Engine. Add a final deletion guard proving `packages/shared/src/domain/money.ts` and its CAD-only helper exports no longer exist after migration. | Actual kit invariants for money representation, no-economics-leak, arithmetic, and domain isolation after canonical re-binding |
| 4 | Adapter | Resident Workforce Money Adapter | Maps locked Timesheet, worker terms, employer terms, jurisdiction, and policy versions into contract inputs. | Adapter tests start with fixture mismatches: unlocked timesheet, missing jurisdiction, missing classification, stale terms, and unsupported currency. | C1, C4, C5, C6, C9 |
| 5 | Adapter | Idempotent source binding | Ensures repeated adapter execution for the same locked source/version is deterministic and safe. | Replay tests first: duplicate correlation IDs return the same outcome or safe duplicate rejection. | C4; S2 |
| 6 | Compliance | Employment classification gate | Blocks payroll treatment unless worker classification and legal employer context are approved. | Fail-closed tests for missing classification, unsupported jurisdiction, unapproved country pack, and counsel-unapproved policy. | C6; S6 |
| 7 | Compliance | Labour-rule validation | Validates minimum wage, overtime eligibility, pay period, and required policy inputs before any obligation is finalized. | Fixture tests for below-minimum pay, overtime threshold crossings, missing province of employment, and policy-version mismatch. | C5, C6; S5, S6 |
| 8 | Compliance | Statutory deduction boundary | Establishes HR-owned payroll withholding inputs without delegating employment law to the shared Money Engine. | Tests prove CRA/Revenu Quebec inputs remain HR-owned, missing deduction policy fails closed, and STR tax logic is rejected. | C6, C9; S6 |
| 9 | Adapter/Compliance | Timesheet-to-invoice readiness | Converts approved HR outputs into employer-facing obligation candidates only after compliance gates pass. | Tests prove invoices cannot arise from draft, disputed, unlocked, or unapproved timesheets. | C4, C5, C6 |
| 10 | Adapter/Compliance | Employer funding obligation | Creates the future employer obligation candidate from locked source records and approved terms. | Tests prove employer obligation does not alter Timesheet, Payroll, or source terms. | C3, C4, C5 |
| 11 | Adapter/Compliance | Margin split | Applies approved platform commercial terms to derive platform revenue and worker obligation candidates. | Allocation tests prove total in equals total out, deterministic rounding, and no hidden fee leakage. | C2, C3, C5 |
| 12 | Adapter/Compliance | Worker pay obligation | Creates worker gross/net obligation candidates after classification and deduction gates. | Tests prove employee and contractor paths are separate, deduction policy is explicit, and net pay cannot exceed approved gross. | C3, C5, C6 |
| 13 | Payment Execution last | Payment provider boundary | Adds provider references only after obligations are approved and payment execution is separately authorized. | Tests prove no bank credentials, provider secrets, or payment execution state exists before authorization. | C7, C8; S4, S7 |
| 14 | Payment Execution last | Held-funds or escrow boundary | Implements only legally approved terminology and provider boundary after counsel approval. | Tests prove held funds do not imply legal escrow unless counsel-approved and provider-supported. | C6, C8; S6, S7 |
| 15 | Payment Execution last | Worker payout execution | Executes or records payout only through approved provider boundary and authorized workflow. | Tests prove payout cannot run from invoice alone, unsettled funding, missing pay obligation, or unauthorized actor. | C4, C7, C8; S1, S2, S4, S7 |

## 4. Timesheet-to-Worker-Payout Flow Ownership

| Stage | HR owner | Shared contract owner | Blocked until |
| --- | --- | --- | --- |
| Locked Timesheet | Timesheet Foundation | none | already implemented; no money authority |
| Money mechanics | none | Money Engine | contract gate |
| CAD money helper retirement | Shared package migration | Money Engine replaces helper semantics | contract gate and successful consumer inventory |
| HR mapping | HR Money Adapter | validates expected input/output behavior | contract gate |
| Worker classification | Employment Compliance | none | counsel gate |
| Payroll withholding | Employment Compliance/Payroll | none | counsel gate |
| Employer invoice/funding | Finance | money mechanics only | contract and counsel gates |
| Margin split | Finance | allocation mechanics only | contract and counsel gates |
| Held funds/escrow | Finance/Payment future | reference mechanics only | counsel and provider gates |
| Worker payout | Payment Execution future | provider reference invariants only | Payment Execution authorization |

## 5. Required Tests Before Each Phase Moves Forward

Every future implementation phase must begin failing-first and include:

- happy path with synthetic HR fixtures
- unsupported jurisdiction failure
- missing classification failure
- stale or mutable source failure
- unauthorized actor failure
- replay/idempotency failure
- personal-data and secret scan
- STR semantic leakage scan
- conformance suite run
- S1-S7 suite run where applicable

## 6. Deferred Items

The following remain prohibited until separately authorized:

- Payroll implementation
- Finance implementation
- Invoice schema or service
- EmployerPayment or WorkerPayable schema or service
- escrow or held-funds schema or service
- payment provider integration
- tax filing or remittance
- production payout execution
- analytics or reporting over money records
- AI money decisions

## Final Status

HR MONEY-LAYER SEQUENCED IMPLEMENTATION PLAN READY FOR ARCHITECTURE REVIEW
