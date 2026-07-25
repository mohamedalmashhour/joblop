# Resident Job Dispatch Engine Architecture

Status: DISPATCH ENGINE ARCHITECTURE - OWNER REVIEW REQUIRED

Starting baseline:

- Platform Core 1.0 frozen at `82857cc`.
- Dispatch schema proposal accepted as architecture input at `4c56b82`.
- No Dispatch code, schema, migration, permission, API, seed, frontend, test, AI execution, notification, Worker Offer, Assignment, Attendance, Timesheet, Finance, or Reporting implementation is authorized in this document.

## 1. Dispatch Operating Principle

Employer creates the Job Request. Platform Admin or an explicitly authorized Dispatcher controls Dispatch. Worker does not enter the process until a Worker Offer is sent in a later phase.

Dispatch is an admin-governed operational engine. It is not a Job Request state extension. It creates controlled worker-selection activity from an `approved_for_dispatch` Job Request and stops at the Worker Offer boundary.

AI may recommend candidates, explain fit, and flag risks later, but AI cannot create authoritative Dispatch state, shortlist candidates, prepare binding offers, assign workers, or hide alternatives.

Clarifications:

- Job Request != Dispatch
- Dispatch != Worker Offer
- Worker Offer != Assignment
- Shortlist != Selection
- Recommendation != Admin Decision

One Job Request may require more than one Dispatch attempt over time, especially for replacement. Prior Dispatch, Worker Offer, and Assignment history must remain immutable.

## 2. Canonical Dispatch Flow

