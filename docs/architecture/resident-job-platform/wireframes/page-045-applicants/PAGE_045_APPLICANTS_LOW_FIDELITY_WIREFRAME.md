# Resident Job

## Page 045 - Applicants

**Status:** Low-Fidelity Wireframe Complete  
**Owner Review:** Required  
**Approval Record:** Not Created  
**Implementation:** Not Started  
**Page 046:** Blocked

---

## 1. Purpose

Page 045 designs the authenticated employer experience for managing applicants for a governed shift.

This page owns:

- applicant queue
- applicant review
- applicant filtering
- applicant comparison
- applicant status

This page does not own:

- worker assignment
- attendance
- payroll
- billing
- messaging
- notifications
- AI recommendations
- shift creation
- marketplace behavior
- matching or ranking engines

---

## 2. Primary Users

Authorized employer users who may review applicants:

- organization owner
- administrator
- residence manager
- department manager
- scheduler
- staffing coordinator

Read-only users may view permitted applicant information only where authorized.

---

## 3. Applicant Lifecycle

Represent applicant states separately:

```text
Application submitted
↓
Application received
↓
Under employer review
↓
Shortlisted
↓
Interview or clarification, where applicable
↓
Offer pending
↓
Accepted / Declined / Withdrawn / Closed
```

Clarify:

```text
Applied != Approved
Approved != Assigned
Assigned != Confirmed
Confirmed != Checked in
```

No applicant state may imply assignment, attendance, payroll, billing, or payment.

---

## 4. Information Architecture

### Desktop Structure

```text
Employer Shell
├── Top navigation
│   ├── Organization context
│   ├── Residence context
│   ├── User role
│   └── Notifications indicator
│
├── Page header
│   ├── Applicants
│   ├── Source shift reference
│   ├── Applicant count
│   └── Privacy / review notice
│
├── Applicant workspace
│   ├── Shift summary
│   ├── Applicant lifecycle tabs
│   ├── Filters
│   ├── Applicant list
│   ├── Comparison panel
│   ├── Applicant detail drawer
│   ├── Employer action area
│   └── Audit / history summary
│
├── Right governance panel
│   ├── Assignment boundary
│   ├── AI separation notice
│   ├── Worker privacy notice
│   ├── Fair review reminder
│   └── Support path
│
└── Footer actions
    ├── Review selected
    ├── Shortlist
    ├── Request clarification
    ├── Move to assignment workflow
    ├── Decline
    └── Archive
```

### Mobile Structure

Mobile uses list-first applicant review:

```text
Applicants
├── Source shift summary
├── Applicant state tabs
├── Filter button
├── Applicant card
│   ├── status
│   ├── qualification summary
│   ├── availability summary
│   ├── conflict indicators
│   └── actions
└── Detail drawer
```

The first mobile screen must answer:

- Which shift are these applicants for?
- How many applicants need review?
- Which applicants require action?
- What action can the employer take next?

---

## 5. Applicant Queue

Applicant list sections:

- New
- Under review
- Shortlisted
- Clarification requested
- Offer pending
- Accepted
- Declined
- Withdrawn
- Closed

Each applicant card shows minimum-necessary information:

- worker reference
- applicant status
- applied time
- availability summary
- qualification summary
- licence/certification indicators where permitted
- visible conflict indicator
- required document summary
- compliance status label

Do not expose private worker documents or protected details.

---

## 6. Applicant Review

Review panel:

```text
Applicant Review
├── Shift reference
├── Worker reference
├── Application status
├── Qualifications
├── Licences
├── Certifications
├── Availability
├── Scheduling conflicts
├── Required documents
├── Compliance status
├── Employer notes
└── Review actions
```

Clarify:

```text
Visible qualifications != Eligibility decision
Eligibility != Assignment
Shortlisted != Assigned
```

Employer notes must not contain protected-characteristic preferences, private health details, retaliation signals, or unsupported misconduct claims.

---

## 7. Filtering

Conceptually support filtering by:

- availability
- qualification
- licence
- certification
- language where lawful and operationally necessary
- distance where governed
- application date
- department
- residence
- shift

Do not create ranking algorithms.

Filters must not hide applicants permanently or create hidden exclusion rules.

---

## 8. Comparison

Comparison is side-by-side only.

Comparison may include:

- availability fit
- role requirements
- licence status
- certification status
- visible conflict
- required document status
- application notes

Comparison must not:

- score applicants automatically
- rank applicants automatically
- hide applicants
- make AI hiring decisions
- use protected characteristics
- treat rating as the sole decision factor

---

## 9. Employer Actions

Represent employer actions:

- review
- shortlist
- request clarification
- move to assignment workflow
- decline
- archive

Action boundaries:

```text
Reviewed != Shortlisted
Shortlisted != Assigned
Move to assignment workflow != Assignment confirmed
Declined != Worker misconduct
Archived != Deleted
```

Moving to the assignment workflow routes to Page 046 / later assignment governance. Page 045 must not assign the worker.

---

## 10. Worker Privacy

Employers must never see:

- banking information
- tax information
- protected complaints
- internal investigations
- private disputes
- unrelated employment history
- protected health information
- private documents
- precise private location
- unrelated earnings

Applicants page should show only minimum-necessary staffing information relevant to the shift.

---

## 11. AI Separation

Page 045 does not own AI.

AI suggestions belong exclusively to Page 044.

Page 045 may display a source note such as:

```text
Some applicants may have originated from Page 044 advisory suggestions.
Applicant review remains a human employer workflow.
```

Do not duplicate AI functionality.

Do not show AI ranking, AI rejection, AI assignment, or AI suitability guarantees.

---

## 12. Page 046 Boundary

The frozen architecture identifies Page 046 as **Assigned Worker**.

The owner order refers to the assignment boundary. Page 045 preserves that boundary:

```text
Applicant review belongs to Page 045.
Assignment belongs to Page 046 / later assignment workflow.
```

Do not introduce assignment confirmation into Page 045.

---

## 13. Auditability

Conceptually preserve:

- applicant review
- shortlist
- decline
- archive
- move to assignment

Audit records include:

- actor
- role
- timestamp
- action
- applicant reference
- prior state
- resulting state

Optional where applicable:

- reason
- shift reference
- clarification request reference
- support escalation reference

Do not log protected information or private worker documents.

---

## 14. Empty and Error States

Represent:

- no source shift selected
- no applicants
- applicant data unavailable
- filters return no results
- applicant details restricted
- comparison unavailable
- clarification action unavailable
- assignment workflow unavailable
- decline unavailable
- archive unavailable
- service unavailable
- support unavailable

Do not fabricate applicants or applicant status.

---

## 15. Accessibility

The page must support:

- semantic applicant cards
- keyboard navigation
- accessible filters
- accessible comparison view
- no color-only statuses
- screen-reader-friendly applicant states
- clear action confirmations
- focus management
- sufficient contrast
- mobile-friendly touch targets
- plain-language privacy and status notices

---

## 16. International Readiness

Do not hardcode:

- role
- licence model
- certification model
- background-check model
- language requirement
- distance threshold
- worker classification
- applicant status terminology where localization is needed
- decline reason
- compliance rule

Keep role, qualification, language, distance, jurisdiction, compliance, and applicant status policy configurable.

---

## 17. Validation

Confirmed:

- Pages 001-044 unchanged.
- Page 044 remains approved and frozen.
- No Page 046 files created.
- No approval record created.
- No implementation started.
- No React created.
- No frontend created.
- No backend created.
- No APIs created.
- No database changes created.
- No staffing engine created.
- No assignment engine created.
- No payroll created.
- No billing created.
- No notifications created.
- No messaging created.
- No ranking created.
- No matching created.
- No AI automation created.

---

## 18. Final Status

```text
Page 045 — Applicants
Wireframe: COMPLETE
Product Review: PENDING IN SEPARATE FILE
Approval Record: NOT CREATED
Owner Review: REQUIRED

Page 046
BLOCKED
```
