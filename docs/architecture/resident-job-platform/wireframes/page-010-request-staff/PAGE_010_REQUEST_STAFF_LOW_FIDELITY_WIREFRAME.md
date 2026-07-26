# Page 010 - Request Staff Low-Fidelity Wireframe

Status: Initial low-fidelity wireframe created
Page: 010 - Request Staff
Architecture reference: `docs/architecture/resident-job-platform/pages/PAGE_010_REQUEST_STAFF.md`
Architecture baseline: Resident Job Architecture Phase 1 v1.0
UX baseline: Resident Job UX Foundation
Design system reference: `docs/architecture/resident-job-platform/ux-foundation/01_GLOBAL_DESIGN_SYSTEM.md`
Navigation reference: `docs/architecture/resident-job-platform/ux-foundation/02_NAVIGATION_ARCHITECTURE.md`
Financial UX reference: `docs/architecture/resident-job-platform/wireframes/FINANCIAL_UX_STANDARD_V1_0.md`
Content governance reference: `docs/architecture/resident-job-platform/wireframes/CONTENT_GOVERNANCE_STANDARD_V1_0.md`
Policy review reference: `docs/architecture/resident-job-platform/wireframes/POLICY_CONTENT_REVIEW_STANDARD_V1_0.md`
Legal content governance reference: `docs/architecture/resident-job-platform/wireframes/LEGAL_CONTENT_GOVERNANCE_STANDARD_V1_0.md`
Implementation: Not authorized
Authenticated shift-creation workflow: Not included
Staffing request integration: Not authorized
Matching engine: Not authorized
Billing integration: Not authorized
Production data: Not used

## A. Purpose

The Request Staff page is the public entry point that helps a residence, healthcare organization,
or employer understand the service and begin a staffing request safely.

It is not the full authenticated shift-creation workflow.

The page must build employer trust without guaranteeing worker availability, replacement, timing,
pricing, or outcomes.

## B. Primary User

Primary users:

- Guest employer.
- Residence manager.
- Healthcare organization representative.
- Scheduler.
- Authorized staffing manager.

Secondary reviewers:

- Operations.
- Support.
- Finance.
- Compliance.
- Product owner.

## C. User Goals

Users should be able to understand:

1. Who can request staff.
2. Which roles Resident Job may help fill.
3. How the staffing request process works.
4. What information is needed.
5. How workers are recommended and selected.
6. How attendance, timesheets, billing, and support are handled.
7. What happens after the request is submitted.

## D. Information Hierarchy

1. Hero and employer CTA.
2. Request-not-confirmed trust notice.
3. Who This Is For.
4. Roles Available.
5. Why Use Resident Job.
6. Staffing Request Journey.
7. Request Types.
8. Public Initial Request Form.
9. Authentication Boundary.
10. Urgent Staffing.
11. Worker Matching.
12. Employer Review.
13. Pricing Transparency.
14. Attendance and Timesheets.
15. Replacement and No-Show Handling.
16. Trust and Safety.
17. Employer Responsibilities.
18. Confirmation State.
19. FAQ Preview.
20. Required states and accessibility/security notes.