| Step                              | Actor                                                   | Source State                            | Target State              | Required Conditions                                                                                | Authorization                             | Authoritative System                        | Audit Event                           | Failure Behavior                             | Retry Behavior                      | Concurrency Rule                                                    | Notification Boundary                             | Human Approval                     |
| --------------------------------- | ------------------------------------------------------- | --------------------------------------- | ------------------------- | -------------------------------------------------------------------------------------------------- | ----------------------------------------- | ------------------------------------------- | ------------------------------------- | -------------------------------------------- | ----------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------- | ---------------------------------- |
| Create Dispatch                   | Platform Admin or approved Dispatcher                   | Job Request `approved_for_dispatch`     | Dispatch `draft`          | No active non-terminal Dispatch for same Job Request unless replacement/extra-worker policy allows | `dispatch.create`                         | Dispatch Engine                             | `dispatch.created`                    | Deny safely; do not alter Job Request        | Retry with idempotency key          | Transaction checks Job Request state and active dispatch uniqueness | No worker notification                            | Mandatory                          |
| Assign Owner                      | Platform Admin or Supervisor                            | `draft` or `active`                     | same state                | owner user has dispatch authority                                                                  | `dispatch.supervise` or `dispatch.create` | Dispatch Engine                             | `dispatch.owner_assigned`             | Deny safely                                  | Retry with version                  | optimistic version check                                            | No worker notification                            | Mandatory                          |
| Activate Dispatch                 | Owner/Admin                                             | `draft`                                 | `active`                  | Dispatch has owner                                                                                 | `dispatch.create`                         | Dispatch Engine                             | `dispatch.activated`                  | Deny safely                                  | Retry with version                  | optimistic version check                                            | Employer may see high-level started status        | Mandatory                          |
| Start Candidate Review            | Owner/Admin                                             | `active`                                | `candidate_review`        | Job Request not cancelled/archived; source boundary available or marked unavailable                | `dispatch.review_candidates`              | Dispatch Engine                             | `dispatch.candidate_review_started`   | Deny or mark source unavailable              | Retry after source recovery         | optimistic version check                                            | No worker notification                            | Mandatory                          |
| Search Candidate Pool             | Owner/Admin                                             | `candidate_review`                      | same state                | candidate source interface available                                                               | `dispatch.review_candidates`              | Candidate Source boundary + Dispatch Engine | `dispatch.candidate_search_performed` | Return empty/unavailable with safe reason    | Retry when source freshness changes | search does not mutate Dispatch except optional audit               | No worker notification                            | Mandatory                          |
| Evaluate Eligibility              | Owner/Admin or future advisory engine with human review | `candidate_review`                      | candidate evaluated       | candidate summary available                                                                        | `dispatch.review_candidates`              | Dispatch Engine                             | `dispatch.candidate_evaluated`        | Mark missing/stale; do not infer eligibility | Retry after refresh                 | candidate version check                                             | No worker notification                            | Mandatory for persisted evaluation |
| Evaluate Availability             | Owner/Admin or future advisory engine with human review | `candidate_review`                      | candidate evaluated       | availability boundary response exists or is unavailable                                            | `dispatch.review_candidates`              | Availability boundary + Dispatch Engine     | `dispatch.candidate_evaluated`        | Mark unavailable/stale; do not fabricate     | Retry before shortlist/offer prep   | candidate version check                                             | No worker notification                            | Mandatory for persisted evaluation |
| Detect Conflicts                  | Owner/Admin or future advisory engine with human review | `candidate_review`                      | candidate evaluated       | schedule/conflict source checked                                                                   | `dispatch.review_candidates`              | Conflict boundary + Dispatch Engine         | `dispatch.candidate_evaluated`        | Mark conflict/missing                        | Retry before Worker Offer later     | candidate version check                                             | No worker notification                            | Mandatory                          |
| Evaluate Travel                   | Owner/Admin or future advisory engine with human review | `candidate_review`                      | candidate evaluated       | service area/travel boundary checked                                                               | `dispatch.review_candidates`              | Travel boundary + Dispatch Engine           | `dispatch.candidate_evaluated`        | Mark unknown/outside service area            | Retry if location/source changes    | candidate version check                                             | No worker notification                            | Mandatory                          |
| Review Qualification Summary      | Owner/Admin                                             | `candidate_review`                      | candidate evaluated       | summary exists or missing state is explicit                                                        | `dispatch.review_candidates`              | Qualification summary boundary              | `dispatch.candidate_evaluated`        | Mark verification required/missing           | Retry after credential refresh      | candidate version check                                             | No worker notification                            | Mandatory                          |
| Review Recommendation Explanation | Owner/Admin                                             | `candidate_review`                      | same state                | future recommendation explanation available                                                        | `dispatch.review_candidates`              | Future AI recommendation boundary           | `dispatch.ai_recommendation_reviewed` | Mark recommendation unavailable              | Retry after model/source recovery   | recommendation version recorded                                     | No worker notification                            | Mandatory                          |
| Add Candidate to Shortlist        | Owner/Admin                                             | `candidate_review`                      | candidate shortlisted     | candidate visible and not duplicate; reason required for override                                  | `dispatch.manage_shortlist`               | Dispatch Engine                             | `dispatch.candidate_shortlisted`      | Deny safely, preserve candidate              | Retry with candidate version        | unique candidate shortlist row/version check                        | No worker notification                            | Mandatory                          |
| Remove Candidate from Shortlist   | Owner/Admin                                             | `candidate_review` or `shortlist_ready` | candidate removed         | candidate is shortlisted                                                                           | `dispatch.manage_shortlist`               | Dispatch Engine                             | `dispatch.candidate_removed`          | Deny safely                                  | Retry with candidate version        | no silent overwrite                                                 | No worker notification                            | Mandatory                          |
| Mark Shortlist Ready              | Owner/Admin                                             | `candidate_review`                      | `shortlist_ready`         | shortlist has at least one candidate or reason for empty shortlist                                 | `dispatch.manage_shortlist`               | Dispatch Engine                             | `dispatch.shortlist_ready`            | Deny safely                                  | Retry with dispatch version         | optimistic version check                                            | Employer may see shortlist-ready status only      | Mandatory                          |
| Move to Offer Preparation         | Owner/Admin                                             | `shortlist_ready`                       | `offer_preparation`       | candidate freshness rechecked; required worker count boundary reviewed                             | `dispatch.prepare_offer`                  | Dispatch Engine                             | `dispatch.offer_preparation_started`  | Deny safely                                  | Retry after stale candidate refresh | optimistic version check                                            | No Worker Offer sent yet                          | Mandatory                          |
| Stop at Worker Offer Boundary     | Owner/Admin                                             | `offer_preparation`                     | no further Dispatch state | Worker Offer phase not implemented here                                                            | future Worker Offer permission            | Future Worker Offer Engine                  | none in Dispatch                      | Stop                                         | Requires next phase                 | no mutation                                                         | Worker notification belongs to Worker Offer phase | Mandatory                          |

## 3. Dispatch Types

| Type                       | Purpose                                                                                            | Trigger                                  | Job Request Relationship                               | New Dispatch Record?                                     | History Immutable? | Multiple Active Dispatches?                          | Risk   |
| -------------------------- | -------------------------------------------------------------------------------------------------- | ---------------------------------------- | ------------------------------------------------------ | -------------------------------------------------------- | ------------------ | ---------------------------------------------------- | ------ |
| Initial Dispatch           | First candidate-selection process for a Job Request                                                | Job Request approved for dispatch        | Direct child of original Job Request                   | Yes                                                      | Yes                | One active initial dispatch                          | Low    |
| Replacement Dispatch       | Replace worker after decline, expiry, cancellation, no-show, qualification issue, or multi-day gap | Later Worker Offer/Assignment events     | Same original Job Request plus future replacement link | Recommended as new Dispatch record later                 | Yes                | May coexist by position/date only after future rules | Medium |
| Additional Worker Dispatch | Fill remaining positions when `numberOfWorkers > 1`                                                | Partial fill or insufficient shortlist   | Same Job Request, position-count boundary              | Future new Dispatch or DispatchAttempt                   | Yes                | Only with explicit position scope                    | Medium |
| Reopened Dispatch          | Reopen after pause/close due to operational correction                                             | Admin decision                           | Same Job Request                                       | Prefer new Dispatch if prior closed                      | Yes                | No, unless replacement/extra-worker policy says so   | Medium |
| Emergency Dispatch         | Accelerated review path for urgent/immediate requests                                              | Job Request urgency and admin escalation | Same Job Request                                       | Same entity with priority, not separate type in Phase 01 | Yes                | No special duplicate rule                            | Medium |

