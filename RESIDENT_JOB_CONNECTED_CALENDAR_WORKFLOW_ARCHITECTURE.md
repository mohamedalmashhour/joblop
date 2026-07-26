# Resident Job Connected Calendar Workflow Architecture

Status: Ready for owner review  
Classification: Architecture planning only  
Implementation status: Not started  
Schema status: Not changed  
API status: Not changed  
Money authority: Not changed

## 1. Executive Summary

The Connected Calendar Workflow creates one governed staffing-calendar system with separate, permission-controlled views for clients, Resident Job administrators, and workers.

The calendar is a workflow surface over the approved staffing spine:

Client staffing request -> Admin review -> Worker offer -> Worker response -> Assignment -> Attendance -> Timesheet -> Billing and payment handoff

The calendar must preserve the existing platform rules:

- Clients can request and track staffing coverage.
- Admins control review, publishing, pricing visibility, and worker offer governance.
- Workers see only eligible worker-facing offers and confirmed jobs.
- AI may recommend changes, but humans approve before any operational or compensation change is published.
- Money execution remains behind the shared Money Engine, compliance, counsel, provider, and payment execution gates.

## 2. Purpose

The purpose is to connect staffing demand, admin dispatch, worker offer calendars, and assignment visibility into one coherent product flow.

The system must support:

- Client-created staffing requests.
- Admin review of request completeness, contract, payment method, location, client rate, transportation terms, qualifications, and worker offer economics.
- Admin-approved publishing to eligible workers.
- Worker offer review, acceptance, decline, and confirmed calendar visibility.
- Assignment reflection back to client and admin calendars.
- AI wage or bonus recommendations only when an offer remains unfilled, with mandatory admin approval.

## 3. Non-Goals

This architecture does not authorize:

- Immediate implementation.
- Schema changes without owner approval.
- New migrations without owner approval.
- Payment execution.
- Payroll calculation.
- Tax calculation.
- Provider integration.
- GPS provider integration.
- AI auto-assignment.
- AI auto-publishing.
- Hidden worker ranking.
- Client visibility into worker pay or platform margin.
- Worker visibility into client billing, client payment method, or platform margin.

## 4. Canonical Workflow

1. Client creates a staffing request in the client calendar.
2. Admin reviews the request, contract, payment method, location, client rate, transportation terms, and required qualifications.
3. Admin determines worker-facing wage and any permitted transportation compensation.
4. Admin approves the offer for publication.
5. Eligible workers see the worker-facing offer in their offer calendars.
6. Worker accepts or declines.
7. Accepted offer proceeds to authoritative Assignment creation.
8. Confirmed Assignment appears in the worker confirmed calendar and as assigned in client and admin calendars.
9. Attendance begins only from a valid Assignment.
10. Timesheet follows Attendance.
11. Billing and payment handoff follow approved Timesheet and future money gates.

## 5. Calendar Views

### Client Calendar

The client calendar owns request creation and client-facing coverage visibility.

Client may:

- View requested, under-review, approved, published, assigned, in-progress, completed, cancelled, disputed, and paid-visible status labels.
- Create urgent or long-term staffing needs.
- Enter role, date, start time, end time, number of workers, qualifications, duties, client wage, transportation time, address, and special instructions.
- Confirm service contract and payment method readiness.
- View job location on a map.
- Track request and coverage status.
- View assigned-worker information only after authorized assignment.

Client must not see:

- Worker pay rates.
- Worker transportation compensation.
- Platform margin or spread.
- Internal admin pricing decisions.
- Internal AI scoring.
- Private worker data not required for the assignment.
- Other workers' offer decisions.

### Admin Calendar

The admin calendar owns review, validation, publishing, repricing approval, and full operational visibility.

Admin may:

- See every client request.
- Validate required fields, contract acceptance, payment authorization, location, qualifications, client pricing, and transportation terms.
- View client billing and worker-offer economics separately.
- Approve, reject, return for correction, publish, pause, cancel, or reprice an offer.
- Select eligible worker groups.
- View offer delivery, acceptance, assignment, attendance, timesheet, dispute, and payment status.
- Approve or reject AI-generated wage or bonus recommendations.

Admin must not:

- Bypass eligibility controls.
- Publish compensation changes without audit.
- Treat AI recommendation as approval.
- Execute payment from the calendar.
- Override frozen invoices, timesheets, or assignments without the proper future workflow.

### Worker Calendar

The worker calendar owns worker-facing offer visibility and confirmed job visibility.

