# Resident Job Master Operational Workflow

Status: FINAL OWNER GOVERNANCE BEFORE BACKEND
Accepted workflow addendum commit: `7addaea`
Purpose: Governing operational reference for future schema, APIs, backend services, frontend integration, admin operations, AI functions, finance calculations, and reporting.

This document is documentation only. It does not change the approved schema proposal, frontend code, backend code, APIs, migrations, tests, package configuration, or environment files.

## 1. Platform Operating Principle

Resident Job operates as an admin-governed staffing operating system.

The client/employer requests work. Admin reviews, validates, and dispatches. The worker voluntarily accepts a Worker Offer and performs the work. The employer confirms completion after attendance and timesheet review. The system calculates billing through governed policy. Employer payment and worker compensation remain separate.

Non-negotiable principles:

- Admin is the dispatcher and operational controller.
- Employer creates, submits, and confirms the Job Request.
- Worker voluntarily accepts the Worker Offer.
- AI assists but does not authorize.
- Financial calculations are governed by configurable policy.
- No authoritative state may be created by UI display alone.
- Job Request is the central business object.
- Shift is a derived operational schedule, not the top-level commercial object.
- Assignment is not the Job Request.
- Worker Offer is not Assignment.
- Attendance is not Timesheet approval.
- Invoice is not Payment.
- Employer Payment is not Worker Payable.

## 2. Canonical Master Flow

```text
Employer Dashboard
-> Work-Group Capsule
-> Role Selection
-> Job Request Order
-> Employer Review
-> Submit
-> Admin Intake
-> Admin Validation
-> Information Required if incomplete
-> Approved for Dispatch
-> Worker Search
-> Worker Offer
-> Worker Calendar Offer
-> Worker Accepts or Declines
-> Assignment Created
-> Employer Assignment Confirmation
-> Upcoming Assignment
-> Arrival Window
-> Punch In
-> Shift In Progress
-> Break
-> Punch Out
-> Draft Timesheet
-> Employer Review
-> Completion Confirmation or Issue
-> Final Charge Calculation
-> Invoice
-> Employer Payment
-> Worker Payable
-> Reporting
-> Archive
```

### Transition Controls

| Transition | Actor | Source State | Target State | Required Conditions | Authoritative System | Audit | Notification | Failure / Retry | Human Approval |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Dashboard to capsule | Employer | Authenticated | Work group selected | Active account, authorized organization membership | Employer UI | Optional navigation audit | None | Return to dashboard | No |
| Capsule to role | Employer | Work group selected | Role selected | Role exists in approved catalogue | Job request workflow | No authoritative audit until draft save | None | Pick another role | No |
| Role to Job Request draft | Employer | Role selected | Draft | Residence/department context available or selectable | Job Request | Create draft audit | None | Save blocked until required context | No |
| Employer review to submit | Employer | Draft | Submitted | Required employer fields complete | Job Request | Submitted audit | Admin intake notification | Validation errors return to draft | Yes, employer |
| Submit to Admin Intake | System/Admin | Submitted | Admin Review | Submitted request received | Job Request/Admin Intake | Intake audit | Admin queue notification | Retry queue if notification fails | Yes, admin review begins |
| Validation incomplete | Admin | Admin Review | Information Required | Missing/unsafe/contradictory information | Job Request | Reason audit | Employer clarification notification | Employer resubmits | Yes |
| Validation approved | Admin | Admin Review | Approved for Dispatch | Required fields, safety, contact, commercial, authorization state checked | Dispatch Review | Approval audit | Optional employer status notification | Return to information required if blocked | Yes |
| Dispatch starts | Admin | Approved for Dispatch | Dispatching | Dispatch permission and worker search criteria available | Dispatch | Dispatch-start audit | None | Retry search/adjust criteria | Yes |
| Worker offer created | Admin | Dispatching | Worker Offer Draft/Approved | Candidate reviewed, offer terms confirmed | Worker Offer | Offer creation audit | None until sent | Select different worker | Yes |
| Worker offer sent | Admin | Worker Offer Approved | Sent / Offer Pending | Worker calendar conflict checked, offer terms approved | Worker Offer / Worker Calendar | Sent audit | Worker offer notification | Retry delivery without changing offer state | Yes |
| Worker views offer | Worker | Sent | Viewed | Worker opens offer | Worker Offer | Viewed audit | Optional admin visibility | Offer remains sent if tracking unavailable | No |
| Worker declines | Worker | Sent/Viewed | Declined | Explicit decline action | Worker Offer | Decline audit | Admin notification | Admin dispatches another worker | Yes, worker |
| Worker accepts | Worker | Sent/Viewed | Accepted | Explicit acceptance, no conflict, offer not expired | Worker Offer | Acceptance audit | Admin notification | Conflict returns to review | Yes, worker |
| Assignment created | System/Admin | Accepted Offer | Pending Worker Acceptance / Accepted | Accepted offer and schedule lock | Assignment | Assignment audit | Employer assignment pending/confirmed notification | Idempotent creation retry | Yes, human offer/acceptance already occurred |
| Employer confirmation view | System | Accepted Assignment | Confirmed to Employer | Employer-visible worker projection approved | Assignment | Confirmation audit | Employer notification | Retry notification only | No new approval |
| Upcoming to arrival | System | Scheduled | Arrival Window | Current time enters approved window | Assignment/Attendance | State audit | Worker reminder | Retry state evaluation | No |
| Punch In | Worker | Arrival Window | Punched In / In Progress | Worker action, assignment active, evidence captured per policy | Attendance | Punch-in audit | Employer status notification | Fallback/manual review if failure | Yes, worker action |
| Break start/end | Worker/System | In Progress | Break / In Progress | Break policy and worker action where required | Break Record | Break audit | Usually none | Missing break exception | Worker or policy-driven |
| Punch Out | Worker | In Progress | Punched Out / Awaiting Timesheet Review | Worker action or governed fallback | Attendance | Punch-out audit | Timesheet-ready notification | Manual review if failure | Yes, worker action |
| Draft Timesheet | System | Punched Out | Draft Timesheet | Attendance evidence available | Timesheet | Generation audit | Employer review notification | Retry generation idempotently | No |
| Employer review | Employer | Draft/Employer Review | Completion Confirmed or Issue | Employer reviews time, breaks, transport, exceptions | Completion Review | Review audit | Worker/admin notification if issue | Clarification path | Yes, employer |
| Final calculation | System/Admin | Completion Confirmed | Final Calculation | Approved timesheet, policy set, commercial terms | Calculation Result | Calculation audit | Finance/admin notification if exception | Recalculate with versioned policy | Human review required for exceptions |
| Invoice issued | Finance/System | Final Calculation | Invoice Issued | Final calculation reviewed/approved | Invoice | Invoice audit | Employer invoice notification | Retry issue/export only | Yes where finance policy requires |
| Employer payment | Employer/System | Invoice Issued | Payment Processing/Settled | Payment method/authorization, final amount | Employer Payment | Payment audit | Receipt/failure notification | Retry according to provider policy | Human/payment authorization required |
| Worker payable | Finance/System | Approved worker calculation | Payable Created/Scheduled/Paid | Worker calculation approved; payout workflow available | Worker Payable | Payable audit | Worker status notification | Hold/retry/manual review | Human/finance policy where required |
| Reporting | System | Governed records | Read-only report | Source data available | Reporting | Report access/export audit | None unless scheduled | Report unavailable/stale state | No |
| Archive | System/Admin | Closed/Reconciled | Archived | Retention policy permits archive | Archive/Retention | Archive audit | None or policy notification | Retain if legal hold | Yes for governed archive |