Phase 01 recommendation: implement only `initial` and `replacement_reserved` type values if schema requires a type. Use `initial` operationally and reserve replacement behavior until Worker Offer/Assignment phases define triggers. Emergency should be priority/urgency, not a separate entity type.

## 4. Dispatch Entity

Minimum entity: `DispatchReview`.

Identity fields:

- `id`
- `jobRequestId`
- `organizationId`
- `residenceId`
- `departmentId`
- `workGroupId`
- `roleDefinitionId`

Control fields:

- `dispatchType`
- `status`
- `ownerUserId`
- `priority`
- `urgency`
- `requiredWorkerCount`
- `filledWorkerCountBoundary`
- `startedAt`
- `pausedAt`
- `cancelledAt`
- `closedAt`

Metadata:

- `createdByUserId`
- `updatedByUserId`
- `createdAt`
- `updatedAt`
- `version`
- `correlationId`

Copy versus reference:

- Reference `jobRequestId` as the source of truth.
- Copy `organizationId`, `residenceId`, `departmentId`, `workGroupId`, `roleDefinitionId`, `urgency`, and `requiredWorkerCount` as immutable operational context at Dispatch creation. This preserves auditability if labels or parent records later change.
- Do not duplicate title, description, commercial details, rates, employer billing, or future assignment fields unless a later ACR approves a snapshot need.

## 5. Dispatch States

| State             | Meaning                                     | Owner            | Allowed Actions                                             | Prohibited Actions               | Next States                          | Reason Required        | Search                         | Shortlist                                                        | Offer Prep           | Audit Event                            | Employer Visible                      | Replacement Start                                                    |
| ----------------- | ------------------------------------------- | ---------------- | ----------------------------------------------------------- | -------------------------------- | ------------------------------------ | ---------------------- | ------------------------------ | ---------------------------------------------------------------- | -------------------- | -------------------------------------- | ------------------------------------- | -------------------------------------------------------------------- |
| Draft             | Dispatch exists but not active              | Admin/Dispatcher | assign owner, activate, cancel                              | candidate eval, offer prep       | active, cancelled                    | cancel yes             | blocked                        | blocked                                                          | blocked              | `dispatch.created`                     | Dispatch not started or internal only | No                                                                   |
| Active            | Dispatch opened for operations              | Admin/Dispatcher | start candidate review, pause, cancel                       | offer prep                       | candidate_review, paused, cancelled  | pause/cancel yes       | blocked until candidate_review | blocked                                                          | blocked              | `dispatch.activated`                   | Dispatch started                      | No                                                                   |
| Candidate Review  | Candidate search/evaluation underway        | Admin/Dispatcher | search, evaluate, shortlist, pause, cancel, mark ready      | send offer, assign               | shortlist_ready, paused, cancelled   | pause/cancel yes       | allowed                        | allowed                                                          | blocked              | `dispatch.candidate_review_started`    | Candidate search in progress          | No                                                                   |
| Shortlist Ready   | Human-reviewed shortlist prepared           | Admin/Dispatcher | remove/reorder candidate, move to offer prep, pause, cancel | send offer, assign               | offer_preparation, paused, cancelled | pause/cancel yes       | blocked except refresh         | allowed with audit                                               | allowed transition   | `dispatch.shortlist_ready`             | Shortlist ready                       | No                                                                   |
| Offer Preparation | Dispatch has reached Worker Offer boundary  | Admin/Dispatcher | prepare future offer handoff, pause, cancel, close          | send offer in this phase, assign | paused, cancelled, closed            | pause/cancel/close yes | blocked                        | blocked except correction with transition back if later approved | active boundary only | `dispatch.offer_preparation_started`   | Preparing worker offers               | Future replacement only after offer/assignment phases                |
| Paused            | Dispatch temporarily stopped                | Admin/Dispatcher | resume, cancel                                              | search, shortlist, offer prep    | active, candidate_review, cancelled  | resume/cancel yes      | blocked                        | blocked                                                          | blocked              | `dispatch.paused` / `dispatch.resumed` | Paused                                | No                                                                   |
| Cancelled         | Dispatch stopped before completion          | Admin/Dispatcher | read audit only                                             | all mutation                     | none                                 | required               | blocked                        | blocked                                                          | blocked              | `dispatch.cancelled`                   | Cancelled                             | Future replacement may start new Dispatch if Job Request still valid |
| Closed            | Dispatch finished at boundary or superseded | Admin/Supervisor | read audit only                                             | all mutation                     | none                                 | required               | blocked                        | blocked                                                          | blocked              | `dispatch.closed`                      | Closed                                | Future replacement uses new Dispatch                                 |

Excluded states: Offer Sent, Accepted, Assigned, In Progress, Completed.