Worker may:

- See eligible job offers in the offer calendar.
- View role, date, hours, duties, qualifications, worker wage, transportation compensation, estimated worker earnings, distance, and map location.
- Accept or decline an offer.
- See accepted and confirmed jobs in a personal calendar.
- Access arrival instructions, punch-in/out, attendance status, timesheet, and earnings surfaces when those workflows are available.

Worker must not see:

- Client billing rates.
- Platform margin or spread.
- Client payment information.
- Internal admin notes.
- Internal AI scoring.
- Other workers' private schedules.
- Other workers' offer decisions.

## 6. Proposed Entities

These entities require future schema review before implementation.

### StaffingCalendarEvent

Purpose: User-facing calendar projection of existing authoritative workflow records.

Authority: Projection only. It must not replace JobRequest, WorkerOffer, Assignment, AttendanceRecord, or Timesheet.

Suggested fields:

- id
- tenantId
- sourceType: job_request | worker_offer | assignment | attendance | timesheet | billing_handoff
- sourceId
- audienceType: client | admin | worker
- audienceEntityId
- startsAt
- endsAt
- timezone
- status
- visibilityLevel
- createdAt
- updatedAt

Deletion: Should not be hard-deleted while source record exists. Can be archived if source record is archived.

### StaffingRequestCalendarDraft

Purpose: Client-created draft before JobRequest submission.

Authority: Temporary draft only. Submitted requests must become JobRequest records.

Suggested fields:

- id
- organizationId
- residenceId
- departmentId
- requestedRoleDefinitionId
- requestedWorkGroupId
- requestedWorkerCount
- startsAt
- endsAt
- timezone
- duties
- qualifications
- clientRateAmountMinor
- clientRateCurrency
- transportationTimeMinutes
- addressSummary
- locationVerificationState
- specialInstructions
- contractConfirmationState
- paymentMethodReadinessState
- status
- createdByUserId
- createdAt
- updatedAt

Deletion: Draft may be discarded before submission. Submitted records must be represented by JobRequest and audit history.

### CalendarPublishingDecision

Purpose: Admin decision record for publication, pause, cancellation, return for correction, or repricing.

Authority: Admin decision audit. It may trigger downstream WorkerOffer publication only after validation.

Suggested fields:

- id
- jobRequestId
- dispatchReviewId
- decisionType
- reason
- clientTermsVersion
- workerTermsVersion
- workerOfferWageAmountMinor
- workerOfferWageCurrency
- transportationCompensationAmountMinor
- transportationCompensationCurrency
- approvedByUserId
- approvedAt
- aiRecommendationId
- createdAt

Deletion: Never hard-delete. Append-only decision history.

### AiCalendarRecommendation

Purpose: Advisory record for unfilled offer recommendations, such as wage adjustment or completion bonus.

Authority: Advisory only. Cannot publish or modify compensation without admin decision.

Suggested fields:

- id
- jobRequestId
- dispatchReviewId
- recommendationType
- recommendedWageAmountMinor
- recommendedWageCurrency
- recommendedBonusAmountMinor
- recommendedBonusCurrency
- explanation
- confidence
- supportingEvidence
- uncertainty
- missingInformation
- alternatives
- modelVersion
- generatedAt
- reviewedByUserId
- reviewDecision
- reviewedAt

Deletion: Never hard-delete after review. Retain for audit.

### CalendarLocationSnapshot

Purpose: Permission-safe location snapshot for request, admin review, and worker offer views.

Authority: Snapshot only. Does not replace address or residence records.

Suggested fields:

- id
- jobRequestId
- addressSummary
- approximateDistanceKm
- mapProviderNeutralReference
- preciseLocationVisibility
- verifiedByUserId
- verifiedAt
- createdAt

Deletion: Retain according to privacy and operational evidence retention rules.

## 7. Entity Relationship Map

Client calendar draft -> JobRequest -> DispatchReview -> CalendarPublishingDecision -> WorkerOffer -> Assignment -> AttendanceRecord -> Timesheet -> Future Invoice and Payment workflows

StaffingCalendarEvent points to authoritative source records. It must not become the authoritative source itself.

## 8. Status Model

Approved status labels:

- draft
- submitted
- awaiting_contract
- awaiting_payment_verification
- under_admin_review
- needs_correction
- approved
- published_to_workers
- offer_viewed
- worker_accepted
- assigned
- worker_en_route
- arrived
- in_progress
- completed
- awaiting_timesheet_approval
- approved_for_billing
- paid
- cancelled
- disputed

