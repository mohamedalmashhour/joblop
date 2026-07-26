# Resident Job HR Money Conformance Fixture Plan

Status: READY FOR ARCHITECTURE REVIEW

This document is planning only. It creates no code, schema, migration, service, API, permission, payment integration, payroll calculation, finance calculation, escrow logic, provider integration, push, merge, or deployment.

The portable contract kit has not landed. The C1-C9 labels below are provisional fixture-wiring expectations for review only. They must not be used to implement the money layer until they are re-bound to the canonical kit's actual invariant IDs, names, and assertions.

Known review correction: the real kit is expected to define C1 as no-economics-leak and C2 as authorization. Those semantics must be preserved when the kit is copied into the HR workspace. The provisional matrix below is a planning scaffold, not the final source of truth.

## 1. Fixture Principle

Resident Workforce OS fixtures must be:

- synthetic
- tenant-isolated
- non-personal
- non-production
- Canada-first
- STR-independent
- deterministic
- explicit about worker classification, jurisdiction, terms version, and source record version

Fixtures must not contain:

- real workers
- real employers
- real payroll records
- real bank data
- real tax identifiers
- real payment references
- STR guest, host, reservation, booking, lodging-tax, or host-payout semantics

## 2. CORE Invariant Fixture Matrix

### 2.1 Required Canonical Re-Binding

When the contract kit lands, the HR fixture matrix must be rebuilt against the actual kit invariants before any implementation begins.

Required re-binding rules:

- each row must use the canonical invariant ID from the kit
- each row must use the canonical invariant name from the kit
- each HR analog must be written beside the canonical invariant
- each skip must be approved and STR-specific
- no provisional C1-C9 meaning may survive if it differs from the kit
- no implementation may start from guessed invariant labels

Known HR analogs that must be represented after re-binding:

| Actual kit invariant expectation | Required HR analog |
| --- | --- |
| C1 no-economics-leak | Worker-visible surfaces must never expose platform margin, employer fee breakdowns not intended for workers, internal finance formulas, or provider economics. |
| C2 authorization | Every money, payroll, finance, invoice, employer-funding, payout, settlement, reversal, and compliance action must require the correct HR role, tenant, and workflow authority. |
| C7 frozen terms | Agreed pay rate, employer commercial terms, and policy versions must not restate or mutate an already-approved Timesheet or historical Worker Offer terms. |
| C8 no-double-book | HR analog is no double-assignment of a worker to overlapping shifts, assignments, attendance windows, or timesheets where the same worker cannot lawfully or operationally work both. |

The final matrix must include any additional canonical kit invariants that are absent from this provisional plan.

| Invariant | HR support | Build phase | HR fixture evidence | Skip reason |
| --- | --- | --- | --- | --- |
| C1 Explicit Money representation | Yes | Money Engine/Adapter | Synthetic approved timesheet fixture supplies expected output amounts only after adapter maps amountMinor and currency from approved policy. Currency is explicit and never inferred. | Not skipped |
| C2 Deterministic arithmetic and no floating point | Yes | Money Engine | Fixture includes values that would fail under floating-point arithmetic or non-deterministic rounding. Expected output is stable across repeated runs. | Not skipped |
| C3 Balanced allocation | Yes | Money Engine/Adapter/Finance | Fixture includes employer obligation, platform margin, worker gross obligation, and expected balanced allocation totals. No allocation is accepted if total out differs from total in. | Not skipped |
| C4 Idempotency and replay safety | Yes | Adapter/Finance/Payment future | Fixture includes source record ID, source version, policy version, and idempotency key. Replaying the same input produces the same result or a safe duplicate response. | Not skipped |
| C5 Immutable source terms and audit evidence | Yes | Adapter/Compliance/Finance | Fixture provides locked Timesheet status, Worker Offer terms version, Assignment reference, employer terms version, and audit context. Mutable or missing terms fail. | Not skipped |
| C5b Guard-active integrity | Yes | Contract intake and every phase | Fixture suite includes red probes proving disabled, commented-out, bypassed, or inverted guards fail. Evidence includes one failing-first run per guardrail before commit. | Not skipped |
| C6 Jurisdiction and policy fail-closed | Yes | Compliance | Fixture supplies country, province, work jurisdiction, worker classification, and policy version. Unsupported jurisdiction or missing counsel approval fails closed. | Not skipped |
| C7 Payment reference and secret isolation | Yes, later | Payment Execution last | Future fixture supplies synthetic provider reference IDs only. It must prove no bank account, token, credential, or provider secret appears in source, logs, API response, or audit payload. | Not skipped, but deferred until Payment Execution |
| C8 Settlement and reversal truthfulness | Yes, later | Payment Execution last | Future fixture supplies synthetic settlement, return, reversal, and failed-payment references. It must prove sent is not settled, settled is not irreversible, and reversal never mutates historical obligations. | Not skipped, but deferred until Payment Execution |
| C9 Domain isolation and no STR leakage | Yes | Contract intake and all phases | Fixture labels HR concepts explicitly: Timesheet, worker classification, employer obligation, worker payout. It rejects Guest, Host, Reservation, Booking, lodging tax, STR cancellation policy, and host payout semantics. | Not skipped |

## 2.2 Explicit S1-S7 Fixture Coverage

The S1-S7 suite must be mapped as its own coverage layer. It must not be folded implicitly into C1-C9 rows.