## 3. Work-Group Capsule Model

Work-group capsules are large, touch-first entry points for employer staffing requests.

| Group Identifier | Display Label | Visual Treatment | Common Roles | Role Search | Qualification Summary | Safety Requirements | Default Template | Touch / Mobile / Accessibility | Admin Configuration Boundary |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `kitchen` | Kitchen | Food/service icon, high-contrast card | Chef, Sous-chef, Cook, Kitchen helper, Dishwasher | Search roles within Kitchen first | Food handling, kitchen experience, language where lawful | Safety shoes, gloves, uniform, equipment | Kitchen shift/request template | Minimum 44px targets, readable labels, keyboard and screen-reader role list | Admin may configure roles/templates; employer cannot create hidden roles |
| `care_nursing` | Care / Nursing | Care/clinical icon, professional tone | Nurse, Licensed practical nurse, Personal support worker, Care aide | Search care roles with qualification hints | Licence/certification/security requirements where applicable | Orientation, PPE, lawful physical/operational requirements | Care/nursing request template | Clear warnings for regulated role requirements | Admin controls regulated role catalogue |
| `housekeeping_support` | Housekeeping / Support | Support/service icon | Housekeeper, Laundry worker, Dining-room aide, General support | Search support roles | Experience, language, facility requirements | Gloves, uniform, equipment, safety notes | Support request template | Simple one-handed selection on mobile | Admin configures display roles |
| `maintenance` | Maintenance | Tools/facility icon | General maintenance, Repair technician, Facility support, Emergency maintenance | Search maintenance roles | Trade/safety/equipment requirements where applicable | Safety shoes, tools, PPE, emergency notes | Maintenance request template | Prominent urgency path without guarantee language | Admin configures emergency/urgent labels |

Clarifications:

- Work Group != Role.
- Role != Qualification.
- Role Selection != Worker Selection.
- Operational work roles must not be confused with authorization roles.

## 4. Job Request As Source Of Truth

Job Request is the top-level client order and source from which derived workflow objects are created.

### Field Visibility Matrix

| Category | Fields / References | Employer Visible | Worker Visible | Admin Only | Finance Only | Restricted / Sensitive |
| --- | --- | --- | --- | --- | --- | --- |
| Identity and scope | Employer organization, residence/worksite, department, work group, selected role, number of workers, request creator, contact person | Yes | Limited to approved worksite/contact after offer | Yes | Limited invoice context | Creator/contact phone may be restricted |
| Job content | Job title, description, responsibilities, special instructions, notes, required experience, qualifications, certifications, background/security requirement, language requirement, orientation, equipment/safety | Yes | Worker-approved subset | Yes | No unless billing context | Requirements must be lawful and neutral |
| Schedule | Single/multi-day, recurring flag, start/end date/time, timezone, arrival time, breaks, overtime possibility, holiday status | Yes | Yes, worker terms only | Yes | Yes for calculation | Policy-sensitive when tied to labour rules |
| Workplace | Approved location, entrance, parking, meal, refreshments, transportation, allowance, travel time, uniform, safety shoes, gloves, PPE, tools/equipment | Yes | Yes if relevant to work | Yes | Charges/allowances only | Exact details limited by assignment policy |
| Commercial | Employer charge method/rate, urgent premium, overtime, holiday, transport charge, travel charge, taxes, estimated total, authorization status | Yes | No employer commercial details | Yes | Yes | Employer contract, markup, margin restricted |
| Operational | Admin notes, dispatch priority, urgency, fill status, cancellation terms, issue state | Limited | Limited worker-facing terms | Yes | Limited if financial effect | Admin notes/internal risk restricted |

Job Request must not be replaced by Shift as the commercial source of truth.

## 5. Job Request States

