# Resident Job

## Page 043 - Urgent Shift

**Status:** Low-Fidelity Wireframe Complete  
**Owner Review:** Required  
**Approval Record:** Not Created  
**Implementation:** Not Started  
**Page 044:** Blocked

---

## 1. Purpose

Page 043 designs the authenticated employer experience for urgent staffing requests.

This page owns urgent-shift intake and urgent-request governance only.

It does not own:

- standard shift creation
- recurring scheduling
- worker assignment
- attendance
- timesheets
- payroll
- billing
- payments
- notification delivery
- messaging
- matching
- surge pricing
- compliance verification
- AI automation

---

## 2. Primary Users

Authorized employer users who may submit or manage urgent staffing requests:

- organization owner
- administrator
- residence manager
- department manager
- scheduler
- staffing coordinator

Secondary stakeholders may include support, compliance, finance, administrator, or super administrator depending on permission and data sensitivity.

---

## 3. Core Boundary

Urgent shift must communicate:

```text
Urgent != Emergency service
Urgent != Guaranteed fulfillment
Urgent != Permission to bypass governance
```

Urgent requests receive prioritized operational review, but fulfillment still depends on worker availability, qualification requirements, location, scheduling conflicts, authorization, and governed business rules.

---

## 4. Urgency Classification

Urgency levels are configurable examples:

- Standard
- Short Notice
- Same Day
- Critical Operational Need

Classification card:

```text
Urgency Level
[Standard / Short Notice / Same Day / Critical Operational Need]

Urgency Reason
[Required operational reason]

Requested Start Time
[Date/time]

Staffing Deadline
[Date/time]

Governance Notice
Urgent requests are prioritized for review. They do not guarantee coverage.
```

Do not label ordinary staffing issues as public-safety or medical emergencies.

---

## 5. Urgent Shift Lifecycle

The lifecycle must remain separated:

```text
Draft
↓
Urgent Review
↓
Published
↓
Applications
↓
Assignment
↓
Completion
↓
Closure
```

No lifecycle state implies another.

Clarify:

```text
Draft != Under review
Urgent review != Published
Published != Applications received
Applications received != Assignment
Assignment != Worker confirmed
Worker confirmed != Checked in
Completed != Payroll approved
Closed != Payment settled
```

---

## 6. Information Architecture

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
│   ├── Urgent Shift
│   ├── Request status
│   ├── Last saved
│   └── Urgent staffing policy link
│
├── Main urgent request workspace
│   ├── Step 1: Organization / Residence / Department
│   ├── Step 2: Urgency Classification
│   ├── Step 3: Role and Staffing Need
│   ├── Step 4: Requested Start / Deadline
│   ├── Step 5: Critical Operational Facts
│   ├── Step 6: Qualification Requirements
│   ├── Step 7: Rate, Premium, and Estimate
│   ├── Step 8: Review and Publish Request
│   └── Step 9: Support / Escalation Path
│
├── Right governance panel
│   ├── Urgent lifecycle status
│   ├── Missing critical facts
│   ├── Eligibility and qualification boundary
│   ├── Pricing boundary
│   ├── AI advisory helper
│   └── Audit summary
│
└── Footer actions
    ├── Save Draft
    ├── Submit for Urgent Review
    └── Request Publication
```

### Mobile Structure

Mobile uses a step-based intake flow:

```text
Urgent Shift
├── Current status
├── Urgency classification
├── Missing critical facts
├── Current step card
├── Boundary notice
├── Save draft
└── Submit for review
```

The first mobile screen must immediately answer:

- What is the urgency level?
- What information is missing?
- Has the request been submitted?
- Is coverage confirmed? If not, say so clearly.

---

## 7. Step Detail Wireframes

### Step 1 - Organization / Residence / Department

```text
Organization
[Select organization]

Residence
[Select authorized residence]

Department
[Select authorized department]

Boundary note:
Residence selected != request authorized.
Department selected != publication authorized.
```

### Step 2 - Urgency Classification

```text
Urgency Level
[Standard / Short Notice / Same Day / Critical Operational Need]

Reason for urgency
[Text / controlled reason list where governed]

Requested start time
[Date/time]

Staffing deadline
[Date/time]

Notice:
Urgent classification prioritizes review. It does not guarantee staffing.
```

### Step 3 - Role and Staffing Need

```text
Worker role
[Configured role selector]

Required worker count
[Number]

Minimum acceptable count where governed
[Number / Not configured]

Operational note
[Why staffing is needed now]
```

Boundary:

```text
Urgent need != Worker assignment.
Requested quantity != Filled quantity.
```

### Step 4 - Requested Start / Deadline

```text
Requested start
[Date/time/timezone]

Latest acceptable arrival
[Date/time/timezone where governed]

Expected shift end
[Date/time/timezone]

