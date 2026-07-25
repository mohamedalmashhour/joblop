# Resident Job Dispatch Foundation Schema Proposal

Status: OWNER DECISION REQUIRED

Reason for stop: the approved Phase 01 schema does not contain Dispatch entities, and the Phase 01 migration explicitly defers dispatch, worker offers, assignments, attendance, timesheets, invoices, payments, notifications, support, reporting, AI recommendation, payroll, and worker payable tables. Existing permissions also do not include Dispatch capabilities.

No schema, migration, permission catalogue, API, service, repository, frontend, AI, notification, or workflow implementation has been created in this proposal task.

## 1. Objective

Define the smallest backend foundation required to implement Dispatch as an admin-governed operational process that turns an `approved_for_dispatch` Job Request into candidate-selection activity.

Canonical boundary:

Job Request -> Dispatch Review -> Candidate Search -> Candidate Evaluation -> Worker Offer Preparation -> Worker Offer boundary

This proposal stops before Worker Offer, Assignment, Attendance, Timesheets, Finance, Notifications, AI production matching, or Reporting.

## 2. Required Architecture Boundary

Dispatch must:

- reference the originating Job Request
- inherit organization, residence, department, WorkGroup, and RoleDefinition from that Job Request
- be owned by authorized platform operations staff
- preserve Job Request as the source of staffing demand
- stop at `offer_preparation`
- avoid creating WorkerOffer or Assignment records

Dispatch must not:

- send offers
- simulate worker acceptance
- assign workers
- place jobs on worker calendars
- approve attendance
- calculate finance
- notify workers
- run production AI matching

## 3. Proposed Enum: DispatchReviewStatus

Required values:

- `draft`
- `active`
- `candidate_review`
- `shortlist_ready`
- `offer_preparation`
- `paused`
- `cancelled`
- `closed`

Excluded values:

- `offer_sent`
- `worker_accepted`
- `assigned`
- `in_progress`
- `completed`

## 4. Proposed Enum: DispatchCandidateStatus

Required values:

- `visible`
- `evaluated`
- `eligible`
- `recommended`
- `shortlisted`
- `removed`
- `stale`
- `ineligible`

Boundary clarifications:

- Visible Candidate != Eligible Candidate
- Eligible Candidate != Recommended Candidate
- Recommended Candidate != Shortlisted Candidate
- Shortlisted Candidate != Worker Offer

## 5. Proposed Enum: DispatchCandidateSource

Required values:

- `manual_search`
- `future_ai_recommendation`
- `future_replacement_flow`

The `future_ai_recommendation` value is only a source marker. It does not authorize production AI, automated ranking, automatic shortlisting, or hidden candidate decisions.

## 6. Proposed Entity: DispatchReview

Purpose: authoritative Dispatch process record for one approved Job Request.

Required fields:

- `id`
- `jobRequestId`
- `organizationId`
- `residenceId`
- `departmentId`
- `workGroupId`
- `roleDefinitionId`
- `status`
- `ownerUserId`
- `createdByUserId`
- `updatedByUserId`
- `pausedReason`
- `cancelledReason`
- `closedReason`
- `version`
- `createdAt`
- `updatedAt`
- `candidateReviewStartedAt`
- `shortlistReadyAt`
- `offerPreparationAt`
- `pausedAt`
- `cancelledAt`
- `closedAt`

Required relationships:

- DispatchReview -> JobRequest
- DispatchReview -> EmployerOrganization
- DispatchReview -> Residence
- DispatchReview -> Department
- DispatchReview -> WorkGroup
- DispatchReview -> RoleDefinition
- DispatchReview -> User as owner
- DispatchReview -> User as createdBy
- DispatchReview -> User as updatedBy
- DispatchReview -> DispatchCandidate[]

Required constraints:

- one active non-terminal DispatchReview per JobRequest
- JobRequest must be `approved_for_dispatch` before DispatchReview creation
- `version` supports optimistic concurrency

Terminal states:

- `cancelled`
- `closed`

Non-terminal states:

- `draft`
- `active`
- `candidate_review`
- `shortlist_ready`
- `offer_preparation`
- `paused`

## 7. Proposed Entity: DispatchCandidate

Purpose: safe candidate summary attached to a DispatchReview.

Required fields:

