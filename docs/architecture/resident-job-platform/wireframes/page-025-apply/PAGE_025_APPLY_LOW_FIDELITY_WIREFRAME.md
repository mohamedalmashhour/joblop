# Page 025 - Apply Low-Fidelity Wireframe

Status: Initial wireframe complete
Epic: Epic 3 - Worker Portal
Primary user: Authenticated worker
Architecture baseline: Resident Job Architecture Phase 1 v1.0
Epic planning baseline: Epic 3 Worker Portal Planning v1.0
Frozen architecture source: pages/PAGE_025_APPLY.md
Implementation: Not authorized

## 1. Frozen Page Confirmation

The frozen architecture page map defines:

| Page | Frozen title | Source |
| --- | --- | --- |
| 024 | Shift Details | pages/PAGE_024_SHIFT_DETAILS.md |
| 025 | Apply | pages/PAGE_025_APPLY.md |
| 026 | Accepted Shift | pages/PAGE_026_ACCEPTED_SHIFT.md |

No title inference, rename, or architecture amendment is introduced.

## 2. Page Purpose

The Apply page governs the worker's application to a shift.

It owns only the application step.

It must clearly distinguish:

```text
Viewing
↓
Applying
↓
Employer Review
↓
Selection
↓
Assignment Offer
↓
Worker Acceptance
↓
Confirmed Assignment
```

The Apply page must not:

- assign the worker;
- accept an assignment;
- create an employment contract;
- confirm attendance;
- create payroll;
- guarantee selection;
- guarantee employment.

## 3. Information Ownership

Page 025 owns:

- shift-specific application review;
- shift-specific worker confirmations;
- shift-specific optional note or approved question responses;
- application draft and submission state;
- privacy-safe application summary;
- application consent and acknowledgement.

Page 025 does not own:

- worker profile;
- professional information;
- licences;
- certifications;
- background-check workflow;
- availability editing;
- shift assignment;
- worker acceptance of assignment;
- check-in or check-out;
- timesheets;
- earnings;
- payroll.

## 4. Application State Model

The application must use distinct states.

```text
Draft
↓
Submitted
↓
Employer Reviewing
↓
Additional Information Requested
↓
Withdrawn
↓
Closed
↓
Selected (future workflow)
```

Do not merge these states.

Selection is not assignment. Assignment offer and worker acceptance belong to later workflows.