Arrival window
[Guidance]
```

Boundary:

```text
Requested start != Worker confirmed.
Staffing deadline != Guaranteed response time.
Scheduled duration != Worked duration.
```

### Step 5 - Critical Operational Facts

Capture the minimum facts needed for review:

- department
- role
- staffing quantity
- date/time
- urgency reason
- arrival guidance
- work location
- required qualifications
- known constraints
- support contact role

The checklist should prioritize missing critical facts.

```text
Critical Facts Checklist
[ ] Role selected
[ ] Start time entered
[ ] Staffing quantity entered
[ ] Qualification requirements reviewed
[ ] Arrival instructions provided
[ ] Rate / premium summary reviewed
```

### Step 6 - Qualification Requirements

Represent:

- licence
- certification
- background check
- role requirements
- jurisdiction where governed

Clarify:

```text
Urgent != Qualification bypass.
Requirement configured != Worker qualified.
Worker qualified != Assigned.
```

### Step 7 - Rate, Premium, and Estimate

Represent:

- standard rate
- urgent premium
- travel allowance
- transportation allowance
- employer estimated cost

Clarify:

```text
Urgent premium != Guaranteed worker payment.
Estimated cost != Invoice.
Configured rate != Payroll.
```

Do not implement surge pricing, payroll, billing, taxes, settlement, deductions, or final invoice logic.

### Step 8 - Review and Publish Request

```text
Review urgent request
- organization
- residence
- department
- urgency level
- urgency reason
- requested start
- staffing deadline
- role
- quantity
- qualification requirements
- premium / estimate summary
- publication readiness

Required confirmations
[ ] I understand urgent requests do not guarantee fulfillment.
[ ] I understand urgent does not bypass worker eligibility.
[ ] I understand publication requires governed review.
[ ] I am authorized to submit this urgent request.

Actions
[Save Draft] [Submit for Urgent Review] [Request Publication]
```

Clarify:

```text
Review completed != Published.
Submit for urgent review != Published.
Publish request != Publish success.
```

### Step 9 - Support / Escalation Path

Represent conceptually:

- support path
- operational review path
- decline / insufficient information path
- cancellation path

Do not implement escalation logic.

Do not use local emergency numbers. If immediate medical or public-safety emergency exists, users should use local emergency services outside the staffing platform.

---

## 8. Publication Boundary

Urgent publication remains governed.

Represent:

- review
- validation
- publish request
- publish success
- publish failure

Clarify:

```text
Urgency selected != Published.
Validation passed != Published.
Publish requested != Published.
Published != Filled.
```

Do not automatically publish because urgency is selected.

---

## 9. Auditability

Conceptually preserve audit history for:

- urgency creation
- urgency changes
- pricing changes
- publication
- cancellation

Audit records include:

- actor
- role
- timestamp
- action
- prior state
- resulting state

Optional where applicable:

- urgency reason
- approval result
- publication result
- cancellation reason

Do not log resident or patient information.

---

## 10. AI Boundary

AI may:

- summarize urgency
- identify missing information
- explain urgency levels
- suggest wording
- identify visible conflicts

AI must never:

- publish urgent shifts
- assign workers
- change pricing
- bypass qualifications
- guarantee fulfillment
- override employer authorization
- label a request as fulfilled
- perform escalation logic

AI output must be advisory and labeled as such.

---

## 11. Page 044 Boundary

The owner order identifies Page 044 as the future shift publication / marketplace boundary.

Page 043 owns urgent-shift intake and urgent request governance only.

Page 043 must not introduce:

- marketplace behavior
- worker marketplace ranking
- automatic publication
- public worker browsing
- publication marketplace controls

No Page 044 files are created in this gate.

---

## 12. Empty and Error States

Represent:

- no authorized residence
- no authorized department
- no available urgent workflow
- urgency level unavailable
- missing critical facts
- invalid requested start
- invalid staffing deadline
- rate source unavailable
- premium unavailable
- validation unavailable
- urgent review unavailable
- publication failed
- service unavailable
- support unavailable

Do not fabricate urgent coverage or successful fulfillment.

---

## 13. Accessibility

The page must support:

- semantic form sections
- keyboard navigation
- accessible date/time controls
- accessible urgency classification controls
- no color-only urgency states
- plain-language warnings
- clear required fields
- screen-reader-friendly lifecycle status
- focus management
- sufficient contrast
- large mobile touch targets
- accessible review confirmation

---

## 14. International Readiness

Do not hardcode:

- urgency classification names as permanent system rules
- response-time guarantees
- currency
- premium rules
- labour rules
- licence requirements
- background-check requirements
- emergency numbers
- jurisdiction
- date format
- time format
- timezone
- staffing quantity rules

Keep urgency policy, premium policy, jurisdiction, role requirements, qualification requirements, rate policy, publication policy, escalation paths, and support channels configurable.

---

## 15. Validation

Confirmed:

- Pages 001-042 unchanged.
- Page 042 remains approved and frozen.
- No Page 044 files created.
- No approval record created.
- No implementation started.
- No React created.
- No frontend created.
- No backend created.
- No APIs created.
- No database changes created.
- No staffing engine created.
- No scheduling engine created.
- No payroll created.
- No billing created.
- No notifications created.
- No messaging created.
- No matching created.
- No surge-pricing created.
- No compliance integration created.
- No AI integration created.

---

## 16. Final Status

```text
Page 043 — Urgent Shift
Wireframe: COMPLETE
Product Review: PENDING IN SEPARATE FILE
Approval Record: NOT CREATED
Owner Review: REQUIRED

Page 044
BLOCKED
```
