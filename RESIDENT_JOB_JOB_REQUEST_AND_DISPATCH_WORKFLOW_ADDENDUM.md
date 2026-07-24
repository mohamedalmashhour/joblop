# Resident Job Job Request and Dispatch Workflow Addendum

Status: PRODUCT WORKFLOW IMPACT ADDENDUM
Companion documents:

- `RESIDENT_JOB_BACKEND_FOUNDATION_SCHEMA_PROPOSAL.md`
- `RESIDENT_JOB_BACKEND_SCHEMA_REVIEW_GUIDE.md`

This document records the owner-approved product-flow clarification for work-group capsules, Job Request Orders, Admin Dispatch, Worker Calendar offers, punch-in/punch-out, completion review, invoicing handoff, and future calculation policy. It does not modify the approved schema proposal. Any schema or API changes described here are proposed future additions requiring owner approval.

No schema, migration, API, backend implementation, payment integration, payroll calculation, or AI automation is authorized by this addendum.

## 1. Work-Group Capsule Model

The employer staffing flow should begin with large, touch-friendly work-group capsules. Each capsule represents a broad staffing group and shows the most common roles directly.

Initial work groups:

| Work Group | Common Roles |
| --- | --- |
| Kitchen | Chef, Sous-chef, Cook, Kitchen helper, Dishwasher |
| Care / Nursing | Nurse, Licensed practical nurse, Personal support worker, Care aide |
| Housekeeping / Support | Housekeeper, Dining-room aide, Floor support, Laundry worker |
| Maintenance | General maintenance, Repair technician, Facility support, Emergency maintenance |

Product purpose:

- Reduce cognitive load for employers.
- Make the request flow usable on tablets and phones.
- Let employers select a broad group first, then a specific role.
- Prevent employers from entering free-form roles before seeing the approved platform vocabulary.

Current schema proposal impact:

- `role_definitions` can partially support role vocabulary.
- A new future `work_groups` concept is recommended because work groups are not the same as authorization roles.
- A new future `work_group_roles` mapping is recommended so operational job roles can be grouped without confusing them with user access roles.

Boundary:

- Work group is not a permission role.
- Work role is not a user role.
- Selecting a role is not dispatch approval.

## 2. Employer Job Request Flow

Approved employer flow:

```text
Employer Dashboard
-> Select Work-Group Capsule
-> Select Role
-> Open Job Request Order
-> Enter Job Description and Requirements
-> Review Commercial Terms
-> Submit to Admin
-> Admin Reviews
-> Admin Assigns or Offers the Job to Workers
-> Employer Receives Assignment Confirmation
-> Employer Sees Assigned Worker Information
-> Worker Performs Shift
-> Worker Punches In and Punches Out
-> Employer Confirms Job Completion
-> Invoice Is Calculated
-> Employer Payment Status Is Updated
```

Key rule:

- The employer submits a job request.
- Admin performs dispatch review.
- Admin assignment does not silently equal worker acceptance.
- Worker acceptance is required before the employer sees a confirmed assigned worker.

Current schema proposal impact:

- Existing foundation entities support employer, organization, residence, department, membership, and permissions.
- The current schema proposal does not yet include `JobRequest`, `DispatchReview`, `WorkerOffer`, `Assignment`, `AttendanceRecord`, `Timesheet`, `Invoice`, or `EmployerPayment`.
- These must be proposed in later schema phases.

## 3. Job Request Order Fields

The Job Request Order is the employer's governed staffing request. It should be complete enough for Admin to dispatch responsibly, but it must not expose private commercial agreements to workers.

### Basic Information

- work group
- role
- number of workers
- job title
- job description
- responsibilities
- special instructions
- residence or worksite
- department

### Schedule

- job date
- start date
- end date
- start time
- end time
- timezone
- one-day or multi-day assignment
- recurring assignment where approved
- arrival time
- break duration
- paid or unpaid break
- overtime possibility
- holiday status

### Workplace Conditions

- meal provided
- coffee or refreshments provided
- parking available
- transportation provided
- transportation allowance
- gas allowance
- travel-time payment
- uniform required
- safety shoes required
- gloves required
- protective equipment required
- employer provides equipment
- worker must bring approved equipment
- background/security check required
- certification required
- orientation required
- language requirement
- physical or operational requirements stated lawfully and neutrally

### Contact Information