| State | Meaning | Owner | Allowed Actions | Prohibited Actions | Next States | Audit Event | Notification | Billing May Begin | Worker Offers May Exist | Assignments May Exist |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Draft | Employer is preparing request | Employer | Edit, save, discard | Dispatch, offer, invoice | Submitted, Cancelled | Draft create/update | None | No | No | No |
| Submitted | Employer submitted request | Employer/System | Admin intake | Worker offer, invoice | Admin Review, Information Required, Cancelled | Submit | Admin notified | No | No | No |
| Admin Review | Admin validating request | Admin | Validate, clarify, approve for dispatch, reject/return | Assign worker, charge employer | Information Required, Approved for Dispatch, Cancelled | Review start/action | Employer if clarification | No | No | No |
| Information Required | Request needs clarification | Admin/Employer | Employer edits requested fields | Dispatch, offer, invoice | Submitted, Cancelled | Clarification reason | Employer notified | No | No | No |
| Approved for Dispatch | Admin approved dispatch | Admin | Start dispatch | Invoice, payment | Dispatching, Cancelled, Expired | Approval | Optional employer status | No | Not yet | No |
| Dispatching | Admin searching/selecting workers | Admin | Search, compare, draft offers | Auto-assign, charge | Offered to Workers, Unfilled, Cancelled | Dispatch activity | Optional internal | No | Draft/approved offers may exist | No confirmed assignments |
| Offered to Workers | One or more offers sent | Admin/Worker | Worker view/accept/decline, admin monitor | Treat as accepted | Partially Filled, Filled, Unfilled, Expired, Cancelled | Offer sent | Worker notified | No | Yes | Pending only after acceptance |
| Partially Filled | Some requested workers accepted | Admin | Continue dispatch, employer visibility per policy | Close as complete if staffing still missing | Filled, In Progress, Unfilled, Cancelled | Partial fill | Employer/admin notified | No | Yes | Yes |
| Filled | Required worker count accepted/assigned | Admin/System | Confirm to employer, schedule attendance | Assume work performed | Confirmed, Cancelled | Filled | Employer notified | No | Yes | Yes |
| Confirmed | Employer can see confirmed assignment projection | System | Show assignment, prepare attendance | Invoice, payable | In Progress, Cancelled, Replacement Required | Confirmation | Employer/worker reminders | No | Accepted offers only | Yes |
| In Progress | At least one assignment is underway | Worker/System | Attendance updates, monitor exceptions | Complete/invoice without punch-out/review | Awaiting Completion Review, Exception Review, Cancelled | Attendance state | Employer/admin status | No | No new offer unless replacement | Yes |
| Awaiting Completion Review | Work ended, review needed | Employer | Review timesheet/completion, report issue | Auto-charge | Completed, Exception Review | Review-ready | Employer notified | No | No | Yes |
| Completed | Employer/admin workflow completed | Employer/Admin/System | Final calculation, invoice handoff | Change evidence silently | Archived | Completion | Finance notified | Yes after calculation | No | Yes |
| Exception Review | Issue/dispute/replacement path | Admin/Employer/Worker | Investigate, resolve, correct, cancel | Hide original evidence | Completed, Cancelled, Replacement Required | Exception | Affected parties | No final billing until resolved where applicable | Possible replacement offers | Yes |
| Cancelled | Request cancelled | Employer/Admin/System | Archive, apply cancellation policy | Dispatch new offers | Archived | Cancel | Parties notified | Only governed cancellation charges | No active offers | Cancel assignments |
| Unfilled | Unable to fill | Admin | Retry, revise, cancel | Show as filled | Dispatching, Cancelled, Expired | Unfilled | Employer notified | No | Prior expired/declined offers | No confirmed assignments |
| Expired | Request expired before fulfillment | System/Admin | Archive or re-open by policy | Dispatch without review | Archived, Submitted where re-open policy allows | Expiry | Employer/admin notified | No unless policy charge | No active offers | No |
| Archived | Retained closed state | System/Admin | Read per retention | Mutate source workflow | None | Archive | None | No new billing | No | Historical only |

Do not reuse Shift states as Job Request states without explicit mapping.

## 6. Admin Intake And Validation

Admin responsibilities:

- Review submitted Job Request.
- Verify required information.
- Request clarification.
- Verify operational feasibility.
- Verify role and qualification requirements.
- Verify safety requirements.
- Confirm worker-facing offer.
- Review client commercial terms.
- Approve dispatch.
- Reject or return invalid request.
- Preserve audit trail.

Admin must see:

- missing fields
- contradictory dates
- invalid duration
- qualification gaps
- unsafe instructions
- unclear transport terms
- incomplete contact information
- missing payment authorization state
- labour-policy warnings
- scheduling conflicts

Admin approval does not assign a worker, equal worker consent, confirm completion, or authorize payment settlement.

## 7. Dispatch

Dispatch is the admin-controlled process of locating suitable workers.

Dispatch may use worker role, qualifications, verification status, availability, calendar conflicts, service area, travel suitability, transport constraints, prior acceptance state, approved reliability indicators, client-specific requirements, and urgency.

Dispatch must not use protected characteristics, retaliation history, unrelated complaints, disability, health information, or unrelated personal data.

| Concept | Purpose | Authority | Status | Privacy Boundary | Audit Behavior |
| --- | --- | --- | --- | --- | --- |
| DispatchReview | Admin review record for dispatch readiness | Admin | Draft, Approved, Returned, Cancelled | Admin/commercial details restricted | Every decision and reason audited |
| WorkerCandidate | Worker considered for offer | Admin/System advisory | Suggested, Reviewed, Selected, Skipped | Minimum worker summary only | Candidate review and skip reason audited where stored |
| WorkerOffer | Deliberate worker-facing offer | Admin sends, Worker responds | Draft, Approved, Sent, Delivered, Viewed, Accepted, Declined, Expired, Withdrawn, Cancelled | Worker sees worker terms only | Sent/view/accept/decline audited |
| DispatchAttempt | Attempt to fill one or more slots | Admin | Started, Offers Sent, Partial, Filled, Failed | Internal dispatch details restricted | Attempt lifecycle audited |
| ReplacementDispatch | Dispatch for replacement need | Admin | Requested, Reviewing, Offered, Replaced, Failed, Cancelled | Does not expose prior worker private issue | Replacement reason and outcome audited |

## 8. Worker Offer

Worker Offer is a deliberate offer sent to a worker.

Worker-visible terms:

- role
- duties
- residence or worksite
- department
- schedule
- break
- worker offer rate
- premium
- transport or travel allowance
- safety requirements
- qualification requirements
- contact instructions
- offer expiry
- cancellation terms
- special instructions

Worker must not see employer contract price, platform margin, employer payment method, internal commercial notes, other workers' information, internal admin scoring, or unrelated client information.

Worker Offer states:

- Draft
- Approved
- Sent
- Delivered
- Viewed
- Accepted
- Declined
- Expired
- Withdrawn
- Cancelled

Clarifications:

- Offer Sent != Offer Viewed.
- Offer Viewed != Accepted.
- Accepted Offer != Attendance.

## 9. Worker Calendar

When a Worker Offer is sent:

- It appears in the worker calendar as an offer.
- It does not block the calendar as confirmed unless approved policy allows a temporary hold.
- It shows offer expiry.
- The worker can open full details.
- The worker can accept or decline.

After acceptance:

- The calendar entry becomes confirmed.
- Conflicts are checked atomically.
- Admin is notified.
- Employer assignment view updates.
- Assignment becomes active according to its state flow.

Worker calendar states:

- Available
- Offer Pending
- Temporarily Held
- Confirmed Assignment
- In Progress
- Completed
- Cancelled
- Exception