## 6. Candidate Source Model

CandidateSource interface fields:

- `sourceType`
- `sourceIdentifier`
- `freshnessTimestamp`
- `sourceAuthority`
- `tenantBoundary`
- `dataCompleteness`
- `verificationStatus`
- `unavailableReason`

Future source types:

- internal worker profiles
- invited workers
- approved staffing partners
- enterprise employee pool
- external candidate integrations
- imported candidate records

Phase 01 must not fabricate WorkerProfile persistence. If no worker source exists, search returns an explicit unavailable or empty source state and can be tested through an interface-backed fixture.

## 7. Dispatch Candidate

Minimum `DispatchCandidate` summary:

- `candidateReference`
- `sourceType`
- `approvedDisplayName`
- `workGroupMatch`
- `roleDefinitionMatch`
- `qualificationSummaryState`
- `verificationSummaryState`
- `availabilityState`
- `scheduleConflictState`
- `serviceAreaState`
- `travelSuitabilityState`
- `transportConstraintState`
- `languageRequirementState` where lawful
- `reliabilitySummaryState` where approved
- `recommendationState`
- `shortlistState`
- `sourceFreshness`
- `lastEvaluatedAt`
- `evaluationVersion`

Forbidden data:

- banking
- tax data
- government identity document contents
- home address
- health data
- protected characteristics
- unrelated complaints
- internal investigations
- employer charge
- platform margin
- other candidate private data

## 8. Eligibility Model

| Outcome                | Meaning                                        | Required Evidence                                                 | Shortlist Allowed  | Admin Override                                                | Reason Required | Audit                          | Freshness                      |
| ---------------------- | ---------------------------------------------- | ----------------------------------------------------------------- | ------------------ | ------------------------------------------------------------- | --------------- | ------------------------------ | ------------------------------ |
| Eligible               | Candidate meets visible Phase 01 checks        | role, work group, availability/conflict/service summaries current | Yes                | Not needed                                                    | No              | evaluation audit               | expires with source            |
| Ineligible             | Candidate fails a required visible check       | specific failed state                                             | No                 | No unless later policy allows                                 | Yes             | evaluation audit               | expires with source            |
| Conditionally Eligible | Candidate may proceed with disclosed condition | condition and owner review                                        | Yes with reason    | Yes                                                           | Yes             | evaluation and shortlist audit | must recheck before offer      |
| Information Missing    | Source lacks required summary                  | missing field marker                                              | No by default      | Yes only with reason and supervisor if approved               | Yes             | evaluation audit               | stale until source refresh     |
| Verification Required  | credential/compliance summary needs review     | verification state                                                | No by default      | No for regulated requirements                                 | Yes             | evaluation audit               | expires with credential source |
| Stale Data             | source freshness expired                       | timestamp and source                                              | No until refreshed | No                                                            | Yes             | evaluation audit               | requires refresh               |
| Conflict Detected      | schedule/availability conflict found           | conflict summary                                                  | No by default      | Yes only if lawful and non-binding                            | Yes             | evaluation audit               | recheck before offer           |
| Outside Service Area   | travel/service area mismatch                   | service area summary                                              | No by default      | Yes only with reason if worker-visible data later supports it | Yes             | evaluation audit               | recheck if location changes    |

Visibility is not eligibility. AI recommendation is not eligibility.

## 9. Availability and Conflict Engine

Future boundaries:

- candidate calendar
- confirmed assignments
- pending offers
- temporary holds
- unavailable blocks
- timezone
- travel time
- minimum rest rule boundary
- overlapping Job Requests
- multi-day conflicts
- recurring commitments

Rules:

- Available != Conflict-Free
- Conflict-Free != Eligible
- Eligible != Recommended
- atomic recheck is required before Worker Offer creation later
- no calendar persistence is implemented in this architecture phase

## 10. Service Area and Travel

Dispatch should evaluate:

- candidate service area
- residence/worksite location
- maximum travel distance boundary
- travel-time estimate boundary
- transport availability
- driver status where lawful and relevant
- public transit suitability boundary
- urgent travel feasibility

Admin should not need exact worker home address. Use privacy-preserving distance bands, service zones, or travel feasibility states where possible. Country Packs may later alter allowed travel fields and retention.

## 11. Qualification Summary

Summary states:

- Meets Requirements
- Partially Meets
- Missing Required Qualification
- Verification Pending
- Expired Qualification
- Not Evaluated

This is not a full qualification engine. Future dependencies:

- qualifications
- certifications
- licences
- background/security checks
- country rules
- client-specific requirements

## 12. Shortlist

Admin may:

- add candidate
- remove candidate
- compare candidates
- record reason
- reorder where approved
- mark shortlist ready

Rules:

- shortlist does not create Worker Offer
- duplicate shortlist entries prohibited
- removal preserves audit
- freshness visible
- stale candidates require re-evaluation
- shortlist should respect required worker count but may include alternatives
- protected characteristics must never drive shortlist decisions

