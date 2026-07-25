# Resident Job Dispatch Engine Baseline

Status: APPROVED AND FROZEN

Accepted baseline commit: `468bd2b`

## 1. Purpose

The Dispatch Engine baseline freezes the accepted operational dispatch foundation for Resident Job. Dispatch begins only after a Job Request has reached the approved-for-dispatch boundary. Its responsibility is to support human dispatch review, candidate-source evaluation summaries, manual shortlist governance, and preparation for a future Worker Offer workflow.

Dispatch is not worker offer execution, assignment, worker acceptance, attendance, payroll, invoice, payment, notification delivery, reporting, or AI execution.

## 2. Accepted Schema Entities

Accepted entities:

- `DispatchReview`
- `DispatchCandidate`

`DispatchReview` is an operational child of `JobRequest`.

`JobRequest` remains the commercial and operational source of truth.

`DispatchCandidate` is not a Worker Offer. It is an evaluation-summary record for a candidate reference inside a DispatchReview.

Deferred entities remain absent:

- `WorkerOffer`
- `Assignment`
- `WorkerCalendarEntry`
- `DispatchAttempt`
- `ReplacementDispatchLink`
- full `CandidateEvaluation`
- attendance, timesheet, finance, notification, AI execution, and reporting entities

## 3. Accepted States

DispatchReview states:

- `draft`
- `active`
- `candidate_review`
- `shortlist_ready`
- `offer_preparation`
- `paused`
- `cancelled`
- `closed`

Non-terminal states:

- `draft`
- `active`
- `candidate_review`
- `shortlist_ready`
- `offer_preparation`
- `paused`

Terminal states:

- `cancelled`
- `closed`

One non-terminal `DispatchReview` per `JobRequest` is the current Phase 01 rule.

## 4. Accepted Permissions

Active dispatch permissions:

- `dispatch.create`
- `dispatch.read`
- `dispatch.review_candidates`
- `dispatch.manage_shortlist`
- `dispatch.pause`
- `dispatch.resume`
- `dispatch.cancel`
- `dispatch.close`
- `dispatch.prepare_offer`
- `dispatch.audit_read`

Reserved permission:

- `dispatch.supervise`

`dispatch.supervise` is not assigned to an active role in this baseline.

## 5. Dispatcher Access-Role Boundary

`DISPATCHER` is an active platform access role with the approved dispatch permissions only.

`DISPATCHER` may:

- create and read dispatch reviews
- run candidate review against the approved candidate-source boundary
- manage the manual shortlist
- pause, resume, cancel, and close dispatch reviews
- move dispatch to the offer-preparation boundary
- read dispatch audit summaries

`DISPATCHER` may not:

- use `platform.supervise`
- use reserved `dispatch.supervise`
- create WorkerOffers
- create Assignments
- contact workers automatically
- modify JobRequest commercial terms
- approve attendance
- calculate payroll
- issue invoices
- execute payments
- run AI as an authoritative decision maker

Organization roles and Worker Access do not gain dispatch authority.

## 6. Job Request Relationship

DispatchReview is created from a valid `JobRequest` that has reached `approved_for_dispatch`.

The DispatchReview copies operational references from JobRequest:

- employer organization
- residence
- department
- WorkGroup
- RoleDefinition
- urgency
- required worker count

Dispatch does not replace JobRequest. JobRequest remains the source for commercial demand and approved request context.

## 7. CandidateSource Boundary

`CandidateSource` is an interface only.

Default runtime behavior when no approved candidate source exists:

- return `candidate_source_unavailable`

The foundation does not introduce:

- WorkerProfile schema
- AI candidate engine
- external staffing integration
- worker search persistence
- candidate scoring persistence beyond approved summary states

## 8. Candidate Privacy Rules

DispatchCandidate may store only approved summary information:

- candidate source type
- candidate source reference
- approved display name
- WorkGroup match
- RoleDefinition match
- qualification summary state
- verification summary state
- availability state
- schedule conflict state
- service-area state
- travel-suitability state
- transport-constraint state
- recommendation state
- shortlist state
- source freshness
- last evaluated time
- evaluation version

DispatchCandidate must not store or expose:

- home address
- banking information
- tax information
- government ID
- health information
- protected characteristics
- complaints
- investigations
- employer price
- platform margin
- other candidates' private details

## 9. Candidate Evaluation States

Accepted summary-state categories include:

- match state
- qualification summary state
- verification summary state
- availability state
- conflict state
- service-area state
- travel state
- transport state
- recommendation state
- shortlist state