## 5. Desktop Wireframe

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ Resident Job                                Apply             Profile Help│
│ Worker: [Name]                             Shift: [Role]            Alert │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ APPLICATION BOUNDARY NOTICE                                                │
│ You are applying for this shift. Submitting this application does not      │
│ assign you, accept an assignment, confirm attendance, create payroll, or   │
│ guarantee selection or employment.                                         │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ SHIFT SUMMARY FROM PAGE 024                                                │
├──────────────────────────────┬─────────────────────────────────────────────┤
│ Role                         │ [Role]                                      │
│ Department                   │ [Department]                                │
│ Employer / residence         │ [Approved operational name]                 │
│ Location                     │ [Approved visibility level]                 │
│ Date and time                │ [Date] [Start-end] [Timezone]               │
│ Urgency                      │ [Standard / urgent / same-day]              │
│ Last material update         │ [Timestamp placeholder]                     │
│ Shift status                 │ [Open / changed / deadline pending]         │
└──────────────────────────────┴─────────────────────────────────────────────┘
│ If material shift information changed since review, the worker must return │
│ to Shift Details before submitting.                                        │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ APPLICATION FLOW                                                           │
├──────────────────────────────┬─────────────────────────────────────────────┤
│ Current step                 │ Confirm application information             │
│ Application state            │ Draft                                       │
│ Next state after submit      │ Submitted / employer reviewing              │
│ Not created by submit        │ Assignment, acceptance, attendance, payroll │
└──────────────────────────────┴─────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ QUALIFICATIONS AND KNOWN REQUIREMENTS                                      │
├──────────────────────────────┬────────────────────────────┬───────────────┤
│ Requirement                  │ Current known status        │ Worker action │
│ Role suitability             │ Appears satisfied / review  │ Review        │
│ Licence                      │ Satisfied / gap / unknown   │ Review source │
│ Certification                │ Satisfied / expired / gap   │ Review source │
│ Background-check requirement │ Summary only, no details    │ View status   │
│ Availability                 │ Available / conflict        │ View calendar │
│ Shift-specific requirement   │ Answer required / optional  │ Complete      │
└──────────────────────────────┴────────────────────────────┴───────────────┘
│ Requirement appears satisfied ≠ final legal determination. All known       │
│ requirements satisfied ≠ guaranteed selection.                             │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ COMPENSATION SUMMARY                                                       │
├──────────────────────────────┬─────────────────────────────────────────────┤
│ Worker hourly rate           │ [Known / estimated / unavailable]           │
│ Premiums                     │ [If approved and applicable]                │
│ Travel allowance             │ [If approved and applicable]                │
│ Reimbursement                │ [If approved and applicable]                │
│ Estimated gross              │ [Amount if calculable]                      │
│ Payment note                 │ [Approved timing/method summary if known]   │
└──────────────────────────────┴─────────────────────────────────────────────┘
│ Estimated gross ≠ net pay. Estimated hours ≠ guaranteed paid hours.        │
│ Employer billing and platform margin are not shown to workers.             │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ SHIFT-SPECIFIC INPUTS ONLY                                                 │
│ Optional note to employer/platform: [short text area]                      │
│ Approved shift-specific question: [answer field if required]               │
│ Availability confirmation: [confirm known availability/conflict]           │
│ Relevant experience summary: [optional short summary if allowed]           │
│ Do not request full profile, professional history, licences, certificates, │
│ background-check data, or availability setup again here.                   │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ APPLICATION CONSENT AND CONFIRMATION                                       │
│ The worker must explicitly confirm each applicable item. No boxes are      │
│ preselected and unrelated consent is not bundled.                          │
│ [ ] I reviewed the shift date and time.                                    │
│ [ ] I reviewed location and travel expectations.                           │
│ [ ] I reviewed role, duties, and scope.                                    │
│ [ ] I reviewed the compensation summary.                                   │
│ [ ] I reviewed known requirements and gaps.                                │
│ [ ] I reviewed cancellation or withdrawal terms where applicable.          │
│ [ ] I understand applying does not guarantee selection or assignment.      │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ PRIVACY AND EMPLOYER VISIBILITY                                            │
├────────────────────────────┬────────────────────────────┬──────────────────┤
│ WORKER PRIVATE             │ EMPLOYER VISIBLE FOR THIS  │ PLATFORM ONLY    │
│ Draft application          │ APPLICATION                │ Audit history    │
│ Private worker note        │ Relevant profile summary   │ Internal review  │
│ Viewed shift history       │ Relevant qualifications    │ Fraud controls   │
│ Non-shared requirement gap │ Shift-specific answers     │ Support notes    │
│ details                    │ Application status         │                  │
└────────────────────────────┴────────────────────────────┴──────────────────┘
│ Employer sees only information required for evaluating this application    │
│ according to approved workflow.                                            │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ AI APPLICATION ASSISTANCE                                                  │
│ AI may summarize the application, explain requirement gaps, and identify   │
│ missing application fields. AI must not submit the application, modify     │
│ worker answers, negotiate, promise selection, or rank workers unfairly.    │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ ACTION AREA                                                                │
│ [Save draft] [Back to Shift Details] [Submit application]                  │
│ Disabled examples: missing required confirmation, material shift change,   │
│ application deadline passed, shift closed, unresolved required input,      │
│ offline state, duplicate application, account restriction.                 │
└────────────────────────────────────────────────────────────────────────────┘
```

## 6. Mobile Wireframe

Mobile must prioritize the application boundary, required confirmations, and submit safety.

```text
┌──────────────────────────────┐
│ Apply                  Help  │
│ [Role]                       │
└──────────────────────────────┘

┌──────────────────────────────┐
│ APPLYING ONLY                │
│ Applying ≠ selected          │
│ Selected ≠ assigned          │
│ Assigned ≠ accepted          │
└──────────────────────────────┘

┌──────────────────────────────┐
│ SHIFT SUMMARY                │
│ Date/time/timezone           │
│ Location visibility          │
│ Status: Open / changed       │
│ Last update: [placeholder]   │
│ [Return to details]          │
└──────────────────────────────┘

┌──────────────────────────────┐
│ REQUIREMENTS                 │
│ Role: appears satisfied      │
│ Licence: status              │
│ Certification: status        │
│ Background: summary only     │
│ Availability: ok/conflict    │
│ [Review gaps]                │
└──────────────────────────────┘

┌──────────────────────────────┐
│ COMPENSATION                 │
│ Rate: [Known/estimated]      │
│ Premiums: [If any]           │
│ Travel: [If any]             │
│ Est. gross: [Amount]         │
│ Estimate ≠ final pay         │
└──────────────────────────────┘

┌──────────────────────────────┐
│ APPLICATION INPUTS           │
│ Optional note                │
│ Shift-specific answer        │
│ Availability confirmation    │
└──────────────────────────────┘

┌──────────────────────────────┐
│ CONFIRM BEFORE SUBMIT        │
│ [ ] Date/time                │
│ [ ] Location/travel          │
│ [ ] Duties/scope             │
│ [ ] Compensation             │
│ [ ] Requirements/gaps        │
│ [ ] Cancellation terms       │
│ [ ] No guaranteed selection  │
└──────────────────────────────┘