Conflict rules:

- A worker cannot accept overlapping confirmed assignments.
- Offer display alone must not double-book the worker.
- Temporary holds require explicit owner policy.
- Acceptance must re-check conflicts at the authoritative backend boundary.
- Separate UI actions must not bypass conflict checks.

## 10. Assignment

Assignment is created only after approved dispatch and worker acceptance.

Assignment must reference:

- Job Request
- specific job schedule or shift instance
- worker
- worker offer
- employer organization
- residence
- department
- role
- compensation terms
- operational terms
- status
- acceptance evidence
- timestamps

Assignment states:

- Pending Worker Acceptance
- Accepted
- Confirmed to Employer
- Scheduled
- Arrival Window
- In Progress
- Completed
- Exception Review
- Cancelled
- Replacement Required
- Archived

Replacement behavior:

- Replacement must create or reference a replacement dispatch path.
- Replacement must not silently overwrite the previous Assignment.
- Previous assignment state, reason, evidence, and worker response remain retained.
- Replacement may apply to one instance, one day, or remaining days depending on approved policy.

## 11. Employer Assignment View

After worker acceptance, Employer may see:

- worker display name
- approved photo if governed
- role
- qualification summary
- verification status
- assignment status
- expected arrival
- attendance status
- support contact
- replacement status

Employer must not see government identification, banking, tax information, home address, private worker notes, internal admin investigations, unrelated complaints, or internal worker compensation agreements.

## 12. Attendance

Attendance sequence:

```text
Scheduled
-> Arrival Window
-> Eligible to Punch In
-> Punched In
-> In Progress
-> Break
-> Punched Out
-> Awaiting Timesheet Review
```

Attendance must track scheduled time, actual event time, source, device reference if governed, approved location evidence if lawful, manual adjustment, manager confirmation, exception, actor, and audit event.

Rules:

- Do not implement continuous location tracking.
- Punch In != Proof of performance.
- Punch Out != Completion approval.
- Attendance evidence does not equal timesheet approval.

## 13. Breaks

Breaks must be explicit.

Supported concepts:

- paid break
- unpaid break
- expected duration
- actual duration
- missing break
- extended break
- employer instruction
- worker note
- policy result

Rules:

- Do not assume every break rule is identical.
- Break calculation must be policy-driven.
- Break evidence remains separate from final pay and billing calculation.

## 14. Timesheet

Timesheet derives from approved attendance evidence.

Timesheet includes:

- scheduled hours
- actual hours
- break
- overtime
- travel time
- transportation
- adjustments
- worker note
- employer note
- original values
- corrected values
- versions
- approval history

States:

- Draft
- Worker Review
- Employer Review
- Clarification Requested
- Corrected
- Approved
- Disputed
- Locked
- Finance Ready

Rules:

- No silent hour reduction.
- Adjustment requires reason.
- Original value retained.
- Audit required.
- Dispute pauses final settlement where applicable.

## 15. Employer Completion Review

After Punch Out, the employer sees shift completion status, scheduled vs actual time, break, overtime, transport, exceptions, notes, and preliminary charge.

Employer actions:

- Confirm Job Completed.
- Report an Issue.
- Request Clarification.

Authoritative flow:

```text
Punch Out
-> Timesheet
-> Employer Completion Review
-> Exception Resolution
-> Final Calculation
-> Charge Authorization
-> Invoice
-> Payment Settlement
```

Rules:

- The system must not automatically charge solely because the worker punched out.
- Completion review timeout requires owner policy and must not be invented in implementation.
- Admin-review fallback is required when employer response is missing and policy allows escalation.

## 16. Multi-Day And Recurring Jobs

For multi-day jobs:

- One Job Request may contain multiple schedule instances.
- Each day has a separate Assignment instance or governed attendance instance.
- Each day has separate attendance.
- Exceptions are day-specific.
- Overall Job Request remains open.
- Partial invoice behavior must be policy-controlled.
- Replacement may apply to one day or all remaining days.

For recurring jobs:

- A recurring template generates schedule instances.
- Accepted assignment instances remain protected.
- Future changes require governed scope.
- Cancellation scope must be explicit.
- Holiday effects and rate changes require policy handling.

Clarification:

- Recurring Template Change != Automatic Change to Accepted Assignment.

## 17. Commercial Privacy Boundaries

| Viewer | May See | Must Not See |
| --- | --- | --- |
| Employer | Employer rate, employer premiums, taxes, transportation charge, travel charge, estimated invoice, final invoice, payment status | Worker private compensation agreement, worker banking, internal platform margin unless authorized |
| Worker | Worker offer, worker premium, worker allowance, estimated payable, payable status | Employer contract price, client agreement, employer payment method, internal margin |
| Admin | Both sides where authorized, margin, commercial exceptions, reconciliation | Data outside role/purpose scope |
| AI | Minimum necessary data only | Secrets, protected personal data, hidden commercial details not needed for the task |

Field-level visibility must be defined before implementation for every commercial, compensation, tax, transport, and note field.

## 18. Quebec Policy Engine

Future policy engine capabilities:

- regular hours
- overtime
- statutory holiday
- paid break
- unpaid break
- call-in or reporting minimum if applicable
- travel time
- transportation allowance
- gas or mileage
- urgent premium
- role agreement
- client agreement
- worker agreement

Every policy must contain:

- policy key
- jurisdiction
- source
- effective date
- expiry date
- value
- formula
- rounding
- priority
- applicability conditions
- approval status
- version
- explanation text
- audit reference

AI may interpret or explain the result. AI must not create the binding legal rule.

Before implementing Quebec calculations, separate legal-policy approval is required.

## 19. Financial Calculation

Calculation sequence:

```text
Approved Timesheet
-> Applicable Policy Set
-> Employer Charge Calculation
-> Worker Payable Calculation
-> Difference / Margin
-> Tax Calculation
-> Review
-> Finalization
```

Employer charge and Worker payable must be separate calculations.

CalculationResult must include inputs, policy versions, line items, subtotal, taxes, adjustments, total, explanation, calculation time, actor/system, and review status.

No calculation result alone may move money.

## 20. Employer Payment

Payment flow:

```text
Estimated Amount
-> Payment Method on File
-> Authorization
-> Final Amount
-> Charge Submission
-> Processing
-> Settlement
-> Receipt
-> Reconciliation
```