## E. Desktop Wireframe

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ HEADER                                                                       │
│ Resident Job       About   How It Works   Pricing   Contact   FAQ   Sign In  │
│                                      [Request Staff] [Become a Worker]       │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ REQUEST STAFF                                                                │
│                                                                              │
│ Healthcare and residence staffing support for regular, urgent, recurring, and │
│ managed staffing needs.                                                       │
│                                                                              │
│ [Request Staff] [Talk to Staffing Support] [Learn How It Works]              │
│                                                                              │
│ Trust notice                                                                 │
│ Submitting a request starts the staffing workflow. It does not confirm worker │
│ coverage, timing, replacement, pricing, or final assignment.                  │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ WHO THIS IS FOR                                                              │
│                                                                              │
│ - Senior residences                  - Assisted-living organizations          │
│ - Retirement homes                   - Food-service departments              │
│ - Long-term care organizations       - Housekeeping and maintenance teams     │
│ - Healthcare facilities              - Authorized staffing managers           │
│ - Clinics                                                                    │
│                                                                              │
│ Country-neutral note: organization types are examples only. Operational,      │
│ licensing, and jurisdiction requirements are configured later.                │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ ROLES AVAILABLE                                                              │
│                                                                              │
│ Care                         Kitchen                     Operations           │
│ - Nurses                     - Chef                       - Housekeeping       │
│ - Practical nurses           - Sous-chef                   - Cleaning          │
│ - Personal support or care   - Cook                        - Maintenance       │
│   workers                    - Kitchen helper              - Reception         │
│ - Beneficiary attendants     - Dishwasher                  - Administration    │
│   where applicable           - Dietary aide                                     │
│                                                                              │
│ Role availability, eligibility, and requirements may vary by location,        │
│ jurisdiction, employer rules, worker availability, and operational settings.  │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ WHY USE RESIDENT JOB                                                         │
│                                                                              │
│ Structured staffing requests      Worker profile and eligibility review       │
│ Clear request inputs              Review workflow before assignment context    │
│                                                                              │
│ AI-assisted matching              Authorized human selection                  │
│ Recommendations with evidence     Employer or authorized actor confirms       │
│                                                                              │
│ Availability/conflict checks      Attendance tracking                         │
│ Scheduling risk visibility        Check-in/check-out and timesheet context    │
│                                                                              │
│ Transparent invoicing             Secure communication                        │
│ Estimate vs final invoice clear   Controlled support and contact paths        │
│                                                                              │
│ Operational support               Auditability                                │
│ Support routing where needed      Important actions leave traceable records   │
│                                                                              │
│ No guaranteed quality, replacement, availability, timing, or outcome is       │
│ promised from this public page.                                               │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ STAFFING REQUEST JOURNEY                                                     │
│                                                                              │
│ Define staffing need                                                         │
│        ↓                                                                     │
│ Provide role, location, date, time, and requirements                          │
│        ↓                                                                     │
│ Receive AI-assisted worker recommendations                                   │
│        ↓                                                                     │
│ Authorized employer reviews candidates                                       │
│        ↓                                                                     │
│ Employer confirms assignment                                                 │
│        ↓                                                                     │
│ Worker receives and accepts the assignment                                   │
│        ↓                                                                     │
│ Shift attendance is recorded                                                 │
│        ↓                                                                     │
│ Timesheet reviewed                                                           │
│        ↓                                                                     │
│ Final invoice generated                                                      │
│                                                                              │
│ Expectation management                                                       │
│ AI recommendation      ≠ Final assignment                                    │
│ Request submitted      ≠ Worker confirmed                                    │
│ Worker suggested       ≠ Worker available                                    │
│ Estimate               ≠ Final charge                                        │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ REQUEST TYPES                                                                │
│                                                                              │
│ Regular shift             Urgent or same-day shift       Recurring staffing   │
│ Planned coverage          Distinct urgent routing        Repeating need       │
│                                                                              │
│ Multiple-worker request   Replacement request            Enterprise inquiry   │
│ Team coverage             Existing issue context         Managed staffing     │
│                                                                              │
│ Each path may have different requirements, routing, availability, review, and │
│ operational handling. No final service levels are hardcoded here.            │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ INITIAL REQUEST FORM - PUBLIC INTAKE ONLY                                    │
│                                                                              │
│ Core fields                                                                  │
│ Organization name      Contact name         Work email        Phone           │
│ Organization type      Staffing location    Role needed       Number workers  │
│ Date                   Start time           End time          Urgency         │
│ Brief requirements     Preferred contact    Consent/privacy acknowledgement   │
│                                                                              │
│ Conditional fields                                                           │
│ Department             Recurrence           Required credentials              │
│ Travel/distance        Existing account     Replacement reason                │
│ Active shift reference                                                         │
│                                                                              │
│ Do not request unnecessary health information, card credentials, passwords,   │
│ banking details, or worker-sensitive data in this public intake form.         │
│                                                                              │
│ [Submit Initial Request] [Sign In To Continue]                               │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────┬───────────────────────────────────────┐
│ AUTHENTICATION BOUNDARY              │ URGENT STAFFING                        │
│                                      │                                       │
│ Signed-out user                      │ Urgency may affect routing and        │
│ - May submit initial inquiry.        │ possibly pricing.                     │
│ - Receives limited confirmation.     │                                       │
│ - May be asked to create/sign in.    │ Availability is not guaranteed.       │
│                                      │ Submitting urgent request does not     │
│ Signed-in employer                   │ confirm coverage.                     │
│ - May continue full workflow.        │                                       │
│ - May access organization data,      │ AI may suggest candidates. An         │
│   locations, departments, billing    │ authorized person confirms the final  │
│   profile, and request history       │ assignment.                           │
│   according to permissions.          │                                       │
│                                      │ Active medical or public-safety       │
│ Do not expose account details        │ emergencies belong with local         │
│ publicly.                            │ emergency services. No emergency      │
│                                      │ numbers are hardcoded.                │
└──────────────────────────────────────┴───────────────────────────────────────┘