Status ownership:

- Draft, submitted, awaiting_contract, awaiting_payment_verification: client request and admin intake boundary.
- Under_admin_review, needs_correction, approved: admin review boundary.
- Published_to_workers, offer_viewed, worker_accepted: WorkerOffer boundary.
- Assigned: Assignment boundary.
- Worker_en_route, arrived, in_progress, completed: Attendance boundary.
- Awaiting_timesheet_approval: Timesheet boundary.
- Approved_for_billing: future invoice/billing boundary.
- Paid: future payment execution boundary.
- Cancelled and disputed: current authoritative workflow state.

## 9. Permissions

Client can:

- Create own calendar draft.
- Submit own staffing request.
- View own request status.
- View own authorized assignment status.
- View assigned-worker minimum necessary data after assignment.

Client cannot:

- View worker pay.
- View platform margin.
- View internal admin notes.
- View AI scoring internals.
- Publish worker offers.
- Assign workers directly unless a future approved workflow allows it.

Admin can:

- View all operational calendar entries within authorized scope.
- Validate client request readiness.
- Review economics split.
- Publish, pause, cancel, return for correction, or reprice under policy.
- Approve or reject AI recommendation.

Admin cannot:

- Bypass audit.
- Execute payments from calendar.
- Mutate historical Assignment, Attendance, or Timesheet records from calendar.

Worker can:

- View eligible worker-facing offers.
- Accept or decline own offers.
- View own confirmed calendar.
- View own arrival and attendance handoff details.

Worker cannot:

- View client billing.
- View platform margin.
- View other workers' schedules or offer decisions.
- Modify assignment history.
- Self-publish offers.

## 10. Privacy Boundaries

Client-facing privacy:

- Assigned-worker details appear only after authorized assignment.
- Client never sees worker pay, margin, internal pricing, or unrelated worker profile data.

Worker-facing privacy:

- Worker sees only operationally necessary job details.
- Worker never sees client payment method, client bill rate, or platform margin.

Admin privacy:

- Admin sees economics only where role permissions allow.
- Sensitive fields require audit and least-privilege access.

Location privacy:

- Precise address is visible to workers only when operationally required.
- Approximate distance may be shown before acceptance where safe.
- Location snapshots must avoid exposing unrelated client or resident data.

## 11. Money Visibility Boundary

The calendar may display different money views by participant, but must not execute money.

Client view:

- Client rate.
- Client transportation line items where configured.
- Invoice readiness status after future billing phase.

Worker view:

- Worker wage.
- Worker transportation compensation where configured.
- Estimated worker-facing earnings only.

Admin view:

- Client billing terms.
- Worker offer terms.
- Margin-sensitive calculations only in authorized admin contexts.

Prohibited:

- Client sees worker pay.
- Worker sees client bill rate.
- Calendar calculates payroll.
- Calendar executes payment.
- Calendar marks paid without future payment settlement reference.
- Calendar bypasses Money Engine integer minor-unit model.

## 12. AI Governance

AI may:

- Rank eligible workers.
- Explain match evidence.
- Identify unfilled jobs.
- Recommend wage adjustment or completion bonus.
- Explain recommendation, confidence, evidence, uncertainty, missing information, alternatives, and non-recommendation reasons.

AI must never:

- Auto-assign a worker.
- Publish an offer.
- Change compensation.
- Bypass admin approval.
- Use protected characteristics.
- Use retaliation history, complaints, investigations, disability, health information, or unrelated personal data.
- Hide uncertainty.

Every AI recommendation and admin decision must be logged with actor, timestamp, model version, evidence, reviewer, decision, and final outcome.

## 13. Map and Location Boundary

The calendar should support provider-neutral location references.

Client:

- Selects and confirms job address.
- Sees map for the requested job location.

Admin:

- Verifies location and transportation terms against contract.
- Confirms whether exact location may be disclosed to workers.

Worker:

- Sees distance and map location necessary to evaluate and perform the job.
- Receives precise operational location only after visibility rules allow it.

No specific map provider is approved by this document.

## 14. Schema Impact

Implementation will require schema changes. Therefore implementation must stop at the schema gate before coding.

Likely new models:

- StaffingCalendarEvent
- StaffingRequestCalendarDraft
- CalendarPublishingDecision
- AiCalendarRecommendation
- CalendarLocationSnapshot

Likely enum additions:

- CalendarAudienceType
- CalendarSourceType
- CalendarEventStatus
- CalendarVisibilityLevel
- CalendarDecisionType
- AiRecommendationReviewDecision

Affected existing models:

- JobRequest
- DispatchReview
- WorkerOffer
- Assignment
- AttendanceRecord
- Timesheet
- AuditEvent or existing audit strategy

No schema change is authorized by this document.

## 15. API Impact

Likely future API groups:

- Client calendar drafts.
- Client request submission from calendar.
- Admin calendar review.
- Admin publishing decisions.
- Worker offer calendar.
- Worker confirmed calendar.
- AI recommendation review.
- Calendar projections.

The API must not expose invoice, payment, payroll, or money execution routes as part of this phase.

## 16. Money Engine Impact

Calendar money fields must use the shared Money Engine model:

- integer amountMinor
- currency
- no floats
- no mixed-currency arithmetic
- convert-then-sum where conversion is approved

Money Engine adoption does not authorize payment execution.

Calendar implementation must preserve:

- C1 no economics leak
- C3 one money model
- C5 no paid without real settlement reference
- C7 frozen terms
- C8 no double allocation
- S4 append-only audit

## 17. Accessibility and Responsive Requirements

All calendar surfaces must support:

- keyboard navigation
- visible focus
- touch targets at least 44px
- screen-reader labels for calendar cells and map controls
- non-color-only status communication
- responsive month, week, day, list, and detail modes
- mobile worker-first layout
- desktop admin scanning layout
- client request editor with clear validation messages

## 18. Testing Strategy

Required failing-first tests:

- Client cannot see worker pay or platform margin.
- Worker cannot see client billing, payment data, or internal notes.
- AI recommendation cannot publish without admin approval.
- Worker accept does not create Assignment by itself unless authoritative Assignment transaction is executed.
- Assigned status cannot appear without Assignment.
- Paid status cannot appear without future payment settlement reference.
- Calendar event cannot mutate source record history.
- Cancelled and disputed statuses preserve audit history.
- Map visibility respects audience.
- Mobile pressables and web buttons are either active or explicitly disabled.

Required validation:

- typecheck
- lint
- unit tests
- API tests
- integration tests
- calendar permission tests
- privacy tests
- money boundary tests
- accessibility tests
- build
- validate:boundaries
- scan:secrets
- git diff --check

## 19. Recommended Implementation Sequence

1. Calendar architecture approval.
2. Schema proposal with rollback and migration impact.
3. Calendar permissions.
4. Client calendar and staffing-request editor.
5. Admin calendar review and publishing.
6. Worker offer and confirmed calendar.
7. Provider-neutral location and map integration.
8. AI recommendation review.
9. Financial handoff labels only after future invoice and payment engines are authorized.

## 20. Migration Risks

Risks:

- Calendar projection can accidentally become an alternate source of truth.
- Readiness flags can become hidden workflow authority.
- Client and worker money views can leak economics.
- AI recommendation can be mistaken for approval.
- Location details can expose private data too early.
- Paid status can appear before real settlement.

Mitigations:

- Projection-only model.
- Strict sourceType and sourceId links.
- Audience-specific payload tests.
- Append-only admin decision history.
- Money boundary tests.
- Location visibility levels.
- Explicit future payment settlement dependency.

## 21. Owner Decisions Required

Before implementation, owner must approve:

1. Whether StaffingCalendarEvent is stored or generated dynamically.
2. Whether client calendar drafts are separate from JobRequest drafts.
3. Exact status labels exposed to client, admin, and worker.
4. Whether map provider is selected now or deferred behind provider-neutral references.
5. Whether client rate entry is allowed before payment method readiness.
6. Whether transportation time and transportation compensation are separate fields.
7. Whether AI wage and bonus recommendations are stored before admin review.
8. Whether completion bonus is a future worker-offer term or later payroll/payable term.
9. Whether paid status is hidden until Payment Execution exists.
10. Retention period for calendar projections and location snapshots.
11. Role permission names for client, admin, and worker calendar access.
12. Whether exact address disclosure occurs before or after worker acceptance.
13. Canada counsel review requirements for wage adjustment, bonus, transportation compensation, GST/QST, payroll, and worker classification.

## 22. Readiness Verdict

CONNECTED CALENDAR ARCHITECTURE READY FOR OWNER REVIEW

Implementation must not begin until the owner approves this architecture and separately authorizes the schema proposal phase.