Phase 01 recommendation: shortlist ordering is manual only. Future AI may suggest ordering, but admin-controlled manual order is the authoritative shortlist.

## 13. AI Recommendation Boundary

AI may later:

- rank candidates
- explain fit
- flag missing information
- identify conflicts
- suggest alternatives
- summarize tradeoffs

AI must not:

- create Dispatch
- change Dispatch state
- shortlist automatically
- remove candidates
- prepare binding offers
- assign workers
- use protected characteristics
- fabricate availability
- fabricate qualifications
- hide alternatives
- penalize workers secretly

Every recommendation must expose model/policy version, input freshness, explanation, confidence, limitations, and human-decision-required status. Phase 01 defines interfaces only.

## 14. Admin Roles

| Role                          | Permitted Actions                                                                  | Forbidden Actions                                           | Tenant Scope                              | Escalation          | Override            | Audit                   |
| ----------------------------- | ---------------------------------------------------------------------------------- | ----------------------------------------------------------- | ----------------------------------------- | ------------------- | ------------------- | ----------------------- |
| Platform Administrator        | all Dispatch management and supervision                                            | Worker Offer send, Assignment, Attendance, Finance          | platform with tenant-scoped record access | yes                 | yes within policy   | all sensitive actions   |
| Dispatcher                    | create/read/review/manage shortlist/pause/resume/cancel/prepare offer if activated | permissions, global settings, Worker Offer send, Assignment | assigned operational scope                | to Supervisor/Admin | limited with reason | all actions             |
| Dispatch Supervisor           | owner assignment, override review, close/cancel, audit read                        | financial or worker-offer execution                         | platform or assigned region               | to Platform Admin   | broader with reason | all actions             |
| Read-only Operations Reviewer | read Dispatch and audit summaries                                                  | mutation, candidate shortlist, offer prep                   | explicit scope                            | none                | none                | reads of sensitive data |

Smallest Phase 01 role set: Platform Administrator only, with `DISPATCHER` activation deferred unless owner explicitly approves.

## 15. Dispatch Permissions

| Permission                   | Purpose                                   | Role Mapping                                 | Platform Context | Organization Context                   | Status                              | API Use          | Test Requirement               | Risk                          |
| ---------------------------- | ----------------------------------------- | -------------------------------------------- | ---------------- | -------------------------------------- | ----------------------------------- | ---------------- | ------------------------------ | ----------------------------- |
| `dispatch.create`            | create Dispatch from approved Job Request | Platform Admin; optional Dispatcher          | required         | no employer authority                  | active if approved                  | create           | wrong Job Request state denied | premature operational control |
| `dispatch.read`              | read Dispatch                             | Platform Admin; optional Dispatcher/Reviewer | required         | optional employer status view separate | active if approved                  | read/list        | cross-tenant denied            | candidate privacy exposure    |
| `dispatch.review_candidates` | search/evaluate candidates                | Platform Admin; optional Dispatcher          | required         | no                                     | active if approved                  | search/evaluate  | private fields excluded        | protected data misuse         |
| `dispatch.manage_shortlist`  | add/remove/reorder shortlist              | Platform Admin; optional Dispatcher          | required         | no                                     | active if approved                  | shortlist        | duplicate/stale denied         | hidden selection bias         |
| `dispatch.pause`             | pause Dispatch                            | Platform Admin; optional Dispatcher          | required         | no                                     | active if approved                  | pause            | reason required                | operational deadlock          |
| `dispatch.resume`            | resume paused Dispatch                    | Platform Admin; optional Dispatcher          | required         | no                                     | active if approved                  | resume           | reason/version required        | stale restart                 |
| `dispatch.cancel`            | cancel Dispatch                           | Platform Admin; optional Dispatcher          | required         | no                                     | active if approved                  | cancel           | reason required                | demand interruption           |
| `dispatch.close`             | close Dispatch boundary                   | Platform Admin or Supervisor                 | required         | no                                     | active if approved                  | close            | reason required                | premature closure             |
| `dispatch.prepare_offer`     | move to Worker Offer boundary             | Platform Admin; optional Dispatcher          | required         | no                                     | active if approved                  | offer prep       | no offer sent                  | accidental offer execution    |
| `dispatch.audit_read`        | read Dispatch audit                       | Platform Admin/Supervisor/Reviewer           | required         | no                                     | active if approved                  | audit summary    | sensitive denial               | audit exposure                |
| `dispatch.supervise`         | assign owner/override                     | Platform Admin/Supervisor                    | required         | no                                     | reserved unless Supervisor approved | owner assignment | role denied by default         | excessive authority           |

Do not modify the catalogue until owner approves.

## 16. Employer Visibility

Allowed high-level statuses:

- Dispatch not started
- Dispatch started
- Candidate search in progress
- Shortlist ready
- Preparing worker offers
- Paused
- Cancelled
- Closed

Employer must not see private candidate information, internal ranking, internal admin notes, AI confidence details unless approved, other candidates' identities, protected data, internal margin, or operational security details. Employer must not control Dispatch directly in Phase 01.