- contact person
- contact role
- contact phone
- onsite instructions
- arrival entrance
- emergency contact process

### Commercial Terms

- employer hourly charge
- urgent premium
- overtime terms
- statutory-holiday terms
- transportation charge
- gas allowance
- travel charge
- taxes
- estimated total
- payment authorization state

### Notes

- special request
- access instructions
- safety instructions
- employer notes
- admin notes

Schema impact:

- These fields should not be forced into a single future table if doing so would blur boundaries.
- Recommended future model:
  - `job_requests` for core request ownership and state.
  - `job_request_requirements` for requirements.
  - `job_schedules` for one-day, multi-day, and recurring timing.
  - `job_commercial_terms` for employer-visible commercial terms.
  - `job_safety_requirements` for workplace/safety conditions.
  - `job_contacts` for onsite contact details.

## 4. Admin Dispatch Flow

All submitted Job Request Orders go first to Admin.

Admin must be able to:

1. Review the request.
2. Verify required fields.
3. Clarify missing information.
4. Review qualifications and security requirements.
5. Confirm the worker offer.
6. Search suitable workers.
7. Review worker availability calendars.
8. Select one or more workers.
9. Add the job to selected worker calendars.
10. Send the worker offer.
11. Track acceptance or decline.
12. Assign another worker when required.
13. Confirm the assignment to the employer.
14. Monitor attendance and completion.
15. Review exceptions.
16. Release the workflow to invoicing after completion.

Required Job Request states:

- Draft
- Submitted
- Admin Review
- Information Required
- Approved for Dispatch
- Offered to Workers
- Partially Filled
- Filled
- In Progress
- Completed
- Cancelled
- Unfilled

Schema impact:

- Current foundation schema has admin users, roles, permissions, memberships, residences, and departments only.
- Future schema needs `dispatch_reviews` to preserve Admin review decisions separately from job request creation.
- Admin review should not mutate worker acceptance directly.

Boundary:

- Admin review is not worker acceptance.
- Admin selection is not assignment confirmation.
- Admin dispatch is not payroll, invoicing, or payment.

## 5. Worker Calendar Flow

When Admin selects a worker:

- The job appears in the worker calendar as an offer.
- The worker opens the calendar item.
- The full approved worker-visible Job Request Order is shown.
- The worker sees duties, schedule, location, contact, safety requirements, breaks, transport terms, and worker compensation offer.
- The worker accepts or declines deliberately.

After acceptance:

- The worker calendar state changes to confirmed.
- Admin is notified through the future notification workflow.
- Employer assignment view updates.
- Employer sees only approved worker information permitted by policy.

Schema impact:

- Current schema proposal does not include worker calendars.
- Future schema should include `worker_calendar_entries` or an equivalent calendar projection linked to `worker_offers` and `assignments`.

Boundary:

- Calendar offer is not confirmed assignment.
- Calendar visibility is not worker acceptance.
- Worker calendar entry must not expose employer private pricing.

## 6. Worker Acceptance Flow

Required Worker Offer states:

- Proposed
- Sent
- Viewed
- Accepted
- Declined
- Expired
- Cancelled

Required Assignment states:

- Pending Worker Acceptance
- Accepted
- Confirmed to Employer
- Scheduled
- In Progress
- Completed
- Exception Review
- Cancelled
- Replacement Required

Schema impact:

- Current shared model includes assignment and offer concepts in frontend/shared types, but the foundation schema does not persist them.
- Future schema should model `worker_offers` separately from `assignments`.

Boundary:

- Worker offer proposed is not worker offer sent.
- Worker offer sent is not worker offer accepted.
- Assignment pending acceptance is not confirmed to employer.
- Accepted assignment is not attendance.

## 7. Employer Assignment Visibility

After worker acceptance, the employer may see approved information:

- worker display name
- approved role
- qualification summary
- verification status
- assignment status
- expected arrival time
- attendance status
- support contact

The employer must not see:

- banking information
- government identification
- private home address
- internal worker complaints
- unrelated personal information
- internal compensation agreement

Schema impact:

- Future assignment views need a policy-controlled projection, not direct access to worker private records.
- Employer-visible worker data should be derived from approved visibility rules.

Boundary:

- Employer assignment visibility is not full worker profile visibility.
- Qualification summary is not credential document access.
- Assignment status is not payroll status.