These are summaries only. They do not prove final eligibility, create offers, create assignments, or make disciplinary conclusions.

## 10. Shortlist Rules

Manual shortlist behavior is accepted.

Rules:

- Shortlist entries are human-managed.
- A candidate on a shortlist is not an offer recipient until a future Worker Offer is created.
- `shortlist_ready` does not mean an offer was sent.
- Shortlist reorder is auditable.
- Candidate removal preserves history.
- Prepared offer count is a boundary counter only and does not create WorkerOffer records.
- Remaining worker count is informational within Dispatch until future Worker Offer and Assignment engines exist.

## 11. Employer Visibility

Employer visibility is high-level and read-only.

Employers may see:

- dispatch state
- required worker count
- shortlisted candidate count
- prepared offer count
- remaining worker count
- last updated timestamp

Employers must not see:

- candidate source references
- internal candidate evaluation states
- internal shortlist ordering logic
- internal platform notes
- AI confidence
- worker private data
- other workers' information

Worker sees nothing before a Worker Offer is sent.

## 12. API Capabilities

Accepted API capability boundary:

- Create Dispatch
- Read Dispatch
- List Dispatches
- Assign/change operational owner
- Start Candidate Review
- Search Candidates
- Evaluate Candidate
- Add Candidate to Shortlist
- Remove Candidate from Shortlist
- Reorder Shortlist
- Mark Shortlist Ready
- Move to Offer Preparation
- Pause
- Resume
- Cancel
- Close
- Read Dispatch audit summary
- Employer high-level dispatch status read-only

The API does not create WorkerOffers, Assignments, notifications, calendar entries, attendance, finance records, or AI execution records.

## 13. Audit Events

Accepted dispatch audit events:

- dispatch created
- owner changed
- candidate review started
- candidate source unavailable
- candidate evaluated
- candidate shortlisted
- candidate removed
- shortlist reordered
- shortlist ready
- offer preparation
- paused
- resumed
- cancelled
- closed
- access denied

Policy version:

- `dispatch-foundation-v1`

## 14. Concurrency Rules

Accepted concurrency controls:

- optimistic version checking on DispatchReview updates
- candidate uniqueness within a DispatchReview by candidate source reference
- one non-terminal DispatchReview per JobRequest
- terminal DispatchReview history is preserved
- stale transition attempts are rejected safely

Replacement later creates a new DispatchReview and preserves prior history.

## 15. Known Limitations

Known limitations:

- No live WorkerProfile or worker identity source exists yet.
- Default CandidateSource returns `candidate_source_unavailable`.
- No WorkerOffer records exist.
- No worker notification or delivery state exists.
- No Assignment or calendar commitment exists.
- No live PostgreSQL migration deploy was run inside the Codex sandbox because local socket access is blocked there.

No schema defect was identified by Prisma validation.

## 16. Deferred Worker Offer Behavior

Offer Preparation does not create:

- WorkerOffer
- Worker Calendar
- Assignment
- notification
- worker acceptance

`DispatchCandidate` is not a Worker Offer.

`shortlist_ready` does not mean an offer was sent.

Worker Offer requires a future approved architecture and implementation phase.

## 17. Accepted Commits

Accepted commits:

- `be1d775` - `feat(database): add dispatch foundation schema`
- `c7d5802` - `feat(authz): add dispatch permissions and dispatcher role`
- `18bf79d` - `feat(dispatch): implement dispatch lifecycle and candidate boundary`
- `00fbe93` - `test(dispatch): validate dispatch lifecycle privacy and isolation`
- `468bd2b` - `docs(resident-job): dispatch foundation report`

These commits must not be amended, squashed, pushed, merged, or deployed without explicit owner authorization.

## 18. Tests And Validation

Accepted validation:

- Prisma schema validation: pass
- Prisma Client generation: pass
- repository typecheck: pass
- repository lint: pass
- repository tests: pass
- environment validation: pass
- boundary validation: pass
- secret scan: pass
- repository build: pass
- `git diff --check`: pass

Test counts from accepted report:

- `@rwos/auth`: 57 tests passed
- `@rwos/api`: 23 tests passed
- full repository: 56 files / 327 tests passed

Environment-limited item:

- live PostgreSQL migration deploy from Codex sandbox blocked by local socket restrictions

## 19. Change-Control Rule

Dispatch schema, permissions, lifecycle, API boundary, privacy rules, and audit model may not be materially changed without an approved Architecture Change Request.

AI remains advisory and cannot create authoritative Dispatch state.

Any future change that affects user-visible design must also follow the Design Change Request process where applicable. No governance path silently authorizes another.