States:

- Method Required
- Authorization Pending
- Authorized
- Charge Ready
- Processing
- Settled
- Failed
- Retry Required
- Refunded
- Disputed
- Reconciled

Rules:

- Do not select a provider in this document.
- Do not store full card data.
- Payment provider choice remains an owner decision.

## 21. Worker Payable

Worker Payable is created only after approved timesheet and final worker calculation.

States:

- Pending Timesheet Approval
- Finance Ready
- Payable Created
- Scheduled
- Processing
- Paid
- Failed
- On Hold
- Disputed
- Reconciled

Rules:

- Worker Payable must not be marked paid because Employer Payment settled unless the payout actually occurred.
- Worker Payable remains separate from employer invoice and employer payment records.

## 22. Invoice And Receipt

Invoice must reference:

- Job Request
- Assignment or assignments
- Timesheet or timesheets
- calculation result
- employer
- residence
- taxes
- line items
- payment status

Invoice states:

- Pending Generation
- Draft
- Issued
- Due
- Partially Paid
- Paid
- Failed
- Overdue
- Disputed
- Voided

Receipt is generated only after settlement evidence.

## 23. Admin Calendar

Admin requires an operational calendar showing:

- submitted Job Requests
- dispatching requests
- worker offers
- accepted assignments
- unfilled requests
- replacement requirements
- attendance exceptions
- completion reviews
- finance-ready jobs

Admin calendar must not be the same as worker calendar.

Filters and grouping:

- status
- date
- residence
- department
- work group
- urgency
- dispatch owner
- exception type
- completion-review status
- finance readiness

## 24. AI Brain

AI may:

- validate Job Request completeness
- suggest roles
- suggest qualification requirements
- recommend workers
- explain conflicts
- flag risks
- estimate charges
- explain policy output
- identify possible overtime
- summarize completion
- assist invoice preparation
- detect inconsistencies

AI must not:

- create authoritative Job Request state
- approve dispatch
- send an offer without authorized action
- accept for a worker
- assign automatically
- edit attendance evidence
- approve timesheet
- decide legal entitlement
- charge employer
- create payment settlement
- mark worker paid

Every AI recommendation must identify input source, freshness, policy/model version, confidence, limitations, and human decision required.

## 25. Notifications

Notification events:

| Event | Recipient | Trigger | Boundary |
| --- | --- | --- | --- |
| Job Request submitted | Admin | Job Request reaches Submitted | Notification does not create request |
| Information required | Employer | Admin moves request to Information Required | Notification does not edit request |
| Approved for dispatch | Employer/Admin | Admin approves dispatch | Notification does not assign worker |
| Worker Offer sent | Worker | Admin sends offer | Notification does not equal viewed/accepted |
| Offer accepted | Admin/Employer as policy allows | Worker accepts | Notification does not create payment |
| Offer declined | Admin | Worker declines | Notification does not penalize worker |
| Assignment confirmed | Employer/Worker | Assignment confirmed after acceptance | Notification does not alter assignment |
| Upcoming assignment | Worker | Reminder schedule | Notification failure does not cancel assignment |
| Punch-in exception | Admin/Employer as policy allows | Attendance exception | Notification does not decide misconduct |
| Punch-out exception | Admin/Employer as policy allows | Attendance exception | Notification does not approve timesheet |
| Timesheet ready | Employer | Draft timesheet ready | Notification does not approve hours |
| Clarification required | Worker/Employer/Admin | Review requests clarification | Notification does not change evidence |
| Completion confirmed | Worker/Admin/Finance | Employer confirms completion | Notification does not charge employer |
| Invoice issued | Employer | Invoice reaches Issued | Notification does not settle payment |
| Payment failed | Employer/Admin | Payment failure state | Notification does not retry by itself |
| Worker payable status | Worker | Payable status changes | Notification does not pay worker |
| Support escalation | Support/Admin | Escalation state | Notification does not resolve case |

Notification failure must not block authoritative workflow.

## 26. Exceptions

| Exception | Authoritative Actor | Preserved Records | Replacement Behavior | Financial Behavior | Notification | Audit |
| --- | --- | --- | --- | --- | --- | --- |
| No worker accepts | Admin | Job Request, offers, dispatch attempt | Retry, revise, or mark unfilled | No work charge unless approved cancellation policy | Employer/admin | Offer outcomes audited |
| Partial staffing | Admin | Request slots, accepted/declined offers | Continue dispatch for remaining slots | Bill only completed/approved work | Employer/admin | Partial fill audited |
| Worker cancels | Worker/Admin | Assignment, cancellation reason | Replacement dispatch | Policy-driven only | Employer/admin | Cancellation audited |
| Worker no-show | Admin/Employer/Attendance evidence | Assignment, attendance exception | Replacement dispatch | No automatic worker penalty or charge | Employer/admin/support | Exception audited |
| Late arrival | Attendance/Admin | Scheduled/actual times | Usually no replacement unless policy | Timesheet adjustment review | Employer/admin | Evidence audited |
| Safety refusal | Worker/Admin | Worker note, employer context, support case if needed | Review before replacement | No automatic punitive result | Admin/support | Safety issue audited |
| Employer changes requirements | Employer/Admin | Original and new request terms | May require new offers | Recalculate only after approval | Affected workers/admin | Change audited |
| Employer cancels | Employer/Admin | Cancellation time/reason | Cancel active offers/assignments by policy | Cancellation terms only | Worker/admin | Cancellation audited |
| Replacement needed | Admin | Prior assignment retained | New replacement assignment; no overwrite | Separate records | Employer/worker | Replacement audited |
| Missed Punch In | Worker/Admin | Assignment and fallback evidence | Review before conclusions | Timesheet exception | Employer/admin | Exception audited |
| Missed Punch Out | Worker/Admin | Punch-in and fallback evidence | Not replacement unless active issue | Timesheet exception | Employer/admin | Exception audited |
| Timesheet dispute | Employer/Worker/Admin | Original and disputed values | No replacement unless operational issue | Pause final settlement where applicable | Parties/admin | Dispute audited |
| Payment failure | Payment/Admin | Invoice, payment attempt | No staffing replacement | Retry/hold/review | Employer/admin | Payment attempt audited |
| Worker payable hold | Finance/Admin | Payable and reason category | No assignment effect | Hold until resolved | Worker/admin | Hold audited |
| Multi-day partial failure | Admin | Day-level attendance/exception | Replace one day or remaining days by policy | Partial billing/payable by policy | Parties/admin | Day-specific audit |