## 8. Punch-In and Punch-Out Flow

Approved flow:

```text
Worker Calendar Assignment
-> Arrival Window
-> Punch In
-> Shift In Progress
-> Break Status
-> Punch Out
-> Timesheet Generated
-> Employer Review
-> Completion Confirmation
```

Required distinctions:

- Punch In is not proof of satisfactory performance.
- Punch Out is not employer approval.
- Shift Completed is not Invoice Paid.
- Do not use continuous worker tracking.

Employer should see today's work as:

- not started
- started
- on break
- completed
- awaiting review
- exception pending

Schema impact:

- Future schema needs `attendance_records` and `break_records`.
- Attendance evidence should be separate from timesheet approval and employer completion review.

Boundary:

- Attendance does not approve timesheets.
- Attendance does not calculate invoice charges.
- Attendance does not prove performance quality.

## 9. Job Completion Flow

For a one-day job:

1. Worker punches out.
2. System prepares the timesheet.
3. Employer reviews scheduled hours, actual hours, break, overtime, transport, approved adjustment, and completion status.
4. Employer selects either Job completed or Report an issue.

Authoritative sequence:

```text
Worker Punch Out
-> Timesheet Review
-> Employer Completion Confirmation or Exception Review
-> Final Charge Calculation
-> Payment Authorization / Charge
-> Invoice
-> Payment Receipt
```

Key rule:

- The system must not charge the employer merely because the worker pressed Punch Out.

Schema impact:

- Future schema needs `employer_completion_reviews` separate from `timesheets`.
- Invoice generation and payment authorization must remain downstream.

Boundary:

- Timesheet reviewed is not final charge.
- Completion confirmation is not payment settlement.
- Invoice is not worker payable.

## 10. Multi-Day Job Behavior

For multi-day jobs:

- Each day has its own attendance record.
- Each day can be reviewed separately.
- The overall assignment remains open until the final day.
- Daily exceptions do not automatically close the entire assignment.
- Final invoicing follows the approved commercial agreement.

Schema impact:

- Future `job_schedules` should represent multi-day structure.
- Future `attendance_records` should be date/day-specific.
- Future `timesheets` may aggregate one or more attendance records depending on approved rules.

Boundary:

- Daily attendance exception is not full assignment cancellation.
- Daily review is not final invoice approval.
- Multi-day job completion requires final-day or final-review logic.

## 11. Employer Billing Boundary

Employer sees:

- employer charge
- estimated invoice
- premiums
- transport charges
- tax
- estimated total
- final invoice
- payment status

Required distinctions:

- Employer Charge is not Worker Pay.
- Client Agreement is not Worker Offer.
- Invoice is not Worker Payable.
- Estimate is not Final Charge.
- Payment Authorization is not Payment Settlement.

Schema impact:

- Current foundation schema does not include commercial terms, invoices, or payments.
- Future `job_commercial_terms`, `calculation_results`, `invoices`, and `employer_payments` must preserve employer-facing financial records separately from worker-facing compensation records.

Boundary:

- Do not expose worker pay calculations through employer billing records unless explicitly approved.
- Do not expose internal margin.
- Do not select a payment provider in this addendum.

## 12. Worker Compensation Privacy Boundary

Worker sees:

- worker offer rate
- worker premium
- worker travel or transport allowance
- worker shift terms
- approved duties
- payment-status information relevant to the worker

Worker must not see:

- platform markup
- employer contract price
- employer billing agreement
- internal margin
- unrelated administrative notes
- client payment-card information

Schema impact:

- Future worker-facing compensation should be modeled separately from employer commercial terms.
- Future `worker_payables` should derive from approved hours and approved worker terms, not employer invoice visibility.

Boundary:

- Worker Offer is not Client Agreement.
- Worker Payable is not Employer Invoice.
- Worker payment status is not employer card/payment details.

## 13. AI Brain Responsibilities

AI may assist with:

- checking missing request fields
- suggesting suitable worker groups
- identifying qualification requirements
- calculating estimated charges
- identifying possible overtime
- identifying statutory-holiday conditions
- preparing invoice calculations
- detecting discrepancies
- summarizing the completed job
- helping Admin identify suitable workers

AI must not:

- assign a worker without human approval
- accept for a worker
- charge a card without an authorized payment event
- decide legal entitlement by itself
- silently modify pay
- hide commercial calculations
- override Admin
- override employer confirmation
- fabricate worker availability

