# Page 025 - Apply Wireframe Revision 1

Status: Approved-condition revision complete
Epic: Epic 3 - Worker Portal
Primary user: Authenticated worker
Architecture baseline: Resident Job Architecture Phase 1 v1.0
Epic planning baseline: Epic 3 Worker Portal Planning v1.0
Source wireframe: PAGE_025_APPLY_LOW_FIDELITY_WIREFRAME.md
Implementation: Not authorized

## 1. Revision Scope

This controlled revision strengthens application governance, informed consent, application
lifecycle, employer review boundaries, worker withdrawal, fairness, privacy, AI boundaries, and
mobile usability.

This revision does not redesign the page and does not modify:

- Architecture Freeze.
- Epic 3 Planning.
- UX Foundation.
- Navigation.
- Pages 016-024.
- EPIC_3_MID_ARCHITECTURE_REVIEW.md.

## 2. Complete Application Lifecycle

The Apply page must show the full application lifecycle without merging stages.

```text
View Shift
↓
Apply
↓
Application Submitted
↓
Employer Review
↓
Additional Information Requested
↓
Application Withdrawn
↓
Application Closed
↓
Assignment Offer (future page)
↓
Assignment Acceptance (future page)
↓
Confirmed Assignment
```

Required boundaries:

```text
Application
does not equal
Selection

Selection
does not equal
Assignment

Assignment
does not equal
Acceptance

Acceptance
does not equal
Employment

Employment
does not equal
Attendance

Attendance
does not equal
Payroll
```

Selection is a future workflow state. It does not create an assignment offer, assignment, worker
acceptance, confirmed assignment, employment, attendance, or payroll.