## 27. Audit

Every authoritative action must create an audit event.

Audit event fields:

- actor
- role
- organization
- entity type
- entity identifier
- prior state
- new state
- reason
- timestamp
- source
- correlation identifier
- policy version where relevant

Rules:

- Audit records are immutable.
- UI history is not authoritative audit.
- Audit must not expose secrets or restricted content beyond role authorization.

## 28. Reporting

Reports derive from authoritative data.

Reports may include:

- request volume
- fill rate
- time to fill
- worker acceptance
- no-show
- attendance exceptions
- completed hours
- overtime
- employer invoice totals
- payment status
- worker payable status
- margin
- role demand
- residence demand

Reports must not become the source of truth and must not mutate operations, finance, assignments, or payments.

## 29. Archive And Retention

Lifecycle closure:

```text
Completed
-> Reconciled
-> Closed
-> Archived
```

Retention categories:

| Category | Retention Position |
| --- | --- |
| Job Request | Retain as central order record; archive after closure |
| Offers | Retain accepted/declined/expired state history |
| Assignments | Retain operational assignment evidence |
| Attendance | Retain evidence and exceptions by policy |
| Timesheets | Retain original, corrected, approved, disputed versions |
| Invoices | Retain financial document history |
| Payments | Retain provider-safe payment state and settlement references |
| Payables | Retain worker payable state history |
| Audits | Retain immutable governance trail |
| Support | Retain cases by policy and privacy boundary |

Do not define legal retention periods without approved policy. Retention periods are owner/legal decisions.

## 30. Entity Impact Matrix

| Entity | Status Against Current Schema Proposal | Reuse Current Entity | Extension Needed | Truly New | Deferred | Not Needed | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| WorkGroup | Not proposed | No | No | Yes | Yes | No | Required for capsules |
| RoleDefinition | Proposed as access role | Partially | Yes | Possibly operational WorkRole | Yes | No | Access role != work role |
| JobRequest | Not proposed | No | No | Yes | Yes | No | New central business object |
| JobRequestRequirement | Not proposed | No | No | Yes | Yes | No | Structured requirements |
| JobSchedule | Not proposed | No | No | Yes | Yes | No | Derived shift/schedule instances |
| JobCommercialTerm | Not proposed | No | No | Yes | Yes | No | Employer commercial terms |
| JobSafetyRequirement | Not proposed | No | No | Yes | Yes | No | Safety/PPE/orientation |
| JobContact | Not proposed | No | No | Yes | Yes | No | Onsite contact/instructions |
| DispatchReview | Not proposed | No | No | Yes | Yes | No | Admin review checkpoint |
| WorkerOffer | Not proposed | No | No | Yes | Yes | No | Separate from assignment |
| Assignment | Explicitly out of scope | No | No | Yes | Yes | No | Created after worker acceptance |
| WorkerCalendarEntry | Not proposed | No | No | Yes | Yes | No | Offer/assignment calendar projection |
| AttendanceRecord | Explicitly out of scope | No | No | Yes | Yes | No | Punch evidence |
| BreakRecord | Not proposed | No | No | Yes | Yes | No | Break evidence and policy |
| Timesheet | Explicitly out of scope | No | No | Yes | Yes | No | Derived from attendance |
| EmployerCompletionReview | Not proposed | No | No | Yes | Yes | No | Separates punch-out from billing |
| CalculationPolicy | Not proposed | No | No | Yes | Yes | No | Requires legal-policy approval |
| CalculationResult | Not proposed | No | No | Yes | Yes | No | No money movement by itself |
| Invoice | Explicitly out of scope | No | No | Yes | Yes | No | Derived after final calculation |
| EmployerPayment | Explicitly out of scope | No | No | Yes | Yes | No | Separate from invoice |
| WorkerPayable | Explicitly out of scope | No | No | Yes | Yes | No | Separate from employer payment |
| Notification | Explicitly out of scope | No | No | Yes | Yes | No | Informational only |
| SupportCase | Explicitly out of scope | No | No | Yes | Yes | No | Human support workflow |
| AuditEvent | Full audit out of scope; actor ref proposed | Actor reference only | Yes | Yes | Yes | No | Audit event persistence later |

Do not modify the current schema proposal silently.

## 31. API Impact Matrix

| Capability | Actor | Authorization | Input | Output | Idempotency Need | Concurrency Risk | Audit | Notification |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Create Job Request | Employer | Active org membership + create permission | Work group, role, org, residence, department | Draft Job Request | Yes, draft creation key | Duplicate drafts | Draft audit | None |
| Submit Job Request | Employer | Own org + submit permission | Completed draft | Submitted request | Yes | Double submit | Submit audit | Admin intake |
| Request Information | Admin | Admin intake permission | Reason and requested fields | Information Required | Yes | Employer edits during review | Clarification audit | Employer |
| Approve for Dispatch | Admin | Dispatch approval permission | Validated request | Approved for Dispatch | Yes | Parallel admin decisions | Approval audit | Employer/admin |
| Create Worker Offer | Admin | Dispatch permission | Worker, offer terms, schedule | Worker Offer | Yes | Worker conflict/change | Offer audit | None until sent |
| Accept Worker Offer | Worker | Offer recipient + active session | Offer acceptance | Accepted offer | Yes | Overlap/expiry | Acceptance audit | Admin |
| Create Assignment | System/Admin | Accepted offer + dispatch authority | Job request, worker, schedule | Assignment | Yes | Duplicate assignment | Assignment audit | Employer/worker |
| Record Punch In | Worker | Assigned worker | Attendance evidence | Punch-in record | Yes | Late/duplicate punch | Attendance audit | Employer/admin status |
| Record Punch Out | Worker | Assigned worker | Attendance evidence | Punch-out record | Yes | Duplicate/missing punch | Attendance audit | Timesheet readiness |
| Generate Timesheet | System | Attendance complete | Attendance records | Draft timesheet | Yes | Re-generation/versioning | Timesheet audit | Employer |
| Confirm Completion | Employer | Own org assignment + review permission | Completion decision or issue | Completion review | Yes | Concurrent issue/report | Completion audit | Admin/finance |
| Calculate Final Charge | System/Admin | Finance/calculation authority | Approved timesheet, policies | Calculation result | Yes with policy version | Policy changes | Calculation audit | Finance/admin |
| Issue Invoice | Finance/System | Invoice authority | Final calculation | Invoice | Yes | Duplicate invoice | Invoice audit | Employer |
| Submit Employer Charge | Employer/System | Payment authorization | Invoice/payment method token | Payment attempt | Yes | Retry/double charge | Payment audit | Employer/admin |
| Create Worker Payable | Finance/System | Payable authority | Approved worker calculation | Worker payable | Yes | Duplicate payable | Payable audit | Worker/admin |