Required distinctions:

- AI Calculation is not Final Legal Determination.
- AI Recommendation is not Admin Assignment.

Schema impact:

- Future AI recommendations should preserve recommendation, confidence, explanation, supporting evidence, missing information, reviewer, human decision, and outcome.
- AI execution remains out of scope for the foundation schema.

## 14. Quebec Calculation-Policy Boundary

The future financial calculation layer should be a configurable policy engine, not hardcoded UI logic.

The engine should be capable of evaluating approved rules for:

- regular hours
- overtime
- statutory holidays
- paid and unpaid breaks
- reporting or minimum-call rules where applicable
- travel time
- transportation allowance
- mileage or gas reimbursement
- urgent premiums
- role-specific agreements
- employer contract terms
- worker offer terms

Before production calculations, the project must stop and create a legal-policy proposal containing:

- each calculation rule
- legal or contractual source
- effective date
- configurable value
- employer-facing calculation
- worker-facing calculation
- exception handling
- audit requirement
- owner/legal approval needed

Schema impact:

- Future schema likely needs `calculation_policies` and `calculation_results`.
- These are not authorized in the current foundation schema.

Boundary:

- Do not claim legal compliance until reviewed.
- Do not hardcode uncertain legal assumptions in UI components.
- Do not implement Quebec payroll calculations in this phase.

## 15. Required Entity Impact

| Required Concept | Current Proposal Status | Reuse Current Entity? | Future Addition Needed? | Notes |
| --- | --- | --- | --- | --- |
| `WorkGroup` | Not included | No | Yes | Separate from access roles |
| `WorkRole` or `RoleDefinition` | Partially included | Partially | Yes | `role_definitions` currently means access role; operational work role should be separate or explicitly scoped |
| `JobRequest` | Not included | No | Yes | Core employer request record |
| `JobRequestRequirement` | Not included | No | Yes | Requirements should not be free-form only |
| `JobSchedule` | Not included | No | Yes | Handles one-day, multi-day, recurring |
| `JobCommercialTerm` | Not included | No | Yes | Employer-facing commercial terms |
| `JobSafetyRequirement` | Not included | No | Yes | PPE, orientation, neutral physical/operational needs |
| `JobContact` | Not included | No | Yes | Onsite contact and arrival instructions |
| `DispatchReview` | Not included | No | Yes | Admin review separate from request |
| `WorkerOffer` | Not included | No | Yes | Offer is separate from assignment |
| `Assignment` | Out of scope | No | Yes | Shared model exists, no persistence yet |
| `WorkerCalendarEntry` | Not included | No | Yes | Offer/assignment calendar projection |
| `AttendanceRecord` | Out of scope | No | Yes | Shared model exists, no persistence yet |
| `BreakRecord` | Not included | No | Yes | Required for punch-in/out and timesheet review |
| `Timesheet` | Out of scope | No | Yes | Shared model exists, no persistence yet |
| `EmployerCompletionReview` | Not included | No | Yes | Separates employer completion from punch-out |
| `Invoice` | Out of scope | No | Yes | Shared model exists, no persistence yet |
| `EmployerPayment` | Out of scope | No | Yes | Shared model exists, no persistence yet |
| `WorkerPayable` | Out of scope | No | Yes | Shared model exists, no persistence yet |
| `CalculationPolicy` | Not included | No | Yes | Requires legal/policy approval |
| `CalculationResult` | Not included | No | Yes | Must preserve estimate/final boundaries |
| `AuditEvent` | Out of scope | Partial actor reference only | Yes | `audit_actor_references` is not audit persistence |

Recommended proposal change requiring owner approval:

- Add a future-schema note that `RoleDefinition` in the foundation proposal is an authorization role only, not an operational work role.
- Add future concepts for `WorkGroup` and `WorkRole` to avoid confusing staffing roles with access roles.
- Do not add these to the active Phase 01 migration unless owner explicitly expands scope.

## 16. Required API Impact

No API implementation is authorized now.

Future API areas implied by this product flow:

| Workflow | Future API Need | Foundation Dependency |
| --- | --- | --- |
| Work-group capsule list | Read approved work groups and roles | Auth optional for public preview, auth required for employer request |
| Job request draft | Create/update employer job request draft | User, organization membership, residence, department |
| Submit to Admin | Submit request and lock employer-submitted fields | Organization authorization |
| Admin review | Read request, request clarification, approve dispatch | Admin authorization |
| Worker search | Search suitable workers and availability | Worker profile/compliance/availability future schema |
| Worker offer | Send offer to worker calendar | Worker offer and calendar future schema |
| Worker acceptance | Accept or decline deliberately | Authenticated worker session |
| Employer assignment view | Read confirmed assignment projection | Assignment and visibility policy |
| Punch in/out | Submit attendance events | Assignment and attendance future schema |
| Completion review | Employer confirms completion or reports issue | Timesheet and completion-review future schema |
| Invoice handoff | Generate invoice only after approved flow | Calculation/invoice/payment future schema |

API boundaries:

- APIs must not expose raw database records.
- APIs must not expose employer commercial terms to workers.
- APIs must not expose worker compensation or private worker data to employers beyond approved policy.
- APIs must not claim payment success without payment-provider integration.
- APIs must not allow AI to mutate authoritative state.

## 17. Owner Decisions

Before implementation, owner approval is required for:

1. Whether `WorkGroup` and operational `WorkRole` should be added as future schema concepts separate from access roles.
2. Whether work-group capsule configuration is platform-managed, admin-managed, or seeded only.
3. Whether the Job Request Order is a new primary workflow replacing or wrapping the existing shift creation flow.
4. Whether `JobRequest` becomes the upstream source of truth for future `Shift` records.
5. Whether `JobSchedule` should support recurring jobs in the first backend implementation or defer recurrence.
6. Whether employer commercial terms are stored at request time, dispatch approval time, or both.
7. Whether worker offer compensation is copied as an immutable offer snapshot.
8. Whether `WorkerCalendarEntry` is stored as a table or derived from offers and assignments.
9. Whether Admin can select multiple workers for one request in the first implementation.
10. What employer-visible worker information is approved after worker acceptance.
11. Which punch-in/punch-out evidence is permitted without continuous tracking.
12. Whether multi-day jobs generate daily timesheets, one aggregate timesheet, or both.
13. Whether employer completion confirmation is mandatory before final charge calculation.
14. Which calculation-policy rules require legal review before implementation.
15. Which payment provider may be considered later, if any.
16. Whether future APIs should use `JobRequest` terminology, `Shift` terminology, or both with clear boundaries.
17. Whether the existing schema proposal should be amended now with future-reserved concepts or left unchanged until the next schema phase.

## 18. Recommended Implementation Order

No implementation is authorized by this document. If the owner approves a future implementation phase, the recommended order is:

1. Finish Backend Foundation Phase 01 first.

Why: Authentication, memberships, permissions, organizations, residences, and departments are prerequisites for a safe job request workflow.

2. Add work-group and operational work-role schema.

Why: The capsule experience depends on a stable role vocabulary that is separate from access-control roles.

3. Add Job Request Order schema.

Why: Employer requests must become the upstream source for Admin dispatch review before worker offers exist.

4. Add Admin Dispatch Review schema.

Why: Admin review is the governing checkpoint between employer request and worker offer.

5. Add Worker Offer and Worker Calendar schema.

Why: Worker acceptance must be deliberate and visible before assignment is confirmed.

6. Add Assignment schema.

Why: Assignment should be created only after the offer/acceptance boundary is clear.

7. Add Attendance and Break Record schema.

Why: Punch-in/punch-out evidence depends on confirmed assignments.

8. Add Timesheet and Employer Completion Review schema.

Why: Employer review and completion confirmation must come after attendance evidence.

9. Add Calculation Policy and Calculation Result schema after legal/policy approval.

Why: Financial calculations must be configurable and reviewed before production use.

10. Add Invoice, Employer Payment, and Worker Payable schema.

Why: Financial records should come after approved attendance, timesheet, completion review, and calculation boundaries.

11. Add API endpoints in the same order.

Why: API authority should follow data ownership, not jump ahead of the governed workflow.

12. Connect frontend surfaces one workflow slice at a time.

Why: The UI should not claim persistence or dispatch behavior until the backend source of truth exists.

## Final Gate

This addendum is ready for owner review.

The approved schema proposal remains unchanged.

No implementation should begin until the owner decides whether this product-flow clarification requires a schema proposal revision, a later schema phase, or a formal Architecture Change Request.
