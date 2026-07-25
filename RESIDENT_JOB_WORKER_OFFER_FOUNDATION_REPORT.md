# Resident Job Worker Offer Foundation Report

## Verdict

WORKER OFFER FOUNDATION READY FOR OWNER REVIEW

## Scope

Implemented the approved Worker Offer Foundation only. Assignment, Worker Calendar, Attendance, Payroll, Finance, notification providers, WorkerProfile, and worker analytics remain deferred.

## Schema

Added normalized Phase 01 entities:

- `WorkerIdentity`
- `WorkerOffer`
- `WorkerOfferTermsVersion`
- `WorkerOfferDeliveryAttempt`
- `WorkerOfferResponse`

`WorkerIdentity` is a minimal authentication-linked worker account boundary. It stores only user reference, display name, preferred language, active lifecycle status, timestamps, and version. It does not store employment history, qualifications, banking, tax, payroll, availability, address, health, licences, or background-check data.

`WorkerOfferTermsVersion` stores immutable worker-visible terms and is referenced by `WorkerOffer.currentTermsVersionId`. Commercial pricing is not duplicated; compensation text is worker-facing and informational only.

## Permissions

Added active permissions:

- `worker_offer.create`
- `worker_offer.read`
- `worker_offer.approve`
- `worker_offer.send`
- `worker_offer.withdraw`
- `worker_offer.cancel`
- `worker_offer.audit_read`
- `worker_offer.respond`

Reserved:

- `worker_offer.supervise`

`PLATFORM_ADMINISTRATOR` and `DISPATCHER` may manage Worker Offers. `WORKER_ACCESS` may only respond to the worker's own offer.

## Lifecycle

Approved states only:

`draft -> approved -> sent -> delivered/viewed -> accepted/declined`

Terminal and administrative states:

`expired`, `withdrawn`, `cancelled`

Invalid transitions are rejected. Optimistic concurrency is required on lifecycle updates. Accepted Worker Offer remains separate from Assignment.

## Dispatch Relationship

Worker Offer creation requires an existing `DispatchReview` in `offer_preparation`. Dispatch remains upstream and does not create offers automatically. The service enforces maximum active offers equal to the dispatch remaining worker count.

## Delivery Boundary

Delivery attempts support:

- `pending`
- `attempted`
- `delivered`
- `failed`

The implementation records abstract delivery attempts only. No email, SMS, push, or provider integration was added.

## Worker Response

Workers can accept or decline only their own offer. The response path rejects:

- duplicate responses
- expired offers
- withdrawn offers
- cancelled offers
- stale terms
- non-owned offers

Response requires authenticated `WorkerIdentity`.

## Employer Visibility

The API exposes Worker Offer status and worker-visible terms. It does not expose worker banking, payroll, tax, health, protected information, internal candidate ranking, or internal dispatch notes.

## Audit

Implemented audit hooks for:

- offer created
- terms version created
- approved
- sent
- delivery attempted
- viewed
- accepted
- declined
- expired
- withdrawn
- cancelled
- response rejected
- permission denied

Every audit event carries actor, timestamp, correlation id, prior state, new state, and source context.

## API Surface

Implemented only the approved endpoints:

- `POST /platform/worker-offers`
- `GET /platform/worker-offers`
- `GET /platform/worker-offers/:workerOfferId`
- `POST /platform/worker-offers/:workerOfferId/approve`
- `POST /platform/worker-offers/:workerOfferId/send`
- `POST /platform/worker-offers/:workerOfferId/withdraw`
- `POST /platform/worker-offers/:workerOfferId/cancel`
- `GET /platform/worker-offers/:workerOfferId/audit`
- `GET /worker/offers/:workerOfferId`
- `POST /worker/offers/:workerOfferId/accept`
- `POST /worker/offers/:workerOfferId/decline`

No Assignment API was created.

## Validation

Passed:

- Prisma schema format
- Prisma schema validation
- Prisma Client generation
- focused auth/API/database tests: 97 tests
- repository typecheck
- repository lint
- repository tests: 56 files / 331 tests
- repository build
- environment validation
- boundary validation
- secret scan
- `git diff --check`

Migration validation:

- Direct SQL application of the foundation, dispatch, and worker-offer migrations succeeded against the disposable local validation database.
- A later Prisma `migrate deploy` retry was blocked by a sandbox localhost PostgreSQL restriction (`Operation not permitted`). This is recorded as environment-limited validation, not a schema or migration SQL defect.

## Deferred Work

Deferred by owner instruction:

- Assignment
- Worker Calendar
- Attendance
- Timesheets
- Payroll
- Finance
- production notification providers
- full WorkerProfile
- external identity-provider changes
- AI automation

## Risks

- Future Assignment must consume accepted Worker Offers without treating acceptance as assignment creation.
- Future notification integration must attach to delivery attempts without letting provider success create workflow state.
- Future WorkerProfile must extend worker data without turning `WorkerIdentity` into a personnel record.

## Readiness

The Worker Offer Foundation is ready for owner review. Assignment implementation has not begun.