## 17. Worker Visibility

Before Worker Offer is sent:

- worker sees nothing
- no calendar entry
- no notification
- no inferred assignment
- no worker-facing status

Candidate evaluation must not create worker-facing state.

## 18. Replacement Dispatch

Future triggers:

- worker declines
- offer expires
- worker cancels
- no-show
- qualification expires
- safety issue
- employer-approved replacement
- multi-day replacement

Rules:

- prior Dispatch history preserved
- prior Worker Offer preserved
- prior Assignment preserved
- replacement does not overwrite earlier records
- replacement linked to original Job Request
- financial impact belongs to later phases

Recommendation: replacement should use a new Dispatch record linked to the original Job Request and, later, to the triggering Worker Offer/Assignment. Do not use the same record. Do not add DispatchAttempt in Phase 01 unless owner chooses multi-attempt modeling now.

## 19. Multi-Worker Job Requests

When `numberOfWorkers > 1`, Dispatch must support:

- partial shortlist
- partial offer preparation
- partial fill boundary
- remaining positions
- replacement for one position later
- different workers for different dates where future policy allows

Do not collapse multiple workers into one candidate or one assignment. Phase 01 can track `requiredWorkerCount` and `filledWorkerCountBoundary` as counts only; actual fills remain future Assignment/Worker Offer outputs.

## 20. Multi-Day and Recurring Requests

Dispatch must account for:

- one worker covering all days
- different workers covering different days
- recurring templates
- generated schedule instances
- partial availability
- holiday conflicts
- timezone differences
- future replacement by instance

Do not implement schedule-instance entities in Dispatch Phase 01. Preserve a future boundary for schedule instances or generated shifts.

## 21. Concurrency

Controls:

- duplicate Dispatch creation: transaction and active-dispatch uniqueness
- simultaneous shortlist changes: candidate version checks
- candidate refresh: evaluation version and freshness timestamp
- pause versus offer preparation: dispatch version check
- Job Request cancellation during Dispatch: governed Dispatch response, likely pause/cancel boundary
- Job Request archive during active Dispatch: denied until Dispatch terminal
- multiple owners: owner assignment audit and version check
- replacement creation: future idempotency and trigger reference

Recommendations:

- optimistic version checks
- transaction boundaries for create and shortlist mutation
- unique active Dispatch constraint where database supports it
- idempotency keys for future mutating APIs

## 22. Audit

Mandatory events:

- `dispatch.created`
- `dispatch.owner_assigned`
- `dispatch.activated`
- `dispatch.candidate_review_started`
- `dispatch.candidate_search_performed`
- `dispatch.candidate_evaluated`
- `dispatch.candidate_shortlisted`
- `dispatch.candidate_removed`
- `dispatch.shortlist_reordered`
- `dispatch.shortlist_ready`
- `dispatch.offer_preparation_started`
- `dispatch.paused`
- `dispatch.resumed`
- `dispatch.cancelled`
- `dispatch.closed`
- `dispatch.replacement_initiated`
- `dispatch.access_denied`
- `dispatch.ai_recommendation_generated`

Audit fields:

- actor
- actor role/context
- Job Request
- Dispatch
- candidate reference where relevant
- source
- previous state
- new state
- reason
- timestamp
- correlation identifier
- model/policy version where applicable

## 23. API Capability Map

No endpoint URLs are defined here.