Endpoint URLs are intentionally not defined here.

## 32. State Alignment Matrix

| Business Event | Employer UI | Worker UI | Admin UI | Shared Domain / Future API | Audit Event | Notification | Alignment Finding |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Request created | Draft request | Not visible | Not visible or draft queue | JobRequest Draft | job_request.created | None | Future frontend should prefer Job Request over Shift for commercial order |
| Request submitted | Submitted | Not visible | Intake queue | JobRequest Submitted | job_request.submitted | Admin intake | Existing shift labels must not imply dispatch started |
| Info required | Action needed | Not visible | Information Required | JobRequest Information Required | job_request.info_required | Employer | Need consistent label across employer/admin |
| Dispatch approved | Approved for dispatch | Not visible | Dispatching | JobRequest Approved for Dispatch | dispatch.approved | Optional employer | Approval != assignment |
| Offer sent | Staffing in progress | Offer Pending | Offer Sent | WorkerOffer Sent | worker_offer.sent | Worker | Offer pending must not show assigned |
| Offer viewed | Staffing in progress | Viewed | Viewed | WorkerOffer Viewed | worker_offer.viewed | Optional admin | Viewed != accepted |
| Offer accepted | Worker accepted / assignment pending confirmation | Confirmed Assignment | Accepted | WorkerOffer Accepted / Assignment Accepted | worker_offer.accepted | Employer/admin | Acceptance required before employer sees worker |
| Assignment confirmed | Confirmed assignment | Confirmed Assignment | Confirmed | Assignment Confirmed to Employer | assignment.confirmed | Employer/worker | Assignment != attendance |
| Punch in | Started | In Progress | In Progress | Attendance Punched In | attendance.punched_in | Employer/admin status | Punch in != performance proof |
| Punch out | Awaiting review | Awaiting review | Timesheet ready | Attendance Punched Out / Timesheet Draft | attendance.punched_out | Employer | Punch out != charge |
| Timesheet approved | Completion review/finalizing | Payable pending | Finance ready | Timesheet Approved/Finance Ready | timesheet.approved | Finance/admin | Timesheet != payment |
| Completion confirmed | Completed/finalizing invoice | Completed | Completion confirmed | EmployerCompletionReview Confirmed | completion.confirmed | Finance | Completion precedes final calculation |
| Invoice issued | Invoice issued | Not relevant | Invoice issued | Invoice Issued | invoice.issued | Employer | Invoice != payment |
| Employer payment settled | Paid/settled | Not relevant | Payment settled | EmployerPayment Settled | employer_payment.settled | Employer/admin | Employer Payment != Worker Payable |
| Worker payable paid | Not visible except aggregate where authorized | Paid | Payable paid | WorkerPayable Paid | worker_payable.paid | Worker | Worker paid only after actual payout |

Current frontend label risk:

- Existing employer pages may use Shift language for the staffing request. Future integration should align labels so Job Request is the commercial order and Shift/schedule is derived.
- No frontend code is changed in this task.

## 33. Owner Decisions Required

| Decision | Options | Recommended Option | Impact | Risk | Required Before Phase 01 Schema? | Deferrable |
| --- | --- | --- | --- | --- | --- | --- |
| Work-group catalogue | Fixed seed, admin-configurable, hybrid | Hybrid: seeded defaults, admin-governed config later | Controls employer request entry | Too much free-form role drift | No | Yes |
| Exact role catalogue | Seed now, configure later, import from policy | Seed common roles with future config | Stable capsule UX | Role/qualification confusion | No | Yes |
| Admin dispatch authority | Admin required, employer direct dispatch, hybrid | Admin required | Preserves operating model | Slower workflow but safer | No | No for dispatch phase |
| Temporary calendar holds | No holds, short hold, policy hold | Short governed hold only if approved | Prevents double booking | Could block worker unfairly | No | Yes |
| Completion-review timeout | No timeout, admin fallback, auto-confirm | Admin fallback after policy-defined period | Avoids silent billing | Operational delay | No | Yes, before billing |
| Payment authorization timing | On onboarding, on request submit, before dispatch | Before dispatch or approved checkout | Reduces unpaid work risk | Checkout friction | No | Yes |
| Cancellation rules | Manual review, fixed policy, contract-specific | Configurable policy | Affects billing and worker fairness | Legal/commercial disputes | No | Before billing |
| No-show rules | Manual review, automated, hybrid | Manual/admin review | Avoids unfair penalty | Operational burden | No | Before attendance |
| Replacement rules | Per assignment, per day, full request | Policy by job type | Governs continuity | Incorrect worker replacement | No | Before dispatch replacement |
| Overtime approval | Pre-approved, admin approval, employer approval | Configurable with admin visibility | Affects billing/payable | Legal/commercial risk | No | Before calculation |
| Holiday calculation | Manual, policy engine | Legal-approved policy engine | Accurate charges/payables | Compliance risk | No | Before calculation |
| Break policy | Fixed, per job, policy engine | Policy-driven | Accurate time/pay handling | Wage/billing disputes | No | Before timesheet |
| Travel-time policy | None, fixed, configurable | Configurable | Billing/payable accuracy | Disputes | No | Before calculation |
| Gas/mileage method | Fixed allowance, mileage, none, configurable | Configurable | Worker terms and invoice | Tax/legal uncertainty | No | Before calculation |
| Transport allowance | Employer-provided, worker allowance, none | Captured in Job Request terms | Clear expectations | Hidden charges | No | Before offers |
| Payment provider | Stripe, other, deferred | Deferred until payment phase | Determines token model | Premature integration | No | Yes |
| Worker payout provider | Same as payment, separate, manual | Deferred/manual until payout phase | Affects payables | Compliance/security risk | No | Yes |
| Invoice timing | After completion, daily, weekly, multi-day final | After completion unless policy says otherwise | Cashflow and fairness | Incorrect billing | No | Before invoices |
| Multi-day billing | Daily, final, partial milestones | Policy-controlled | Supports larger jobs | Partial dispute complexity | No | Before multi-day billing |
| Dispute handling | Admin review, support case, finance hold | Admin/support/finance by type | Fairness and auditability | Payment delays | No | Before timesheet/payment |
| Data retention | Minimum, policy table, legal schedule | Legal-approved retention schedule | Governance | Legal/privacy risk | No | Before production |
| Location evidence | None, check-in only, GPS, QR, hybrid | Minimal lawful evidence, no continuous tracking | Attendance confidence | Privacy risk | No | Before attendance |
| Worker photo visibility | Never, worker-approved, role-approved | Worker-approved/governed | Employer identification | Privacy risk | No | Before assignment view |
| AI recommendation scope | Completeness only, dispatch, finance estimates | Completeness first; dispatch/finance later by approval | Phased AI safety | Over-automation | No | Yes |

