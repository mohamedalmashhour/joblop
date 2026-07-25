# Resident Job Worker Offer Engine Baseline

Status: APPROVED AND FROZEN

This document freezes the accepted Worker Offer Foundation. Any future change to the Worker Offer schema, permissions, lifecycle, audit model, privacy boundary, capacity rule, expiry rule, or API capability requires an Architecture Change Request.

## 1. Accepted Commits

Accepted implementation commits:

- `9f84469` - `feat(database): add worker offer foundation schema`
- `cf67758` - `feat(authz): add worker offer permissions`
- `372d100` - `feat(worker-offer): implement worker offer lifecycle`
- `adcdf3a` - `test(worker-offer): validate worker offer boundaries`
- `34521c1` - `docs(resident-job): worker offer foundation report`

## 2. Operating Boundary

Worker Offer belongs to Dispatch.

Worker Offer is the governed proposal sent to a specific worker after authorized Dispatch preparation. It is not the final operational commitment.

Canonical boundary:

```text
Job Request
-> Dispatch
-> Worker Offer
-> Accepted Worker Offer
-> future Assignment transaction
-> Attendance
```

Required clarifications:

- Worker Offer belongs to Dispatch.
- Accepted Worker Offer is NOT Assignment.
- Assignment is created only by a future authoritative transaction.
- Worker Offer cannot create attendance, timesheets, payroll, invoices, payments, notifications, reporting, or AI execution.

## 3. Accepted Entities

Frozen Worker Offer entities:

- `WorkerIdentity`
- `WorkerOffer`
- `WorkerOfferTermsVersion`
- `WorkerOfferDeliveryAttempt`
- `WorkerOfferResponse`

`WorkerIdentity` is a minimal authentication-linked worker account boundary. It exists so a Worker Offer can be addressed to an authenticated worker identity without introducing the full WorkerProfile, employment profile, credential profile, payroll profile, or availability engine.

`WorkerOffer` is the governed offer record tied to Dispatch, Job Request, employer organization, residence, department, and worker identity.

`WorkerOfferTermsVersion` preserves immutable worker-visible terms. The accepted terms version is the only terms version a worker may accept.

`WorkerOfferDeliveryAttempt` records abstract delivery attempts only. It does not integrate with email, SMS, push, or notification providers.

`WorkerOfferResponse` records a worker's explicit accept or decline response. It does not create Assignment.

## 4. Lifecycle

Frozen Worker Offer states:

- `draft`
- `approved`
- `sent`
- `delivered`
- `viewed`
- `accepted`
- `declined`
- `expired`
- `withdrawn`
- `cancelled`

Approved lifecycle:

```text
draft
-> approved
-> sent
-> delivered or viewed
-> accepted or declined
```

Administrative and terminal outcomes:

```text
expired
withdrawn
cancelled
```

Lifecycle rules:

- Invalid transitions are rejected.
- Accepted offers are terminal for Worker Offer purposes.
- Declined, expired, withdrawn, and cancelled offers cannot be accepted.
- Viewed does not mean accepted.
- Delivered does not mean viewed.
- Sent does not mean delivered.
- Accepted Worker Offer remains separate from Assignment.

## 5. Permissions

Frozen active permissions:

- `worker_offer.create`
- `worker_offer.read`
- `worker_offer.approve`
- `worker_offer.send`
- `worker_offer.withdraw`
- `worker_offer.cancel`
- `worker_offer.audit_read`
- `worker_offer.respond`

Frozen reserved permission:

- `worker_offer.supervise`

Approved access boundary:

- `PLATFORM_ADMINISTRATOR` may manage Worker Offers.
- `DISPATCHER` may manage Worker Offers inside the dispatch boundary.
- `WORKER_ACCESS` may respond only to the worker's own offer.
- No active role receives `worker_offer.supervise`.

## 6. WorkerIdentity Boundary

`WorkerIdentity` may store only:

- linked `User`
- display name
- preferred language
- active/inactive/closed lifecycle status
- timestamps
- version

`WorkerIdentity` must not store:

- employment history
- qualifications
- licences
- certifications
- banking
- tax identifiers
- payroll details
- availability
- address
- health information
- background-check details
- protected characteristics

Future WorkerProfile expansion must not overload `WorkerIdentity` into a personnel record.

## 7. Worker-Visible Terms

Worker-visible terms are stored through `WorkerOfferTermsVersion`.

Allowed worker-visible terms:

- worker-facing title
- worker-facing description
- start time
- end time
- timezone
- work group reference
- role definition reference
- responsibility summary
- compensation summary
- policy summary

Worker-visible terms must not expose:

- employer billing
- platform margin
- employer payment method
- other workers
- internal candidate ranking
- internal dispatch notes
- protected worker information
- payroll calculations
- final payment guarantees

Compensation text remains informational until later payroll and payable engines exist.

## 8. Employer Visibility

Employer-visible Worker Offer information is limited to operational offer status and governed worker-facing terms.

Employers may see:

- offer status
- offer deadline
- worker-visible role/schedule summary
- whether the offer is awaiting response
- whether the offer was accepted, declined, expired, withdrawn, or cancelled
- safe audit summary where authorized

Employers must not see:

- private worker data
- banking details
- tax identifiers
- health information
- protected characteristics
- internal AI ranking
- internal candidate notes
- other candidates' private information
- notification-provider secrets

## 9. Dispatch Relationship

Worker Offer creation requires an existing `DispatchReview` in `offer_preparation`.

Dispatch remains upstream:

- Dispatch reviews candidates.
- Dispatch prepares offer context.
- Worker Offer sends terms to a specific worker.
- Worker response closes the Worker Offer decision.
- Assignment remains a future downstream transaction.

DispatchCandidate is not WorkerOffer. Shortlisted candidate is not offer recipient. Offer recipient is not assigned worker.

## 10. API Capability Map

Frozen platform API capabilities:

- create Worker Offer
- list Worker Offers
- read Worker Offer
- approve Worker Offer
- send Worker Offer
- withdraw Worker Offer
- cancel Worker Offer
- read Worker Offer audit summary

Frozen worker API capabilities:

- read own Worker Offer
- accept own Worker Offer
- decline own Worker Offer

Explicitly absent:

- Assignment API
- Attendance API
- Worker Calendar API
- notification-provider API
- payroll API
- finance API
- AI execution API

## 11. Audit Model

Frozen audit event categories:

- offer created
- terms version created
- approved
- sent
- delivery attempted
- delivered
- viewed
- accepted
- declined
- expired
- withdrawn
- cancelled
- response rejected
- permission denied

Audit records conceptually preserve:

- actor
- timestamp
- correlation ID
- prior state
- new state
- source context
- safe reason category where applicable

Audit must never expose secrets, protected information, payroll data, banking data, tax data, health data, or internal security material.

## 12. Concurrency Rules

Frozen concurrency controls:

- lifecycle updates require current version checks
- stale terms cannot be accepted
- duplicate worker response is rejected or treated safely according to the service boundary
- active offer capacity is checked before offer creation
- state transitions preserve prior state and new state for audit

Concurrency does not authorize automatic Assignment creation.

## 13. Expiry Model

Expiry is server-authoritative.

UI timers, client clocks, notification delivery time, and worker device time cannot determine authoritative expiry.

Expired offers cannot be accepted. Future reissue requires a new governed offer or a future approved reissue workflow.

## 14. Capacity Enforcement

Worker Offer capacity is limited by Dispatch remaining worker count.

Maximum active offers must not exceed remaining worker count.

Active capacity states:

- `draft`
- `approved`
- `sent`
- `delivered`
- `viewed`
- `accepted`

Capacity enforcement prevents over-offering but does not create Assignment.

## 15. Terms Versioning

Worker Offer terms are immutable once versioned.

Worker acceptance requires the current terms version. Stale terms acceptance is rejected.

Changing material terms requires a new terms version and governed lifecycle handling. Terms versioning must preserve worker consent evidence.

## 16. Validation Summary

Accepted validation:

- Prisma schema format: PASS
- Prisma schema validation: PASS
- Prisma Client generation: PASS
- focused auth/API/database tests: PASS, 97 tests
- repository typecheck: PASS
- repository lint: PASS
- repository tests: PASS, 56 files / 331 tests
- repository build: PASS
- environment validation: PASS
- boundary validation: PASS
- secret scan: PASS
- `git diff --check`: PASS

Migration validation:

- Direct SQL application of foundation, dispatch, and worker-offer migrations succeeded against the disposable local validation database.
- A later Prisma `migrate deploy` retry was blocked by sandbox localhost PostgreSQL restrictions. This is recorded as environment-limited validation, not a schema or migration SQL defect.

## 17. Architecture Change Request Requirement

The Worker Offer Foundation is frozen.

An Architecture Change Request is required to change:

- Worker Offer entity design
- WorkerIdentity boundary
- Worker Offer lifecycle states
- Worker Offer permissions
- worker response rules
- dispatch relationship
- expiry behavior
- capacity enforcement
- terms versioning
- delivery-attempt model
- audit model
- privacy boundary
- API capability map

No implementation may silently convert Accepted Worker Offer into Assignment.