## 3. Revised Desktop Wireframe

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ Resident Job                                Apply             Profile Help│
│ Worker: [Name]                             Shift: [Role]            Alert │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ APPLICATION GOVERNANCE NOTICE                                              │
│ This page submits an application only. Application ≠ selection. Selection  │
│ ≠ assignment. Assignment ≠ acceptance. Acceptance ≠ employment. Attendance │
│ ≠ payroll.                                                                │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ APPLICATION LIFECYCLE                                                      │
├──────────────────────────────┬─────────────────────────────────────────────┤
│ Current step                 │ Apply                                       │
│ Current state                │ Draft                                       │
│ After submit                 │ Application Submitted                       │
│ Later review state           │ Employer Review / Additional Info Requested│
│ Future state                 │ Selected, assignment offer, acceptance      │
│ Not created here             │ Assignment, employment, attendance, payroll │
└──────────────────────────────┴─────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ APPLICATION SUMMARY - REVIEW BEFORE SUBMISSION                             │
├──────────────────────────────┬─────────────────────────────────────────────┤
│ Shift summary                │ [Role, department, date/time/timezone]      │
│ Employer summary             │ [Approved operational information]          │
│ Location                     │ [Approved visibility level]                 │
│ Schedule                     │ [Confirmed / estimated / pending]           │
│ Compensation summary         │ [Confirmed / estimated / pending/unavail.]  │
│ Known requirements           │ [Summary from Shift Details]                │
│ Requirement gaps             │ [Safe summary + owning page link]           │
│ Cancellation summary         │ [Application withdrawal vs assignment cancel]│
│ Travel expectations          │ [Estimate / confirmed / unavailable]        │
└──────────────────────────────┴─────────────────────────────────────────────┘
│ Missing information is labeled. Critical missing information may block     │
│ submission or require a governed exception.                                │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ SHIFT-SPECIFIC INPUTS ONLY                                                 │
├──────────────────────────────┬─────────────────────────────────────────────┤
│ Confirmation of interest     │ [Required]                                  │
│ Optional note                │ [Private draft until submitted if included] │
│ Approved shift question      │ [Only if necessary for this shift]          │
│ Relevant experience summary  │ [Short, shift-specific, optional if allowed]│
│ Availability confirmation    │ [For this shift only]                       │
└──────────────────────────────┴─────────────────────────────────────────────┘
│ Do not duplicate Profile, Professional Information, Licences,              │
│ Certifications, Background Check, Availability, or full onboarding.        │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ ADDITIONAL INFORMATION REQUEST GUARDRAIL                                   │
│ If additional information is requested, it must be shift-specific,         │
│ necessary, and governed. It cannot bypass Profile, Professional            │
│ Information, Licences, Certifications, Background Check, Availability,     │
│ document review, privacy, or compliance workflows.                         │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ COMPENSATION CONFIRMATION                                                  │
├──────────────────────────────┬─────────────────────────────────────────────┤
│ Estimated worker pay         │ [Amount/currency/status]                    │
│ Premiums                     │ [If applicable; status shown]               │
│ Travel compensation          │ [If applicable; status shown]               │
│ Estimated hours              │ [Confirmed / estimated / pending]           │
│ Estimated gross              │ [Confirmed / estimated / pending/unavail.]  │
└──────────────────────────────┴─────────────────────────────────────────────┘
│ Estimate ≠ guaranteed payment. Employer billing and platform margin are    │
│ not shown. The worker confirms the displayed compensation state before     │
│ submitting.                                                                │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ REQUIREMENT GAPS                                                           │
├──────────────────────────────┬─────────────────────────────────────────────┤
│ Certification renewal        │ [Safe summary] [Open Certifications]        │
│ Licence requirement          │ [Safe summary] [Open Licences]              │
│ Availability conflict        │ [Safe summary] [Open Availability Calendar] │
│ Background-check step        │ [Status only] [Open Background Check]       │
│ Employer-specific orientation│ [Safe summary] [Review details]            │
└──────────────────────────────┴─────────────────────────────────────────────┘
│ Sensitive compliance information is not exposed here.                      │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ INFORMED CONSENT                                                           │
│ Confirm each applicable item. No confirmations are preselected. Consent    │
│ is limited to this application and is not bundled with unrelated terms.    │
│ [ ] I reviewed the shift details.                                          │
│ [ ] I reviewed the compensation summary and its status.                    │
│ [ ] I reviewed current known requirements and gaps.                        │
│ [ ] I reviewed cancellation or withdrawal expectations.                    │
│ [ ] I understand the employer or authorized reviewer may evaluate this     │
│     application.                                                           │
│ [ ] I understand submitting does not guarantee response, interview,        │
│     selection, assignment, acceptance, contract, employment, attendance,    │
│     payroll, or payment.                                                   │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ EMPLOYER REVIEW BOUNDARY                                                   │
│ Submission means the employer or authorized reviewer may evaluate the      │
│ application. It does not mean assignment, acceptance, contract, guaranteed │
│ response, guaranteed interview, guaranteed selection, or employment.        │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ WORKER WITHDRAWAL                                                          │
│ [Withdraw application] [Confirm withdrawal] [View withdrawal status]        │
│ Withdrawal applies to a draft or submitted application before later        │
│ assignment/acceptance workflows. Application withdrawal ≠ cancelling an    │
│ accepted assignment. Reapplication availability must be shown if governed. │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ PRIVACY AND VISIBILITY                                                     │
├────────────────────────────┬────────────────────────────┬──────────────────┤
│ WORKER ONLY                │ EMPLOYER VISIBLE           │ PLATFORM ONLY    │
│ Draft application          │ Submitted application      │ Audit events     │
│ Personal notes             │ Approved profile info      │ Internal review  │
│ Private comments           │ Relevant qualifications    │ Fraud controls   │
│ Non-shared gaps            │ Shift-specific answers     │ Support notes    │
└────────────────────────────┴────────────────────────────┴──────────────────┘
│ Worker-private notes and comments are never exposed to employers.          │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ AI APPLICATION ASSISTANCE                                                  │
│ AI may summarize the application, identify missing answers, explain        │
│ requirement gaps, and explain the workflow. AI must not submit the         │
│ application, modify worker answers, negotiate, promise selection, rank     │
│ applicants unfairly, fabricate application content, waive requirements, or │
│ pressure the worker to apply.                                              │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ ACTION AREA                                                                │
│ [Save draft] [Back to Shift Details] [Submit application]                  │
│ Submit disabled when: required confirmation missing, required field        │
│ missing, material shift change not reviewed, deadline passed, shift closed,│
│ duplicate active application, account restriction, offline state.          │
└────────────────────────────────────────────────────────────────────────────┘
```

## 4. Mobile Wireframe Revision

```text
┌──────────────────────────────┐
│ Apply                  Help  │
│ [Role]                       │
└──────────────────────────────┘

┌──────────────────────────────┐
│ APPLICATION ONLY             │
│ Apply ≠ selected             │
│ Selected ≠ assignment        │
│ Assignment ≠ acceptance      │
│ Acceptance ≠ employment      │
└──────────────────────────────┘

┌──────────────────────────────┐
│ SUMMARY TO REVIEW            │
│ Shift + employer             │
│ Location + schedule          │
│ Pay: estimated/confirmed     │
│ Requirements + gaps          │
│ Travel + cancellation        │
│ Missing info clearly shown   │
└──────────────────────────────┘

┌──────────────────────────────┐
│ INPUTS FOR THIS SHIFT        │
│ Interest confirmation        │
│ Shift-specific answer        │
│ Optional note                │
│ No full profile duplication  │
└──────────────────────────────┘

