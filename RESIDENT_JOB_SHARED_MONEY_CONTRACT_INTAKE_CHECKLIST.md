# Resident Job Shared Money Contract Intake Checklist

Status: READY FOR OWNER REVIEW

This checklist defines the controlled intake and verification process for the future portable SYBNB Money Engine contract kit.

This document authorizes no code import, shared package creation, test vendoring, dependency change, schema change, migration, API, service, Payroll implementation, Finance implementation, Payment Execution, banking integration, escrow or held-funds logic, push, merge, or deployment.

## 1. Intake Purpose

The intake process exists to confirm that the SYBNB contract kit can be reviewed as a domain-neutral money contract before Resident Workforce OS consumes it.

The purpose is to verify:

- artifact completeness
- artifact provenance
- contract version
- ownership and licensing
- domain neutrality
- STR-specific isolation
- absence of production data
- absence of personal data
- absence of live secrets
- completeness of conformance tests
- completeness of the S1-S7 security suite
- owner readiness for any future implementation phase

The intake process does not approve implementation by itself.

## 2. Required Artifact Inventory

The SYBNB handoff must include:

- contract manifest
- canonical contract version
- source commit
- source tag or tag-absence explanation
- ownership and licensing statement
- artifact classification list
- adapter contract
- Money value-object rules
- `amountMinor` and currency rules
- precision and rounding rules
- fee resolver specification
- pure allocation and split invariants
- frozen-terms specification
- Payment reference contract
- Payout reference contract
- settlement-reference contract
- reversal-reference contract
- immutable-audit contract
- idempotency requirements
- fail-closed jurisdiction rules
- normalized error model
- canonical conformance suite
- canonical S1-S7 security suite
- synthetic fixtures
- runner instructions
- dependency manifest
- environment requirements
- known limitations
- STR-only exclusion list
- versioning policy

Any missing required artifact must be recorded as either:

- non-blocking gap
- blocking gap
- unresolved owner decision

## 3. Canonical Contract Version

The intake must identify one canonical contract version.

Required fields:

- contract name
- semantic version or declared version string
- source repository
- source commit
- source tag
- release date if available
- compatibility notes
- breaking-change policy

If a source tag does not exist, the absence must be explicitly explained and accepted by the owner before implementation.

## 4. Source Commit

The source commit must be recorded exactly.

The intake reviewer must confirm:

- the commit exists in the SYBNB source repository
- the commit matches the provided artifact kit
- the commit is not a working-tree snapshot
- the commit contains the referenced contract or contract source
- the commit contains or references the conformance suite
- the commit contains or references the security suite

If the artifact kit is generated from multiple commits, the kit must be quarantined until SYBNB supplies a single manifest explaining the source map.

## 5. Source Tag

The source tag must be recorded when available.

The intake reviewer must confirm:

- tag name
- tag target commit
- whether the tag is signed
- whether the tag is immutable by project convention
- whether the tag matches the contract version

If no source tag exists, the intake may continue only with owner approval.

## 6. Ownership and Licensing Confirmation

The SYBNB handoff must state:

- who owns the contract artifacts
- whether Resident Workforce OS may consume the contract
- whether Resident Workforce OS may run the tests
- whether Resident Workforce OS may vendor tests later if approved
- whether redistribution is prohibited
- whether any third-party license applies

Implementation is blocked until ownership and licensing are acceptable.

## 7. Checksums or Hashes

The intake must record checksums or hashes for every canonical artifact.

Minimum acceptable hash coverage:

- contract manifest
- adapter contract
- invariant specification
- conformance suite files
- security suite files
- synthetic fixtures
- runner instructions
- dependency manifest

Illustrative examples may be hashed if they are used in review, but they must not be treated as canonical unless explicitly classified that way.

## 8. Dependency Inventory

The SYBNB kit must include a dependency inventory.

The intake must identify:

- runtime dependencies
- development dependencies
- test-runner dependencies
- peer dependencies
- minimum Node.js version
- package manager assumptions
- operating system assumptions
- database assumptions
- provider SDK assumptions

Any dependency that would require modifying Resident Workforce OS workspace configuration requires owner approval before implementation.

## 9. Environment Assumptions

The intake must document:

- Node.js version
- package manager and version
- supported operating systems
- test database requirement, if any
- network requirement
- environment variables
- filesystem assumptions
- timezone assumptions
- locale assumptions

The kit must not require production credentials or live provider access for conformance review.

## 10. Test-Runner Requirements

The intake must record:

- test command
- test framework
- fixture loading method
- expected successful output
- expected failure output
- isolation requirements
- whether tests are deterministic
- whether tests require network access
- whether tests require clock control
- whether tests require database access

If test commands are not provided, the contract kit is incomplete.

## 11. Domain-Neutrality Review

The reviewer must confirm that the reusable contract does not depend on domain-specific SYBNB concepts.

Allowed domain-neutral concepts:

- Money
- amountMinor
- currency
- precision
- rounding
- fee resolution interface
- pure allocation
- split validation
- frozen commercial terms
- payment reference
- payout reference
- settlement reference
- reversal reference
- immutable audit
- idempotency
- correlation ID
- normalized error model
- jurisdiction fail-closed behavior

Disallowed dependency concepts:

- Guest
- Host
- Reservation
- Booking
- Lodging tax
- STR cancellation policies
- Host payout semantics
- Production credentials
- Production records
- Personal data

If any disallowed concept is required for the shared contract to run, the kit must be quarantined.

