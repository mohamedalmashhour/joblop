# Resident Job SYBNB Contract Artifact Request

Status: READY FOR OWNER REVIEW

This document is the exact handoff request for the SYBNB agent to prepare the portable shared Money Engine contract kit for Resident Workforce OS review.

This request does not authorize code copying, package extraction, shared repository coupling, test vendoring, schema changes, migrations, APIs, services, Payroll implementation, Finance implementation, Payment Execution, provider integration, push, merge, or deployment.

## 1. Request Summary

Please provide the canonical SYBNB Money Engine contract kit for contract-first adoption by Resident Workforce OS.

Resident Workforce OS will use the contract kit to evaluate domain-neutral reuse only.

Resident Workforce OS will not reuse STR-specific semantics, STR payment workflows, reservation logic, guest/host language, lodging tax logic, sales tax logic, booking lifecycle, host payout semantics, or STR cancellation rules.

## 2. Required Artifact Labeling

Label each delivered artifact as exactly one of:

- `canonical contract`
- `canonical test`
- `reusable example`
- `STR-only implementation`
- `provisional mapping`
- `unresolved item`

Only `canonical contract` and `canonical test` artifacts may define required reusable behavior.

`STR-only implementation` artifacts must be isolated and must not be required to execute the reusable contract.

## 3. Contract Manifest

Provide a contract manifest containing:

- artifact name
- artifact path
- artifact label
- artifact purpose
- contract version
- source commit
- source tag or tag-absence explanation
- checksum or hash
- dependency requirements
- whether artifact is required for conformance
- whether artifact is required for security validation
- whether artifact includes any STR-only semantics

## 4. Contract Version

Provide:

- canonical contract version
- versioning policy
- compatibility policy
- breaking-change policy
- deprecation policy
- release notes if available
- mapping to source commit
- mapping to source tag if available

## 5. Source Commit

Provide the exact source commit used to produce the contract kit.

The source commit must identify:

- repository
- branch or release source
- commit hash
- commit date
- whether the working tree was clean when artifacts were prepared
- whether generated artifacts are reproducible from that commit

## 6. Source Tag

Provide:

- source tag
- tag target commit
- whether tag is signed
- whether tag represents the contract version

If no tag exists, explain why and identify the replacement provenance control.

## 7. Isolation Specification

Provide an isolation specification that explains:

- which artifacts are domain-neutral
- which artifacts are STR-only
- which artifacts are illustrative only
- which artifacts must not be imported
- whether the contract can run without STR application services
- whether tests can run without STR database records
- whether tests can run without live provider credentials
- whether tests can run without network access

## 8. Adapter Contract

Provide the canonical adapter contract.

The contract should define:

- required adapter capabilities
- required inputs
- required outputs
- failure behavior
- idempotency behavior
- audit context
- privacy constraints
- prohibited adapter behavior
- required conformance tests
- required security tests

Resident Workforce OS expects to supply its own HR adapter.

## 9. Money Value-Object Rules

Provide rules for:

- Money immutability
- integer `amountMinor`
- currency code
- precision
- scale
- rounding mode
- comparison
- addition
- subtraction
- multiplication
- allocation
- serialization
- validation
- error handling

Confirm no floating point money arithmetic is required.

## 10. amountMinor and Currency Rules

Provide:

- allowed currency code format
- minor-unit handling
- zero amount handling
- negative amount handling
- mixed-currency behavior
- unsupported-currency behavior
- currency mismatch errors

Resident Workforce OS requires mixed-currency calculations to fail closed unless FX is separately approved.

## 11. Precision and Rounding Rules

Provide:

- precision model
- rounding modes
- rounding sequence
- allocation remainder handling
- deterministic behavior requirements
- examples
- conformance fixtures

## 12. Fee Resolver Specification

Provide:

- fee resolver interface
- input structure
- output structure
- policy versioning
- frozen-terms dependency
- failure behavior
- deterministic explanation requirements

The fee resolver must remain domain-neutral and must not require host commission, reservation, lodging tax, or STR cancellation logic.

## 13. Pure Allocation and Split Invariants

Provide:

- allocation contract
- split contract
- invariant list
- remainder strategy
- deterministic ordering rules
- validation failures
- conformance fixtures

## 14. Frozen-Terms Specification

Provide:

- terms snapshot structure
- version requirements
- immutability rules
- effective-date rules
- stale terms behavior
- missing terms behavior
- audit references

## 15. Payment Contract

Provide the domain-neutral Payment reference contract.

The contract must distinguish:

- payment reference
- payment instruction
- payment execution
- payment settlement
- payment failure

Resident Workforce OS will not implement Payment Execution during intake.

## 16. Payout Contract

Provide the domain-neutral Payout reference contract.