┌──────────────────────────────────────┬───────────────────────────────────────┐
│ WORKER MATCHING                      │ EMPLOYER REVIEW                        │
│                                      │                                       │
│ Inputs may include:                  │ Authorized employer may review:       │
│ - role                               │ - relevant worker profile             │
│ - eligibility                        │ - role and eligibility status         │
│ - credentials                        │ - verified/reviewed credentials       │
│ - availability                       │   where applicable                    │
│ - location                           │ - availability                         │
│ - scheduling conflicts               │ - assignment-specific information     │
│ - employer requirements              │ - approved trust indicators           │
│ - prior authorized operational       │                                       │
│   factors                            │ Do not imply unrestricted access to   │
│                                      │ worker records.                       │
│ AI may rank possible matches, flag   │                                       │
│ conflicts, identify missing          │                                       │
│ requirements, and support            │                                       │
│ replacement search.                  │                                       │
│                                      │                                       │
│ AI must not make final hiring        │                                       │
│ decisions, assign without            │                                       │
│ authorization, override eligibility, │                                       │
│ expose private worker information,   │                                       │
│ discipline workers, or guarantee     │                                       │
│ coverage.                            │                                       │
└──────────────────────────────────────┴───────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ PRICING TRANSPARENCY                                                         │
│                                                                              │
│ Estimate -> authorization where applicable -> verified attendance -> approved │
│ timesheet -> approved adjustments -> final invoice                           │
│                                                                              │
│ - Authorization is not the final charge.                                     │
│ - Estimates are not guarantees.                                              │
│ - Urgency, travel, actual hours, and approved adjustments may affect final    │
│   total.                                                                     │
│ - Employer billing and worker compensation are separate processes.            │
│                                                                              │
│ Do not hardcode universal rates, fees, taxes, commissions, or cancellation    │
│ charges.                                                                     │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────┬───────────────────────────────────────┐
│ ATTENDANCE AND TIMESHEETS            │ REPLACEMENT AND NO-SHOW HANDLING       │
│                                      │                                       │
│ - Worker check-in/check-out.         │ Issue reported                         │
│ - Employer attendance visibility.    │        ↓                               │
│ - Timesheet review.                  │ Operational triage                     │
│ - Correction or dispute path.        │        ↓                               │
│ - Audit trail.                       │ Replacement search where appropriate  │
│ - Final billing after approved       │        ↓                               │
│   rules are applied.                 │ Candidate review                       │
│                                      │        ↓                               │
│ Do not imply location tracking is    │ Authorized confirmation                │
│ continuous.                          │        ↓                               │
│                                      │ Case update                            │
│                                      │                                       │
│                                      │ Replacement availability is not        │
│                                      │ guaranteed. Original issue remains     │
│                                      │ unresolved until confirmed. AI may     │
│                                      │ suggest; humans make final decisions.  │
└──────────────────────────────────────┴───────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ EMPLOYER TRUST AND SAFETY                                                    │
│                                                                              │
│ Employer account controls       Worker onboarding/document-review workflows   │
│ Role-based access               Secure communication                          │
│ Attendance records              Support-case auditability                     │
│ Dispute handling                Privacy-aware data sharing                    │
│ Human review of consequential decisions                                       │
│                                                                              │
│ These are platform mechanisms, not guarantees of quality, replacement,        │
│ availability, timing, pricing, or outcomes.                                   │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ EMPLOYER RESPONSIBILITIES                                                    │
│                                                                              │
│ Informational, non-contractual expectations:                                 │
│ - Provide accurate shift details.                                            │
│ - Identify required role and credentials.                                    │
│ - Maintain safe and appropriate workplace information.                       │
│ - Communicate changes promptly.                                              │
│ - Review timesheets.                                                         │
│ - Protect account access.                                                    │
│ - Use worker information only for authorized staffing purposes.               │
│                                                                              │
│ Final contractual obligations require approved legal and operational content. │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ CONFIRMATION STATE                                                           │
│                                                                              │
│ Request received                                                             │
│ Reference: placeholder                                                       │
│ Request type: placeholder                                                    │
│ Submitted details summary: placeholder                                       │
│ Next step: staffing review / account sign-in / support follow-up placeholder │
│ Status: not yet confirmed                                                    │
│                                                                              │
│ [Create or Sign In] [Contact Support] [Active Shift Support if applicable]   │
│                                                                              │
│ Warning: avoid duplicate requests unless instructed by support.               │
│ No worker has been assigned from this confirmation state.                     │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ FAQ PREVIEW                                                                  │
│                                                                              │
│ How quickly can staff be found?       Is availability guaranteed?             │
│ How does urgent staffing work?        Who confirms the worker?                │
│ When is final charge calculated?      What happens if a worker cancels?       │
│ How do I request a replacement?       What worker information can I see?      │
│ Can I request multiple workers?       How are disputes handled?               │
│                                                                              │
│ Answers use configurable, truthful placeholders only.                         │
└──────────────────────────────────────────────────────────────────────────────┘
```

## F. Mobile Wireframe

```text
┌──────────────────────────────┐
│ REQUEST STAFF                │
│ Healthcare staffing support. │
│ [Request Staff]              │
│ [Talk to Staffing Support]   │
└──────────────────────────────┘