┌──────────────────────────────┐
│ AI HELP                      │
│ Can explain missing fields   │
│ Cannot submit or modify      │
└──────────────────────────────┘

┌──────────────────────────────┐
│ [Save draft]                 │
│ [Submit application]         │
│ Disabled reason shown        │
└──────────────────────────────┘
```

Mobile requirements:

- Required confirmations must be easy to review and not preselected.
- Submit action must show disabled reasons clearly.
- Compensation and requirement summaries must remain visible before submission.
- Touch targets must be at least 44px.
- Error and validation messages must appear near the relevant field.
- Sticky submit may be used only if it does not hide required confirmations.

## 7. Worker Inputs

Allowed shift-specific inputs:

- Confirmation of interest.
- Optional note.
- Relevant experience summary for this shift where approved.
- Response to an approved shift-specific question.
- Acknowledgement of known requirements.
- Availability confirmation for the specific shift.

Do not request again information already governed by:

- Profile.
- Professional Information.
- Licences.
- Certifications.
- Background Check.
- Availability.

Do not duplicate full worker onboarding.

## 8. Application Status Details

| State | Meaning |
| --- | --- |
| Draft | Worker has started but not submitted. |
| Submitted | Application was sent for the approved workflow. |
| Employer Reviewing | Employer or authorized workflow is reviewing. |
| Additional Information Requested | Worker must respond to a specific request. |
| Withdrawn | Worker withdrew the application before selection/assignment. |
| Closed | Application is no longer active. |
| Selected | Future workflow; not assignment and not acceptance. |

State messages must not imply assignment, acceptance, attendance, payroll, or employment.

## 9. Privacy Rules

Employer sees only information required for evaluating the application.

Worker private notes remain private.

Employer-visible information may include:

- relevant profile summary;
- relevant qualifications;
- operational availability;
- approved shift-specific answers;
- application status.

Employer must not see:

- full profile;
- full documents;
- full background-check details;
- search history;
- private worker notes;
- unrelated requirements or gaps;
- platform-only audit or support notes.

## 10. Consent Rules

Consent must be explicit and limited to the application.

Required principles:

- no preselected confirmations;
- no unrelated consent bundle;
- plain-language acknowledgements;
- confirmation of reviewed shift details;
- confirmation of known requirements and gaps;
- confirmation of compensation summary;
- confirmation of cancellation or withdrawal terms where applicable;
- confirmation that application does not guarantee selection or assignment.

## 11. AI Boundaries

AI may:

- summarize the application;
- explain requirement gaps;
- identify missing application fields.

AI must not:

- submit the application;
- modify worker answers;
- negotiate;
- promise selection;
- rank workers unfairly;
- fabricate shift or worker information;
- waive requirements;
- pressure the worker to apply.

## 12. Empty, Loading, Error, and Edge States

| State | Handling |
| --- | --- |
| Application draft empty | Show required next steps and return to Shift Details. |
| Required confirmation missing | Disable submit and identify the missing item. |
| Required field missing | Show field-level validation. |
| Material shift change | Block submit until worker reviews changed details. |
| Deadline passed | Block submit and route to Search Shifts. |
| Shift closed/filled/cancelled | Block submit and explain status. |
| Duplicate application | Show existing application status. |
| Prior application withdrawn | Explain whether reapplication is allowed. |
| Offline state | Allow draft where appropriate; submission requires connectivity. |
| Submission failed | Preserve draft and provide retry/support path. |
| Additional information requested | Show request and response path without duplicating onboarding. |
| Account restricted | Explain user-facing limitation without internal reasons. |

## 13. Accessibility

Accessibility requirements:

- Keyboard navigation.
- Screen-reader support.
- Mobile-first flow.
- Plain language.
- Confirmation clarity.
- Validation clarity.
- No color-only warnings.
- Error messages associated with fields.
- Clear focus order from summary to inputs to confirmations to actions.
- Status announcements after save or submit attempt.
- Accessible disabled-state explanations.

## 14. International Readiness

Do not hardcode:

- currency;
- compensation model;
- date format;
- time format;
- timezone;
- labour rules;
- cancellation rules;
- employment classification;
- role names;
- licence requirements;
- certification requirements;
- background-check requirements;
- language.

Jurisdiction, employer, role, currency, locale, and assignment rules remain configurable.

## 15. Self Validation

| Requirement | Status |
| --- | --- |
| Frozen architecture unchanged | Pass |
| Pages 016-024 unchanged | Pass |
| No implementation started | Pass |
| No Page 026 created | Pass |
| No React created | Pass |
| No frontend created | Pass |
| No backend created | Pass |
| No APIs created | Pass |
| No database changes created | Pass |
| No deployment | Pass |

## 16. Final Page Status

```text
Page 025 - Apply
Wireframe: COMPLETE
Product Review: REQUIRED
Approval Record: NOT CREATED

Page 026
BLOCKED
```