The contract must not depend on host payout semantics.

It must distinguish:

- payout reference
- payout eligibility
- payout instruction
- payout execution
- payout settlement
- payout failure

## 17. Settlement-Reference Contract

Provide:

- settlement reference structure
- settlement evidence requirements
- provider reference boundary
- partial settlement behavior
- pending settlement behavior
- settlement failure behavior

Confirm settlement reference does not itself prove settlement without provider evidence.

## 18. Reversal-Reference Contract

Provide:

- reversal reference structure
- reversal eligibility
- reversal instruction boundary
- reversal execution boundary
- reversal evidence
- partial reversal behavior
- audit requirements

## 19. Immutable-Audit Contract

Provide:

- monetary audit event structure
- correlation ID requirements
- idempotency key requirements
- actor reference requirements
- policy version requirements
- source record references
- before/after value constraints
- tamper-resistance expectations
- retention expectations

## 20. Idempotency Requirements

Provide:

- idempotency key format
- idempotency scope
- retry behavior
- duplicate detection
- replay rejection
- conflict behavior
- audit behavior

## 21. Fail-Closed Jurisdiction Rules

Provide:

- jurisdiction identifier format
- supported jurisdiction behavior
- unsupported jurisdiction behavior
- missing jurisdiction behavior
- suspended jurisdiction behavior
- policy unavailable behavior
- test fixtures

Resident Workforce OS requires unsupported payroll jurisdictions to fail closed.

## 22. Normalized Error Model

Provide:

- error codes
- error categories
- safe external messages
- internal diagnostic fields
- retryable versus non-retryable markers
- audit behavior
- privacy constraints

## 23. Canonical Conformance Suite

Provide the canonical conformance suite with:

- runner instructions
- fixture list
- expected outputs
- failure meanings
- deterministic test behavior
- domain-neutral fixtures
- STR-equivalence boundaries

The conformance suite must not require production secrets, production records, or personal data.

## 24. Canonical S1-S7 Security Suite

Provide the canonical security suite covering:

- S1 authorization and tenant isolation
- S2 idempotency and replay protection
- S3 tamper resistance
- S4 secrets and payment-data protection
- S5 immutable audit integrity
- S6 fail-closed jurisdiction and policy behavior
- S7 settlement and reversal safety

If any suite section is incomplete, label it as `unresolved item`.

## 25. Synthetic Fixtures

Provide synthetic fixtures only.

Fixtures must not include:

- real people
- real employers
- real workers
- real guests
- real hosts
- real bookings
- real payment references
- real bank references
- real tax identifiers
- real credentials

## 26. Runner Instructions

Provide:

- exact install command, if needed
- exact test command
- environment variables required
- fixture setup
- expected success output
- expected failure output
- cleanup instructions

Runner instructions must not require live provider credentials.

## 27. Dependency Manifest

Provide:

- runtime dependencies
- test dependencies
- peer dependencies
- Node.js version
- package-manager assumptions
- operating-system assumptions
- database assumptions, if any
- network assumptions

## 28. Environment Requirements

Provide:

- required Node.js version
- package manager version
- supported platforms
- timezone assumptions
- locale assumptions
- file-system assumptions
- whether network is required
- whether database is required

## 29. Known Limitations

Document:

- unsupported currencies
- unsupported jurisdictions
- unsupported rounding cases
- unsupported settlement states
- known provider-specific assumptions
- known STR-only limitations
- known test gaps
- known security-suite gaps

## 30. STR-Only Exclusions

Explicitly list artifacts or concepts that are STR-only, including:

- guest
- host
- reservation
- booking
- lodging tax
- sales tax logic
- reservation cancellation rules
- accommodation refund logic
- host payout eligibility
- host payout semantics
- booking-specific settlement states

## 31. Ownership or Licensing Confirmation

Provide:

- owner of the contract kit
- reuse permission for Resident Workforce OS
- test execution permission
- vendoring permission, if any
- redistribution restrictions
- third-party license obligations

## 32. Required Delivery Format

Preferred delivery:

- single manifest
- canonical contract files
- canonical test files
- synthetic fixtures
- security suite
- runner instructions
- dependency manifest
- hashes/checksums

Do not include production `.env` files, provider credentials, database dumps, or personal records.

## 33. Final Handoff Statement Required

Please include this statement or identify why it cannot be made:

```text
The provided SYBNB Money Engine contract kit is intended for domain-neutral contract-first adoption. It contains no production secrets, no production records, no personal data, and no required dependency on Guest, Host, Reservation, Booking, Lodging tax, STR cancellation policies, or Host payout semantics.
```

## Final Status

SYBNB CONTRACT ARTIFACT REQUEST READY FOR OWNER REVIEW