| Capability                | Actor                     | Permission                   | Input                                 | Output                   | Validation                                | Idempotency | Concurrency Risk                     | Audit                             | Error Behavior    |
| ------------------------- | ------------------------- | ---------------------------- | ------------------------------------- | ------------------------ | ----------------------------------------- | ----------- | ------------------------------------ | --------------------------------- | ----------------- |
| Create Dispatch           | Admin/Dispatcher          | `dispatch.create`            | Job Request ID/number, owner optional | Dispatch summary         | approved Job Request, no duplicate active | required    | duplicate create                     | created                           | safe denial       |
| Read Dispatch             | Admin/Dispatcher/Reviewer | `dispatch.read`              | Dispatch ID                           | Dispatch summary         | scope and permission                      | not needed  | stale read acceptable with freshness | optional read audit for sensitive | safe denial       |
| List Dispatches           | Admin/Dispatcher/Reviewer | `dispatch.read`              | filters                               | summaries                | approved filters                          | not needed  | stale list                           | optional                          | safe denial       |
| Assign Owner              | Admin/Supervisor          | `dispatch.supervise`         | owner ID, version                     | Dispatch summary         | owner authority                           | optional    | owner overwrite                      | owner assigned                    | safe denial       |
| Start Candidate Review    | Admin/Dispatcher          | `dispatch.review_candidates` | Dispatch ID, version                  | Dispatch summary         | active state                              | optional    | pause race                           | candidate review started          | safe denial       |
| Search Candidates         | Admin/Dispatcher          | `dispatch.review_candidates` | Dispatch ID, criteria                 | safe candidate summaries | candidate source scope                    | optional    | stale source                         | search performed                  | unavailable state |
| Evaluate Candidate        | Admin/Dispatcher          | `dispatch.review_candidates` | candidate reference, version          | candidate summary        | source freshness                          | optional    | stale candidate                      | candidate evaluated               | safe denial       |
| Add to Shortlist          | Admin/Dispatcher          | `dispatch.manage_shortlist`  | candidate ID, reason, version         | shortlist summary        | duplicate/stale/eligibility               | optional    | duplicate shortlist                  | candidate shortlisted             | safe denial       |
| Remove from Shortlist     | Admin/Dispatcher          | `dispatch.manage_shortlist`  | candidate ID, reason, version         | shortlist summary        | candidate shortlisted                     | optional    | stale remove                         | candidate removed                 | safe denial       |
| Reorder Shortlist         | Admin/Dispatcher          | `dispatch.manage_shortlist`  | ordered IDs, version                  | shortlist summary        | same dispatch candidates                  | optional    | conflicting order                    | shortlist reordered               | safe denial       |
| Mark Shortlist Ready      | Admin/Dispatcher          | `dispatch.manage_shortlist`  | Dispatch ID, version                  | Dispatch summary         | candidate freshness                       | optional    | stale shortlist                      | shortlist ready                   | safe denial       |
| Move to Offer Preparation | Admin/Dispatcher          | `dispatch.prepare_offer`     | Dispatch ID, version                  | Dispatch summary         | shortlist ready, recheck                  | optional    | stale dispatch                       | offer preparation                 | safe denial       |
| Pause                     | Admin/Dispatcher          | `dispatch.pause`             | reason, version                       | Dispatch summary         | non-terminal state                        | optional    | pause race                           | paused                            | safe denial       |
| Resume                    | Admin/Dispatcher          | `dispatch.resume`            | reason, target state, version         | Dispatch summary         | paused state                              | optional    | stale resume                         | resumed                           | safe denial       |
| Cancel                    | Admin/Dispatcher          | `dispatch.cancel`            | reason, version                       | Dispatch summary         | cancellable state                         | optional    | terminal race                        | cancelled                         | safe denial       |
| Close                     | Admin/Supervisor          | `dispatch.close`             | reason, version                       | Dispatch summary         | offer prep or policy state                | optional    | terminal race                        | closed                            | safe denial       |
| Read Audit Summary        | Admin/Supervisor/Reviewer | `dispatch.audit_read`        | Dispatch ID                           | audit summaries          | scope and permission                      | not needed  | none                                 | optional read audit               | safe denial       |

## 24. Entity Impact

| Entity                   | Classification            | Recommendation                                                                  |
| ------------------------ | ------------------------- | ------------------------------------------------------------------------------- |
| DispatchReview           | Required Phase 01         | Create as primary Dispatch entity                                               |
| DispatchCandidate        | Required Phase 01         | Create safe candidate summary/snapshot                                          |
| DispatchAttempt          | Future                    | Defer unless owner wants explicit attempts now                                  |
| DispatchShortlist        | Not needed initially      | Represent with candidate fields unless ordering complexity requires child table |
| CandidateEvaluation      | Future                    | Defer; use summary fields and audit for Phase 01                                |
| CandidateSourceReference | Future/reusable interface | Interface now, table later only if source persistence required                  |
| DispatchOwnerAssignment  | Not needed initially      | Owner fields and audit event sufficient                                         |
| ReplacementDispatchLink  | Future                    | Defer until Worker Offer/Assignment triggers exist                              |

Smallest viable schema: DispatchReview + DispatchCandidate + enums + indexes + audit reuse.

## 25. Permission Impact

New permissions required:

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

Potential reserved permission:

- `dispatch.supervise`

Existing permissions reusable:

- none for actual Dispatch actions
- `job_request.approve_for_dispatch` only creates the input boundary

Seed/migration impact:

- authorization seed/catalogue must add permissions
- role mappings must update only after owner chooses active roles

Backward compatibility: additive permissions only.

## 26. Worker Profile Dependency

Dispatch cannot become fully operational without a worker/candidate data source.

Minimum future worker-search boundary:

- candidate identity reference
- approved display name
- source type
- role/work group match
- verification summary
- availability summary
- conflict summary
- service area/travel summary
- source freshness

Do not create WorkerProfile in this phase. If implementation cannot provide candidate source data through an interface/fixture boundary, the smallest owner decision is approval for a minimal CandidateSource provider, not a broad WorkerProfile schema.

## 27. Global HR Compatibility

Universal elements:

- Job Request-like demand source
- Dispatch as human-controlled selection engine
- CandidateSource abstraction
- Candidate summary/evaluation
- Shortlist
- audit and permissions

Resident Job-specific elements:

- Residence
- Department
- WorkGroup
- RoleDefinition under Option C
- senior living qualification summaries

Future support:

- temporary staffing
- permanent recruitment
- contractors
- internal employee mobility
- enterprise talent pools
- staffing partners
- multi-country operations