- `id`
- `dispatchReviewId`
- `workerUserId`
- `workerPublicReference`
- `approvedDisplayName`
- `roleMatchSummary`
- `workGroupMatchSummary`
- `qualificationSummaryState`
- `verificationState`
- `availabilityState`
- `scheduleConflictState`
- `serviceAreaState`
- `travelSuitabilityState`
- `reliabilitySummaryState`
- `sourceFreshness`
- `evaluationStatus`
- `source`
- `isShortlisted`
- `shortlistReason`
- `removedReason`
- `evaluatedByUserId`
- `shortlistedByUserId`
- `removedByUserId`
- `createdAt`
- `updatedAt`
- `evaluatedAt`
- `shortlistedAt`
- `removedAt`
- `version`

Required constraints:

- one candidate row per `dispatchReviewId` + `workerUserId`
- candidate rows store safe operational summaries only
- no protected personal data
- no banking, tax, government ID, home address, health, complaint, investigation, employer rate, or platform margin fields

Dependency note: full WorkerProfile persistence is not available yet. `workerUserId` references the existing User identity boundary, while operational candidate summaries remain governed snapshots until a Worker Profile foundation is approved.

## 8. Proposed Entity: DispatchAttempt Boundary

Recommendation: defer a full `DispatchAttempt` entity until Replacement or Worker Offer phases require multiple attempts per Job Request.

For Phase 01 Dispatch Foundation, use one `DispatchReview` per active dispatch boundary and terminal close/cancel states. If replacement later requires multiple attempts, introduce a separate ACR-backed entity rather than overloading DispatchReview.

## 9. Replacement Linkage Boundary

Recommendation: defer replacement linkage.

Reason: Replacement Engine and Worker Offer/Assignment entities are not implemented in this phase. Adding replacement links now would introduce downstream workflow assumptions before their source records exist.

## 10. Proposed Indexes

DispatchReview:

- unique partial or equivalent application-enforced uniqueness for active non-terminal dispatch per `jobRequestId`
- index on `jobRequestId`
- index on `organizationId`, `status`, `updatedAt`
- index on `ownerUserId`, `status`
- index on `residenceId`, `status`
- index on `departmentId`, `status`

DispatchCandidate:

- unique on `dispatchReviewId`, `workerUserId`
- index on `dispatchReviewId`, `isShortlisted`
- index on `dispatchReviewId`, `evaluationStatus`
- index on `workerUserId`
- index on `sourceFreshness`

## 11. Proposed Permissions

The current authorization catalogue does not include Dispatch permissions. Do not reuse `job_request.approve_for_dispatch` for Dispatch authority.

Proposed narrow permissions:

- `dispatch.create`
- `dispatch.read`
- `dispatch.review_candidates`
- `dispatch.manage_shortlist`
- `dispatch.pause`
- `dispatch.cancel`
- `dispatch.prepare_offer`

Initial role mapping:

- `PLATFORM_ADMINISTRATOR`: all Dispatch permissions
- `DISPATCHER`: all Dispatch permissions except any future global admin controls, if owner chooses to activate Dispatcher in this phase
- organization roles: none
- `WORKER_ACCESS`: none

Owner decision required: activate `DISPATCHER` now or keep Dispatch operations limited to `PLATFORM_ADMINISTRATOR` for Phase 01.

## 12. Proposed State Transition Rules

| Current                                                                | Next              | Actor                       | Reason Required | Candidate Evaluation Allowed             | Offer Preparation May Begin |
| ---------------------------------------------------------------------- | ----------------- | --------------------------- | --------------- | ---------------------------------------- | --------------------------- |
| draft                                                                  | active            | Platform dispatch authority | No              | No                                       | No                          |
| active                                                                 | candidate_review  | Platform dispatch authority | No              | Yes                                      | No                          |
| candidate_review                                                       | shortlist_ready   | Platform dispatch authority | No              | Yes                                      | No                          |
| shortlist_ready                                                        | offer_preparation | Platform dispatch authority | No              | No new evaluation; shortlist review only | Yes                         |
| active                                                                 | paused            | Platform dispatch authority | Yes             | No                                       | No                          |
| candidate_review                                                       | paused            | Platform dispatch authority | Yes             | No                                       | No                          |
| shortlist_ready                                                        | paused            | Platform dispatch authority | Yes             | No                                       | No                          |
| offer_preparation                                                      | paused            | Platform dispatch authority | Yes             | No                                       | No                          |
| paused                                                                 | active            | Platform dispatch authority | Yes             | No                                       | No                          |
| paused                                                                 | candidate_review  | Platform dispatch authority | Yes             | Yes                                      | No                          |
| draft/active/candidate_review/shortlist_ready/offer_preparation/paused | cancelled         | Platform dispatch authority | Yes             | No                                       | No                          |
| offer_preparation                                                      | closed            | Platform dispatch authority | Yes             | No                                       | No                          |