| Security suite item | HR fixture coverage required | Required red probe |
| --- | --- | --- |
| S1 authorization and tenant isolation | Elevated money, payroll, finance, invoice, payout, settlement, reversal, and compliance routes/actions require the correct tenant and role. Cross-tenant access fails. | Unauthorized role, wrong tenant, and missing session must each fail. |
| S2 idempotency and replay protection | Repeated adapter, obligation, invoice, and payment-execution requests use source version and idempotency keys safely. | Duplicate request with mismatched source version must fail or return a safe duplicate response. |
| S3 rate-limit and enumeration protection | Authentication and future money-sensitive endpoints do not reveal account, worker, employer, invoice, payout, or payment-reference existence through timing, status shape, or message differences. | Repeated auth and lookup probes must be rate-limited or normalized without revealing existence. |
| S4 secrets and payment-data protection | Fixtures, logs, audit entries, and API responses contain no provider secrets, bank data, tax identifiers, tokens, or live payment references. | Injected fake secret/payment token must be caught by scan or response/log assertion. |
| S5 immutable audit integrity | Money-relevant decisions preserve source record, policy version, actor, timestamp, and outcome without allowing history rewrite. | Attempted audit mutation or missing policy version must fail. |
| S6 fail-closed jurisdiction and policy behavior | Unsupported jurisdiction, missing counsel approval, missing classification, and missing deduction/minimum-wage/overtime policy block output. | Unsupported province or counsel-unapproved policy must fail closed. |
| S7 settlement and reversal safety | Sent, settled, returned, reversed, and failed states remain truthful and historical obligations are not mutated by provider events. | Settlement reversal probe must create a future reversal/correction path rather than rewriting original obligation evidence. |

### 2.3 Elevated-Route Sweep Non-Zero Assertion

When wiring the S1 authorization sweep, HR must assert both:

- discovered elevated route count is non-zero
- discovered elevated routes match HR's known elevated route inventory for the current build phase

This prevents a mis-parsed Fastify/API router, route registry, or fixture accessor from returning zero routes and silently passing authorization.

The non-zero assertion must fail when:

- the route parser returns an empty list
- known elevated routes are missing from discovery
- discovery includes money-authoritative routes before their approved build phase
- route metadata exists without a matching authorization policy

## 3. STR-Specific Invariant Handling

The HR fixture pack must skip only invariants that are genuinely STR-specific and not part of the domain-neutral money contract.

| Possible STR-specific invariant | HR action | Required skipReason |
| --- | --- | --- |
| Location or lodging occupancy rule | Skip if the invariant depends on rooms, nights, lodging, or destination occupancy. | `STR_LOCATION_OR_LODGING_ONLY` |
| Host payout timing rule | Skip if the invariant depends on host/reservation semantics instead of generic payout references. | `STR_HOST_PAYOUT_ONLY` |
| Lodging tax rule | Skip if the invariant calculates lodging, sales, occupancy, tourism, or accommodation tax. | `STR_TAX_ONLY` |
| Reservation cancellation fee rule | Skip if the invariant depends on booking cancellation policy rather than generic reversal references. | `STR_BOOKING_CANCELLATION_ONLY` |

Every skip must include:

- invariant ID
- source artifact path
- why it is not domain-neutral
- owner approval reference
- replacement HR fixture if a generic invariant still applies

## 4. HR Fixture Families

### 4.1 Approved Timesheet Source Fixture

Supplies:

- locked Timesheet reference
- Assignment reference
- Attendance reference
- scheduled time
- actual check-in/check-out references
- approved payable time quantity
- source version
- audit actor references

Does not supply:

- payroll calculation
- invoice amount
- payout amount
- bank destination
- tax identifier

### 4.2 Worker Terms Fixture

Supplies:

- synthetic worker identifier
- worker classification
- role/work group reference
- terms version
- jurisdiction profile reference

Does not supply:

- real identity
- SIN
- bank details
- health data
- immigration status

### 4.3 Employer Terms Fixture

Supplies:

- synthetic organization identifier
- jurisdiction profile reference
- commercial terms version
- funding model placeholder
- audit actor reference

Does not supply:

- real employer
- real billing method
- payment credentials

### 4.4 Compliance Fixture

Supplies:

- country
- province or territory
- worker classification
- policy version
- counsel approval state
- fail-closed expectation

Does not supply:

- legal advice
- actual deduction calculation implementation
- tax filing logic

### 4.5 Payment Reference Fixture

Deferred until Payment Execution.

Future fixture may supply:

- synthetic provider reference
- synthetic settlement reference
- synthetic reversal reference
- status timeline

It must not supply:

- live provider credential
- bank account
- card data
- personal financial data

## 5. Evidence Required When the Kit Lands

For each invariant, HR must capture:

- canonical invariant ID
- canonical artifact hash
- HR fixture file
- expected output file
- red probe used
- green run output
- S1-S7 mapping
- reviewer
- owner decision

## 6. Drop-In Wiring Steps for Future Kit Intake

1. Quarantine the received contract kit.
2. Verify manifest, source commit, version, hashes, and license.
3. Confirm no secrets, production data, or personal data.
4. Map canonical C1-C9 labels to this fixture plan.
5. Replace provisional invariant descriptions only where the canonical kit differs.
6. Add HR fixtures without altering the contract suite.
7. Run conformance suite against HR fixtures.
8. Run S1-S7 suite against HR fixtures.
9. Record pass/fail evidence.
10. Stop for owner approval before implementation.

## Final Status

HR MONEY CONFORMANCE FIXTURE PLAN READY FOR ARCHITECTURE REVIEW