Preserve Option C: do not introduce GlobalOccupation yet.

## 28. Country Pack Boundary

Dispatch core must not hardcode Québec or any one country. Country Packs may later govern:

- licences
- qualifications
- background checks
- labour restrictions
- language requirements
- travel constraints
- data privacy
- retention
- worker classification

Dispatch stores summary states and references policy/version, not country-specific rule engines.

## 29. Test Strategy

Future tests:

- lifecycle transitions
- undefined transition denial
- authorization and role mapping
- tenant isolation
- candidate privacy exclusions
- shortlist add/remove/reorder
- optimistic concurrency
- duplicate active dispatch
- stale candidate data
- missing worker source
- multi-worker counts
- replacement boundary
- Job Request cancellation response
- AI advisory boundary
- no Worker Offer side effects
- no Assignment side effects
- audit events

## 30. Implementation Order

Recommended order:

1. Dispatch schema and migration: required before persistence.
2. Dispatch permissions and roles: required before service/API authorization.
3. Dispatch service: owns lifecycle and source-of-truth logic.
4. Dispatch lifecycle: validates state transitions and concurrency.
5. Candidate source interface: prevents fabricated WorkerProfile data.
6. Candidate evaluation boundary: stores safe summary states.
7. Shortlist: candidate add/remove/reorder and freshness checks.
8. Admin API: exposes internal capabilities only.
9. Employer status view: read-only high-level visibility only if approved.
10. Audit: immutable evidence for state and candidate decisions.
11. Tests: lifecycle, authorization, privacy, concurrency, audit, source unavailable.
12. Final report: owner review gate before Worker Offer phase.

## 31. Owner Decisions Required

| Decision                   | Options                                                       | Recommendation                               | Impact                 | Risk                                     | Required Before Schema | Deferrable |
| -------------------------- | ------------------------------------------------------------- | -------------------------------------------- | ---------------------- | ---------------------------------------- | ---------------------- | ---------- |
| Dispatch entity strategy   | DispatchReview only; DispatchReview + DispatchAttempt         | DispatchReview + DispatchCandidate only      | smaller Phase 01       | replacement may need later ACR           | Yes                    | No         |
| Active Dispatch count      | one active per Job Request; multiple scoped active records    | one active non-terminal per Job Request      | simpler concurrency    | extra-worker dispatch needs later policy | Yes                    | No         |
| Replacement model          | new Dispatch; DispatchAttempt child; same record type         | new Dispatch later                           | preserves history      | needs future trigger link                | No                     | Yes        |
| Dispatcher role            | activate now; Platform Admin only                             | Platform Admin only for first implementation | lower authority risk   | less operational delegation              | Yes for role seed      | Partly     |
| Supervisor role            | add now; reserve                                              | reserve                                      | smaller permissions    | less escalation granularity              | No                     | Yes        |
| Shortlist ordering         | manual; AI-assisted; score-based; unordered                   | manual only                                  | human controlled       | less automation                          | Yes                    | No         |
| AI visibility              | hidden interface; admin-visible explanation; employer-visible | admin-visible only later                     | preserves privacy      | delayed UX clarity                       | No                     | Yes        |
| Employer status visibility | none; high-level statuses                                     | high-level statuses                          | employer clarity       | status leakage if over-detailed          | No                     | Yes        |
| Candidate privacy fields   | minimal summaries; expanded worker profile                    | minimal summaries                            | safest privacy         | less matching detail                     | Yes                    | No         |
| WorkerProfile dependency   | interface fixture; minimal schema; full profile               | interface first                              | avoids overbuilding    | limited real matching                    | Yes                    | No         |
| Multi-worker handling      | counts only; position child records                           | counts only Phase 01                         | simpler                | later position migration                 | Yes                    | No         |
| Multi-day handling         | summary only; schedule instances                              | summary only                                 | avoids schedule schema | later complexity                         | No                     | Yes        |
| Emergency dispatch         | priority flag; separate type                                  | priority flag                                | less complexity        | fewer custom paths                       | No                     | Yes        |
| Pause/close rules          | strict reasons; optional reasons                              | strict reasons                               | audit clarity          | admin friction                           | Yes                    | No         |
| Audit retention            | use platform audit default; dispatch-specific                 | platform audit default                       | consistent             | may need retention later                 | No                     | Yes        |
| Staffing partners          | CandidateSource type now; integration later                   | type reserved, no integration                | compatibility          | no partner workflow now                  | No                     | Yes        |

## Validation

Architecture consistency confirmed:

- Platform Core 1.0 remains frozen.
- Job Request remains source of truth.
- Admin controls Dispatch.
- Worker sees nothing before Worker Offer.
- AI remains advisory.
- Candidate privacy is preserved.
- Dispatch stops at Worker Offer boundary.
- Replacement preserves history.
- Global HR compatibility remains possible.

## Verdict

DISPATCH ENGINE ARCHITECTURE READY FOR OWNER APPROVAL