┌──────────────────────────────┐
│ CONSENT                      │
│ [ ] Shift details            │
│ [ ] Compensation status      │
│ [ ] Requirements/gaps        │
│ [ ] Withdrawal terms         │
│ [ ] Employer review process  │
│ [ ] No guaranteed selection  │
└──────────────────────────────┘

┌──────────────────────────────┐
│ WITHDRAWAL                   │
│ Withdraw application only    │
│ Not cancelling accepted work │
│ [Withdraw] [Status]          │
└──────────────────────────────┘

┌──────────────────────────────┐
│ PRIVACY                      │
│ Private notes stay private   │
│ Employer sees submitted info │
│ required for review only     │
└──────────────────────────────┘

┌──────────────────────────────┐
│ AI HELP                      │
│ Explains missing fields      │
│ Cannot submit or change      │
└──────────────────────────────┘

┌──────────────────────────────┐
│ [Save draft]                 │
│ [Submit application]         │
│ Disabled reason shown        │
└──────────────────────────────┘
```

Mobile requirements:

- Completion path must be short and readable.
- Validation messages must be close to the relevant field or confirmation.
- Submit disabled reasons must be plain-language.
- Consent cannot be hidden behind dense accordions.
- Touch targets must be at least 44px.
- Screen-reader state announcements are required for save, submit, validation, and withdrawal.

## 5. Fairness Boundary

The application experience must not create unfair ranking or pressure.

Rules:

- Do not promise selection.
- Do not use scarcity pressure.
- Do not shame workers for withdrawing.
- Do not penalize workers in the UI for declining or withdrawing unless an approved policy governs a
  later operational state.
- Do not infer protected characteristics.
- Do not ask for unrelated personal information.
- Do not hide employer review criteria where the worker needs plain-language context.

## 6. Error and Edge States

| State | Handling |
| --- | --- |
| Draft saved | Confirm draft saved and remains worker-private until submitted. |
| Submit successful | Show Application Submitted, not assignment. |
| Required confirmation missing | Disable submit and identify missing confirmation. |
| Required field missing | Show field-level validation. |
| Material shift change | Block submit until Shift Details is reviewed again. |
| Deadline passed | Block submit and route back to Search Shifts. |
| Shift closed/filled/cancelled | Block submit and explain state. |
| Duplicate application | Show existing application state. |
| Additional information requested | Ask only shift-specific necessary information. |
| Withdraw requested | Require confirmation and explain consequence. |
| Withdraw successful | Show withdrawn status and reapplication rule if available. |
| Offline state | Allow draft where appropriate; submission requires connectivity. |
| Submission failed | Preserve draft and provide retry/support path. |
| Account restricted | Explain limitation without exposing internal reasons. |

## 7. Resolved Conditions

| Owner condition | Resolution |
| --- | --- |
| Separate lifecycle | Added complete View Shift through Confirmed Assignment lifecycle and concept boundaries. |
| Application summary | Added required pre-submit review summary with missing-information handling. |
| Worker inputs | Limited inputs to shift-specific information only. |
| Consent | Added explicit, unbundled, non-preselected informed consent. |
| Employer review boundary | Added employer/authorized reviewer boundary and no-guarantee language. |
| Worker withdrawal | Added withdrawal controls, status, reapplication note, and cancellation distinction. |
| Compensation transparency | Added estimated worker pay, premiums, travel, estimated hours, estimated gross, and no employer billing. |
| Requirement gaps | Added safe gap summaries and links to governing pages. |
| Privacy | Added worker-only, employer-visible, and platform-only separation. |
| AI boundary | Added allowed/prohibited AI list and fairness constraints. |
| Accessibility | Added mobile, validation, consent, confirmation, and screen-reader requirements. |
| Product review conditions | Resolved selection/assignment boundary, withdrawal boundary, additional-info guardrail, and compensation status confirmation. |

## 8. Self Validation

| Requirement | Status |
| --- | --- |
| Frozen title remains Apply | Pass |
| Architecture Freeze unchanged | Pass |
| Epic 3 Planning unchanged | Pass |
| UX Foundation unchanged | Pass |
| Navigation unchanged | Pass |
| Pages 016-024 unchanged | Pass |
| EPIC_3_MID_ARCHITECTURE_REVIEW.md unchanged | Pass |
| No Page 026 files created | Pass |
| No implementation started | Pass |
| No React created | Pass |
| No frontend created | Pass |
| No backend created | Pass |
| No APIs created | Pass |
| No database changes created | Pass |
| Unrelated app changes untouched | Pass |

## 9. Final Page Status

```text
Page 025 - Apply
Revision 1: COMPLETE
Product Review Revision 1: REQUIRED
Approval Record: NOT CREATED IN THIS FILE

Page 026
BLOCKED UNTIL APPROVAL RECORD IS CREATED
```