## 12. STR-Specific Exclusion Review

The intake must explicitly confirm that the contract kit does not require:

- guest-to-host settlement terminology
- reservation lifecycle
- booking-specific payment states
- lodging tax calculations
- sales tax calculations
- host payout eligibility
- host commission deductions
- STR cancellation/refund rules
- accommodation-specific refund logic

STR-only implementation examples may be included only if clearly labeled and isolated.

## 13. Synthetic-Fixture Confirmation

All reusable tests must use synthetic fixtures.

The reviewer must confirm:

- no real customers
- no real workers
- no real employers
- no real guests
- no real hosts
- no real bookings
- no real bank references
- no real tax identifiers
- no production provider identifiers
- no production payment IDs

Any non-synthetic fixture blocks implementation.

## 14. Production-Data Exclusion

The kit must not include production data.

Production-data indicators include:

- real account IDs
- real payment references
- real payout references
- real settlement IDs
- real invoices
- real worker records
- real employer records
- real customer records
- real addresses beyond obviously synthetic examples
- real emails
- real phone numbers

If production data is detected, the kit must be rejected or returned to SYBNB for sanitization.

## 15. Personal-Data Exclusion

The kit must not include personal data.

Personal-data indicators include:

- names of real people
- personal emails
- phone numbers
- physical addresses
- bank account details
- government identifiers
- tax identifiers
- health data
- employment records
- payroll records
- support conversations

If personal data is detected, the kit must be quarantined immediately.

## 16. Live-Secret Exclusion

The kit must not include live secrets.

Secret indicators include:

- API keys
- access tokens
- refresh tokens
- private keys
- webhook secrets
- database credentials
- provider credentials
- cloud storage credentials
- signing secrets
- session secrets

If live secrets are detected:

1. quarantine the kit
2. stop intake
3. notify owner
4. require secret rotation by the source owner
5. resume only with sanitized artifacts

## 17. Security-Suite Completeness

The kit must include the canonical S1-S7 security suite or explicitly identify why it is not yet available.

Expected suite areas:

- S1 authorization and tenant isolation
- S2 idempotency and replay protection
- S3 tamper resistance
- S4 secrets and payment-data protection
- S5 immutable audit integrity
- S6 fail-closed jurisdiction and policy behavior
- S7 settlement and reversal safety

If the suite is incomplete, implementation requires owner approval and must be limited to non-money-moving preparation.

## 18. Conformance-Suite Completeness

The conformance suite must prove:

- money value immutability
- amountMinor correctness
- currency consistency
- precision and rounding behavior
- fee resolver behavior
- pure allocation correctness
- frozen-terms behavior
- payment/payout reference behavior
- settlement/reversal reference behavior
- audit metadata preservation
- idempotency behavior
- fail-closed jurisdiction handling
- normalized error behavior

Conformance cannot be claimed until the suite is received and executed.

## 19. Canonical Versus Illustrative Classification

Every artifact must be classified as one of:

- canonical contract
- canonical test
- reusable example
- STR-only implementation
- provisional mapping
- unresolved item

Only canonical contract and canonical test artifacts may define required Resident Workforce OS behavior.

Reusable examples may inform design but must not become hidden requirements.

STR-only implementations must not be imported.

## 20. Quarantine Procedure

Quarantine is required when:

- production credentials are found
- production records are found
- personal data is found
- STR semantics are required by the shared contract
- contract provenance is unclear
- ownership or licensing is unacceptable
- source commit is missing
- contract version is missing
- conformance suite is missing
- security suite is missing without owner waiver
- artifact hashes are inconsistent
- dependencies require unapproved workspace changes

Quarantine actions:

1. stop review
2. record reason
3. isolate artifacts outside implementation paths
4. do not copy into source
5. request corrected kit from SYBNB
6. resume only after owner direction

## 21. Rejection Criteria

Reject the kit when:

- it cannot be made domain-neutral
- ownership or licensing blocks reuse
- production secrets are present and cannot be contained
- production data is present and cannot be sanitized
- personal data is present and cannot be sanitized
- source provenance cannot be established
- canonical contract version cannot be identified
- the kit requires importing STR implementation code
- the kit requires changing Resident Workforce OS architecture before an ACR

Rejected artifacts must not be used for implementation.

## 22. Owner Approval Gate

Owner approval is required before any implementation begins.

The owner must approve:

- artifact inventory
- contract version
- source commit
- source tag or tag absence
- ownership and licensing
- checksum record
- conformance-suite completeness
- security-suite completeness
- domain-neutrality result
- STR exclusion result
- HR traceability matrix
- implementation gate outcome

## 23. Intake Outcome Values

Allowed outcomes:

- `ACCEPTED`
- `ACCEPTED WITH NON-BLOCKING GAPS`
- `QUARANTINED`
- `REJECTED`
- `OWNER DECISION REQUIRED`

Implementation is prohibited under:

- `QUARANTINED`
- `REJECTED`
- `OWNER DECISION REQUIRED`

Implementation is also prohibited under `ACCEPTED WITH NON-BLOCKING GAPS` unless the owner explicitly authorizes the first implementation item.

## 24. Validation

This checklist is documentation only.

It creates no code, schema, migration, permission, API, service, test, Payroll, Finance, Payment Execution, provider integration, banking integration, escrow logic, push, merge, or deployment.

## Final Status

SHARED MONEY CONTRACT INTAKE CHECKLIST READY FOR OWNER REVIEW