## 34. Recommended Implementation Order

1. Identity and organization foundation.
   Reason: every protected workflow depends on authentication, membership, organization, residence, department, roles, and permissions.

2. WorkGroup and operational RoleDefinition/WorkRole.
   Reason: employer request entry depends on capsule and role vocabulary; access roles must remain separate.

3. Job Request.
   Reason: Job Request is the source of truth for the client order.

4. Job Schedule and requirements.
   Reason: schedule, requirements, safety, contact, and commercial terms must be structured before dispatch.

5. Admin intake.
   Reason: admin validation governs request quality before workers are contacted.

6. Dispatch.
   Reason: worker search and candidate review happen only after admin approval.

7. Worker Offer.
   Reason: worker-visible terms must be explicit before acceptance.

8. Worker calendar.
   Reason: offer and assignment states must be visible to workers without double-booking.

9. Assignment.
   Reason: assignment is created after worker acceptance and drives attendance.

10. Attendance.
    Reason: punch-in/out evidence depends on confirmed assignment.

11. Timesheet.
    Reason: timesheet derives from attendance and preserves corrections.

12. Completion review.
    Reason: employer confirms work or reports issue before final billing.

13. Calculation policies.
    Reason: billing/payable calculation requires legal/policy approval.

14. Employer billing.
    Reason: invoice and employer payment depend on approved calculation.

15. Worker payable.
    Reason: worker payable is separate and follows approved worker calculation.

16. Notifications.
    Reason: notifications represent completed authoritative events and should not create state.

17. Support.
    Reason: support routes exceptions without owning source records.

18. Audit.
    Reason: full audit persistence must cover all authoritative events once workflows exist.

19. Reporting.
    Reason: reports aggregate authoritative records and should come after source records are stable.

## 35. Traceability

| Owner Business Rule | Master Workflow Section | Entity | State | Future API Capability | Frontend Surface | Test Requirement | Audit Event |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Job Request is central order | 1, 2, 4 | JobRequest | Draft -> Submitted | Create/Submit Job Request | Employer dashboard/request order | Request cannot be dispatched before submit | job_request.created/submitted |
| Shift is derived schedule | 1, 4, 30 | JobSchedule/Shift | Derived from approved request | Generate schedule instance | Job request schedule UI | Shift cannot become commercial source of truth | schedule.generated |
| Admin controls dispatch | 6, 7 | DispatchReview | Admin Review -> Approved for Dispatch | Approve for Dispatch | Admin intake/dispatch | Employer cannot bypass admin dispatch | dispatch.approved |
| Worker accepts deliberately | 8, 9 | WorkerOffer | Sent -> Accepted/Declined | Accept Worker Offer | Worker calendar offer | Offer viewed does not equal accepted | worker_offer.accepted/declined |
| Assignment follows acceptance | 10 | Assignment | Accepted -> Confirmed to Employer | Create Assignment | Employer assignment view | Assignment cannot exist without accepted offer | assignment.created |
| Employer sees worker after acceptance | 11 | Assignment projection | Confirmed to Employer | Read Assignment View | Employer assignment detail | Private worker fields hidden | assignment.viewed |
| Punch Out does not charge | 12, 15, 19 | AttendanceRecord/Timesheet | Punched Out -> Draft Timesheet | Record Punch Out / Generate Timesheet | Worker attendance/employer review | Payment not created on punch-out | attendance.punched_out |
| Completion review precedes billing | 15, 19, 22 | EmployerCompletionReview/CalculationResult/Invoice | Completion Confirmed -> Invoice Issued | Confirm Completion / Issue Invoice | Employer timesheet/completion/invoice | Invoice blocked before completion review | completion.confirmed |
| Employer Payment separate from Worker Payable | 20, 21 | EmployerPayment/WorkerPayable | Settled / Paid separate | Submit Employer Charge / Create Worker Payable | Employer payments/worker earnings/admin finance | Employer settlement does not mark worker paid | employer_payment.settled / worker_payable.paid |
| AI never creates authoritative state | 24 | AIRecommendation future | Advisory only | Explain/Suggest capability only | AI panels/admin dispatch | AI action cannot mutate source records | ai_recommendation.reviewed |
| Quebec policy approval required | 18, 19 | CalculationPolicy | Draft -> Approved | Evaluate Policy Set | Finance/calculation review | Calculation blocked without approved policy | calculation_policy.approved |
| Multi-day behavior explicit | 16 | JobSchedule/AttendanceRecord | Day-specific states | Generate schedule/attendance instances | Employer request/admin calendar | Daily exception does not close whole job | multi_day.exception_recorded |

## Validation

Internal consistency checks:

- Job Request is the central source of truth.
- Shift remains a derived operational schedule.
- Admin controls dispatch.
- Worker acceptance is explicit.
- Employer sees the worker only after acceptance.
- Punch Out does not automatically charge the employer.
- Timesheet and completion review precede final billing.
- Employer Payment and Worker Payable are separate.
- AI never creates authoritative state.
- Quebec policy remains approval-gated.
- Multi-day and recurring behavior are explicit.
- Worker commercial privacy is preserved.

No source code, schema, migration, API, frontend, tests, package configuration, or environment files are changed by this document.

## Final Status

Master Operational Workflow is ready for owner approval.

Backend implementation remains blocked until owner approval authorizes the next step.