Undefined transitions must be rejected.

## 13. Proposed Audit Events

Required actions:

- `dispatch.created`
- `dispatch.activated`
- `dispatch.candidate_review_started`
- `dispatch.candidate_evaluated`
- `dispatch.candidate_shortlisted`
- `dispatch.candidate_removed`
- `dispatch.paused`
- `dispatch.resumed`
- `dispatch.shortlist_ready`
- `dispatch.offer_preparation_started`
- `dispatch.cancelled`
- `dispatch.closed`
- `dispatch.access_denied`

Audit must include:

- actor
- actor context
- Job Request
- DispatchReview
- Employer Organization
- prior state
- new state
- candidate reference where applicable
- reason
- timestamp
- correlation identifier
- source
- future AI/model version only when an AI recommendation source exists later

## 14. Minimum Admin API Boundary After Approval

Allowed after owner approval and migration:

- Create Dispatch
- Read Dispatch
- List Dispatches by approved operational filters
- Start Candidate Review
- Search Candidate boundary
- Add Candidate to Shortlist
- Remove Candidate from Shortlist
- Mark Shortlist Ready
- Move to Offer Preparation
- Pause
- Resume
- Cancel
- Close
- Read audit summary

Not allowed:

- Worker Offer APIs
- Assignment APIs
- Attendance APIs
- Finance APIs
- notification send APIs
- production AI APIs

## 15. Migration Impact

Expected migration impact:

- add DispatchReviewStatus enum
- add DispatchCandidateStatus enum
- add DispatchCandidateSource enum
- add DispatchReview table
- add DispatchCandidate table
- add indexes and uniqueness constraints
- add relations to existing User, JobRequest, EmployerOrganization, Residence, Department, WorkGroup, and RoleDefinition

Existing data impact:

- no existing rows modified
- no existing tables renamed
- no JobRequest data migrated

Rollback strategy:

- drop DispatchCandidate table
- drop DispatchReview table
- drop Dispatch enums
- remove generated Prisma Client changes

Production impact:

- additive schema only
- no data backfill required
- should be deployable before API activation

## 16. Risks

- Worker Profile is not implemented; candidate records must remain safe summaries.
- Activating `DISPATCHER` role changes authority and requires explicit owner approval.
- One active dispatch per Job Request must be enforced carefully with either database-supported partial uniqueness or transactional application enforcement.
- Candidate summaries could become privacy-sensitive if fields expand without review.
- Future WorkerOffer/Assignment phases must reference DispatchReview without retrofitting hidden state.

## 17. Owner Decisions Required

1. Approve DispatchReview and DispatchCandidate entities.
2. Decide whether to introduce DispatchAttempt now or defer it.
3. Approve one active non-terminal DispatchReview per Job Request.
4. Approve candidate snapshot fields as safe operational summaries.
5. Decide whether `DISPATCHER` role becomes active in Phase 01 Dispatch.
6. Approve new Dispatch permissions.
7. Approve additive Prisma migration for Dispatch.
8. Confirm no WorkerOffer or Assignment entity may be added in this phase.

## 18. Recommendation

Approve the minimal additive schema with:

- DispatchReview
- DispatchCandidate
- Dispatch enums
- Dispatch permissions
- no DispatchAttempt in Phase 01
- no WorkerOffer or Assignment entities
- Platform Administrator authority initially, with `DISPATCHER` activation only if explicitly approved

This keeps Dispatch narrow, auditable, tenant-bound, and compatible with the frozen Platform Core 1.0 baseline.

## Verdict

DISPATCH FOUNDATION REQUIRES OWNER SCHEMA AND PERMISSION APPROVAL BEFORE IMPLEMENTATION