┌──────────────────────────────┐
│ REQUEST IS NOT CONFIRMATION  │
│ Submitting starts review. It │
│ does not confirm coverage,   │
│ worker, price, or timing.    │
└──────────────────────────────┘

┌──────────────────────────────┐
│ REQUEST TYPE                 │
│ Regular shift                │
│ Urgent / same-day            │
│ Recurring                    │
│ Multiple workers             │
│ Replacement                  │
│ Enterprise inquiry           │
└──────────────────────────────┘

┌──────────────────────────────┐
│ ROLE / DATE / TIME           │
│ Role needed                  │
│ Number of workers            │
│ Date                         │
│ Start time                   │
│ End time                     │
│ Urgency                      │
└──────────────────────────────┘

┌──────────────────────────────┐
│ PUBLIC INTAKE                │
│ Organization name            │
│ Contact name                 │
│ Work email                   │
│ Phone                        │
│ Staffing location            │
│ Brief requirements           │
│ Consent/privacy              │
└──────────────────────────────┘

┌──────────────────────────────┐
│ URGENT STAFFING              │
│ Urgency affects routing and  │
│ possibly pricing. Coverage   │
│ is not guaranteed.           │
│ Emergencies use local        │
│ emergency services.          │
└──────────────────────────────┘

┌──────────────────────────────┐
│ MATCHING                     │
│ AI may recommend and flag    │
│ conflicts. Authorized people │
│ confirm final assignment.    │
└──────────────────────────────┘

┌──────────────────────────────┐
│ ESTIMATE VS INVOICE          │
│ Estimate -> authorization -> │
│ attendance -> timesheet ->   │
│ adjustments -> final invoice │
└──────────────────────────────┘

┌──────────────────────────────┐
│ TRUST AND SAFETY             │
│ Account controls             │
│ Role-based access            │
│ Secure communication         │
│ Attendance records           │
│ Dispute handling             │
│ Human review                 │
└──────────────────────────────┘

┌──────────────────────────────┐
│ [Submit Initial Request]     │
│ [Sign In To Continue]        │
└──────────────────────────────┘
```

## G. Required States

- Default.
- Signed-out.
- Signed-in.
- Regular staffing.
- Urgent staffing.
- Recurring request.
- Multiple-worker request.
- Replacement request.
- Missing information.
- Validation error.
- Submission in progress.
- Submission failure.
- Offline/interrupted.
- Request received.
- Duplicate-request warning.
- No current availability.
- Operational review required.

## H. Loading States

- Request-type loading.
- Role category loading.
- Form submission in progress.
- Signed-in account context loading.
- Matching preview loading placeholder.

Loading must not imply coverage, assignment, price, or worker confirmation.

## I. Error States

- Missing required information.
- Invalid email or phone.
- Date/time validation error.
- Staffing location missing.
- Urgent path requires additional details.
- Submission failure.
- Offline/interrupted.
- Duplicate request warning.
- No current availability.
- Operational review required.

Errors must provide retry, correction, sign-in, or support paths without exposing private account or
worker data.

## J. Success States

### Request Received

Show:

- Request received.
- Reference placeholder.
- Request type.
- Submitted details summary.
- Next step.
- Status is not yet confirmed.
- Sign-in or account-creation action where relevant.
- Warning against duplicate requests.
- Route to active-shift support if applicable.

Do not claim a worker has been assigned.

## K. Accessibility

Review:

- Semantic form structure.
- Accessible labels.
- Keyboard navigation.
- Error association.
- Focus management.
- Status announcements.
- No color-only urgency.
- Readable timelines.
- Accessible date/time inputs.
- Plain language.
- Sufficient contrast.
- Large touch targets.

## L. Security And Privacy

Assess:

- Data minimization.
- Role-based access.
- Signed-in vs signed-out boundaries.
- Safe worker-data visibility.
- Spam/abuse controls.
- Rate limiting as future API requirement.
- Secure references.
- Audit logging.
- Attachment safety if future attachments are proposed.
- No payment-card collection in the public intake form.
- No unnecessary health information.
- No passwords.
- No banking details.
- No worker-sensitive data.

## M. AI Assistant Placement

AI may appear in two places:

1. Matching explanation:
   "AI may help identify possible workers, missing requirements, and scheduling conflicts."
2. Request-quality prompt:
   "AI may suggest missing request details for human review."

AI must not:

- Make final hiring decisions.
- Assign a worker without authorization.
- Override eligibility controls.
- Expose private worker information.
- Discipline workers.
- Guarantee coverage.

## N. International Readiness

The page remains country-neutral.

No:

- Country-specific employment law.
- Country-specific healthcare regulation.
- Tax advice.
- Universal role availability.
- Universal service levels.
- Regional pricing.
- Hardcoded emergency numbers.

## O. Confirmation

- Architecture Freeze v1.0 unchanged.
- UX Foundation unchanged.
- Design System unchanged.
- Navigation unchanged.
- No previously approved pages modified.
- No approval record created.
- Page 011 not created.
- No React work began.
- No frontend work began.
- No backend work began.
- No authentication work began.
- No database work began.
- No staffing request integration began.
- No matching engine work began.
- No billing integration began.
- No deployment work began.
- No production data was used.

## P. Governance Audit Notes

Exact public-page boundaries preserved:

- The page builds employer trust without guaranteeing worker availability, replacement, timing,
  pricing, or outcomes.
- The page builds employer trust without guaranteeing worker availability, replacement, timing, pricing, or outcomes.
- Personal support or care workers are role examples only.
- Availability and conflict checks are trust mechanisms, not guarantees.
- Do not expose account details publicly.
- Active medical or public-safety emergencies belong with local emergency services.
- AI must not make final hiring decisions.
- AI must not assign without authorization.
- Do not imply unrestricted access to worker records.
- Estimate -> authorization where applicable -> verified attendance -> approved timesheet ->
  approved adjustments -> final invoice.
- Estimate -> authorization where applicable -> verified attendance -> approved timesheet -> approved adjustments -> final invoice.
- Do not imply location tracking is continuous.
- Replacement availability is not guaranteed.
- No implementation work is authorized.
