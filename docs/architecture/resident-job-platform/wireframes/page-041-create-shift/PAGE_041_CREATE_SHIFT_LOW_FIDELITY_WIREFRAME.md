# Resident Job

## Page 041 - Create Shift

**Status:** Low-Fidelity Wireframe Complete  
**Owner Review:** Required  
**Approval Record:** Not Created  
**Implementation:** Not Started  
**Page 042:** Blocked

---

## 1. Purpose

Page 041 designs the authenticated employer experience for creating a governed shift draft.

The page allows an authorized employer user to define a proposed staffing shift connected to:

- one organization
- one residence
- one department
- one governed worker role
- one date and time window
- one staffing quantity
- one approved rate or pricing source
- one publication and assignment workflow

This page owns the shift draft and publication entry point only.

It does not own worker assignment, attendance, timesheets, payroll, billing, payment settlement, notifications, messaging, compliance verification, document verification, or AI matching.

---

## 2. Primary User

Authorized employer users who may create staffing shift drafts, such as:

- organization owner
- administrator
- residence manager
- department manager
- scheduler
- staffing coordinator

Read-only observers, finance-only users, and compliance-only users may see relevant context only where permitted, but dashboard access does not imply shift-creation authority.

---

## 3. Boundary Statement

Create Shift must clearly separate:

```text
Draft
!= Published

Published
!= Filled

Worker Applied
!= Worker Assigned

Worker Assigned
!= Worker Confirmed

Worker Confirmed
!= Worker Checked In

Worker Checked In
!= Shift Completed

Shift Completed
!= Timesheet Approved
```

The page must also communicate:

- scheduled duration is not worked time
- scheduled break is not actual break taken
- rate displayed is not final payroll
- estimated employer cost is not final invoice
- urgent request is not guaranteed coverage
- AI suggestion is not an operational decision

---

## 4. Information Architecture

### Desktop Structure

```text
Employer Shell
├── Top navigation
│   ├── Organization selector
│   ├── Residence context
│   ├── Notifications indicator
│   └── User / role menu
│
├── Page header
│   ├── Create Shift
│   ├── Draft status
│   ├── Last saved
│   └── Help / policy link
│
├── Main creation workspace
│   ├── Step 1: Organization / Residence / Department
│   ├── Step 2: Worker Role
│   ├── Step 3: Date, Time, Break, Arrival
│   ├── Step 4: Staffing Quantity
│   ├── Step 5: Rate and Pricing Summary
│   ├── Step 6: Qualification Requirements
│   ├── Step 7: Location and Arrival Guidance
│   ├── Step 8: Shift Description
│   ├── Step 9: Visibility and Application Method
│   ├── Step 10: Cancellation and Support Summary
│   └── Step 11: Review and Publish
│
├── Right context panel
│   ├── Validation status
│   ├── Permission status
│   ├── Warnings
│   ├── AI advisory helper
│   └── Draft audit summary
│
└── Footer actions
    ├── Save Draft
    ├── Preview
    ├── Request Approval
    └── Publish Shift
```

### Mobile Structure

Mobile uses a step-based flow instead of one long form.

```text
Create Shift
├── Progress indicator
├── Current step card
├── Required fields
├── Validation / warning area
├── Save draft
├── Continue
└── Review before publish
```

First-screen mobile priority:

1. selected organization / residence / department
2. draft status
3. current step
4. critical validation messages
5. save state

---

## 5. Page States

### Draft State

- Not started
- Draft
- Saving
- Saved
- Save failed
- Draft unavailable
- Stale draft
- Conflicting edit
- Draft restored

### Validation State

- Not validated
- Validation pending
- Valid
- Correction required
- Invalid
- Validation unavailable

### Approval State

- Not required
- Approval required
- Approval pending
- Approved
- Rejected
- Approval unavailable

### Publication State

- Not published
- Scheduled for publication
- Published
- Paused
- Closed
- Cancelled
- Publication failed
- Publication unavailable

### Staffing State

- No applications
- Applications received
- Partially filled
- Fully filled
- Overstaffing prevented
- Staffing unavailable

These states must remain independent. They must not collapse into one generic "Active" badge.

---

## 6. Low-Fidelity Wireframe - Desktop

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ Resident Job Employer Portal                                                │
│ Organization: [Select]   Residence: [Select]   User Role: Scheduler          │
├─────────────────────────────────────────────────────────────────────────────┤
│ Create Shift                                      Draft: Saved  10:42 AM     │
│ Create a governed staffing shift draft. Publishing requires authorization.   │
├───────────────────────────────────────────────┬─────────────────────────────┤
│ STEP 1 OF 11                                  │ Validation Summary          │
│ Organization / Residence / Department          │ ┌─────────────────────────┐ │
│                                               │ │ Draft: Saved             │ │
│ Organization                                  │ │ Validation: Pending      │ │
│ [ Organization selector                    v ]│ │ Approval: Required       │ │
│                                               │ │ Publication: Not public  │ │
│ Residence                                     │ └─────────────────────────┘ │
│ [ Residence selector                       v ]│                             │
│                                               │ Critical Warnings           │
│ Department                                    │ ┌─────────────────────────┐ │
│ [ Department selector                      v ]│ │ No role selected.        │ │
│                                               │ │ Rate source missing.     │ │
│ Permission note                               │ └─────────────────────────┘ │
│ [You can draft shifts for this department.]   │                             │
│                                               │ AI Advisory                 │
│ [Continue] [Save Draft]                       │ ┌─────────────────────────┐ │
│                                               │ │ AI can explain fields    │ │
│                                               │ │ and missing items only.  │ │
│                                               │ │ It cannot publish, price,│ │
│                                               │ │ assign, or approve.      │ │
│                                               │ └─────────────────────────┘ │
├───────────────────────────────────────────────┴─────────────────────────────┤
│ Footer: Save Draft | Preview | Request Approval | Publish Shift              │
│ Publish is disabled until validation and authorization are satisfied.         │
└─────────────────────────────────────────────────────────────────────────────┘
```

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
Organization selected != residence authorized.
Residence selected != department authorized.
Department selected != shift permitted.
```

Unavailable states:

- no authorized residence
- inactive residence
- restricted residence
- no authorized department
- closed department
- inaccessible cost centre

### Step 2 - Worker Role

```text
Worker Role
[Role selector]

Examples only:
Nurse / Beneficiary Attendant / Chef / Sous-Chef / Cook /
Kitchen Assistant / Dishwasher / Cleaner / Maintenance /
Administration / Other approved role

Role summary
- Role definition
- Department compatibility
- Required qualifications
- Required licence
- Required certification
- Background-check requirement
- Worker classification
- Jurisdiction rules

Boundary note:
Role selected != worker eligible.
Role eligibility != worker assigned.
```

### Step 3 - Date, Time, Break, Arrival

```text
Shift Date
[Date]

Start Time / Timezone
[Start] [Timezone]

End Time / Overnight
[End] [Overnight toggle]

Break Expectation
[Expected break] [Paid/unpaid where governed] [Duration]

Arrival Window
[Arrival guidance] [Check-in availability window]
```

Conceptual validation:

- start before end
- overnight boundary
- timezone
- daylight-saving transition
- minimum and maximum duration
- past-date restriction
- overlap warning
- residence operating restriction

Boundary note:

```text
Scheduled duration != worked time.
Scheduled break != actual break taken.
Shift extension != automatically approved overtime.
```

### Step 4 - Staffing Quantity

```text
Required worker count
[Number]

Minimum worker count where governed
[Number / Not configured]

Maximum worker count
[Number / Not configured]

Staffing summary
Required: --
Assigned: --
Remaining openings: --
```

Boundary note:

```text
Quantity requested != quantity filled.
Quantity filled != every worker confirmed.
```

No staffing quantity may be inferred from resident counts or protected information.

### Step 5 - Rate and Pricing Summary

```text
Approved Rate Source
[Rate source selector]

Worker-facing compensation summary
- Worker hourly rate
- Approved premium
- Urgent-shift premium where governed
- Travel allowance where governed
- Transportation time where governed
- Reimbursement where governed

Employer estimated cost
- Estimate only
- Final invoice depends on approved business rules and downstream workflows
```

Boundary note:

```text
Base rate != final gross pay.
Estimated earnings != approved earnings.
Employer estimated cost != final invoice.
```

Do not calculate taxes, deductions, net pay, final invoice, or final platform margin.

### Step 6 - Qualification Requirements

```text
Licence requirements
[Select governed requirement]

Certification requirements
[Select governed requirement]

Background-check requirement
[Select governed requirement]

Training / experience / language / operational requirements
[Configure where lawful, necessary, and governed]
```

Boundary note:

```text
Requirement selected != requirement lawful.
Worker document uploaded != requirement satisfied.
Verified qualification != worker assigned.
```

### Step 7 - Location and Arrival Guidance

```text
Residence
[Selected residence]

Department
[Selected department]

Assignment address
[Approved operational address]

Arrival guidance
[Entrance / parking / reporting contact role / accessibility info]

Check-in zone where governed
[Conceptual only]
```

Location guidance must use minimum necessary information.

Do not expose resident names, room numbers, identifying medical units, broad security codes, private staff phone numbers, or protected health information.

### Step 8 - Shift Description

```text
Shift title
[Plain-language title]

Role summary
[Responsibilities and approved workplace expectations]

Required skills
[Role-essential skills only]

Dress / equipment guidance
[Approved operational guidance]

Support contact role
[Role-based contact, not private details]

Prohibited-content reminder
Do not include resident-identifying information, diagnoses, medication instructions,
clinical care plans, discriminatory requirements, protected-characteristic preferences,
or unsupported misconduct warnings.
```

### Step 9 - Visibility and Application Method

```text
Visibility
[Private draft / Internal employer only / Invited workers only /
 Eligible worker pool / Published marketplace / Restricted / Paused / Closed]

Applications
[Applications allowed / Invitation only / Employer review required]

Application deadline
[Deadline where governed]
```

Boundary note:

```text
Published != visible to every worker.
Eligible pool != assigned worker.
Private != deleted.
```

Page 041 must not approve, reject, rank, or assign workers.

### Step 10 - Cancellation and Support Summary

```text
Cancellation terms
[Configurable high-level summary]

Reason required?
[Where governed]

Support path
[Support / operational review]
```

Boundary note:

```text
Cancellation requested != cancellation effective.
Cancelled shift != worker misconduct.
Cancellation != automatic forfeiture of earned pay.
```

### Step 11 - Review and Publish

```text
Review Summary
- Organization
- Residence
- Department
- Role
- Date
- Time
- Timezone
- Worker count
- Rate and premiums
- Arrival guidance
- Requirements
- Visibility
- Application method
- Cancellation summary

Required confirmations
[ ] I reviewed the shift details.
[ ] I understand publishing does not guarantee fulfillment.
[ ] I understand worker eligibility and assignment are governed separately.
[ ] I am authorized to publish this shift.

Actions
[Save Draft] [Request Approval] [Publish Shift]
```

Boundary note:

```text
Review completed != published.
Publish clicked != publication succeeded.
Save draft != publish.
```

---

## 8. Warnings and Error States

Include compact warning and recovery states for:

- possible duplicate shift
- overlapping shift
- conflicting department requirement
- invalid residence status
- duplicate time window
- excessive staffing quantity
- missing rate source
- missing qualification requirement
- publication conflict
- validation unavailable
- draft save failed
- approval unavailable
- publication failed
- conflicting edit
- service unavailable
- support unavailable

Warnings do not automatically reject a draft unless governed rules require that outcome.

---

## 9. Draft Saving and Multi-User Editing

Represent:

- autosave where future-approved
- manual save
- last saved
- unsaved changes
- save failed
- stale draft
- conflicting edit
- draft restored
- draft unavailable
- current editor
- last editor
- read-only while locked where governed
- change history

Clarify:

```text
Saved != validated.
Validated != approved.
Approved != published.
```

Do not design collaborative editing infrastructure.

---

## 10. Notifications and Messaging Boundary

Page 041 may show conceptual notifications that downstream systems could trigger:

- shift published
- shift changed
- shift cancelled
- application received
- assignment confirmed

Page 041 must not own push, SMS, email, template delivery, notification scheduling, or provider delivery.

Page 041 may indicate when a shift conversation becomes available after publication or assignment, but it must not create threads, send messages, expose contact details, or bypass Page 033 governance.

---

## 11. Auditability

Conceptually preserve audit history for:

- draft creation
- field changes
- rate changes
- qualification changes
- visibility changes
- approval
- publication request
- publication result
- cancellation
- staff-assisted correction

Audit records should preserve:

- actor
- role
- action
- shift reference
- prior state
- requested state
- resulting state
- reason where applicable
- timestamp
- result

Do not log resident or patient information.

---

## 12. AI Boundaries

AI may:

- help draft a safe shift description
- explain field requirements
- identify missing fields
- summarize the proposed shift
- identify potential duplicate or conflict indicators
- suggest navigation
- explain state terminology

AI must not:

- create or publish shifts without explicit authorized action
- set or change pay rates
- determine legal compliance
- determine worker eligibility
- assign workers
- rank applicants
- reject applicants
- bypass qualifications
- infer protected characteristics
- expose resident information
- fabricate demand
- promise fulfillment
- alter cancellation consequences

The governed shift draft and authoritative workflows remain controlling.

---

## 13. Accessibility

The page must support:

- semantic form sections
- keyboard navigation
- accessible date and time controls
- accessible validation messages
- no color-only warnings
- clear required fields
- accessible rate and quantity inputs
- focus management
- clear publish confirmation
- screen-reader-friendly progress
- sufficient contrast
- plain-language errors
- accessible timezone and overnight-shift handling

---

## 14. International Readiness

Do not hardcode:

- worker role
- currency
- hourly-only payment
- date format
- time format
- timezone
- overtime rules
- break rules
- premium rules
- cancellation rules
- worker classification
- licence requirement
- background-check model
- staffing quantity rules
- employer billing model
- urgent-shift definition
- language requirements

Keep jurisdiction, organization, residence, department, role, locale, rate policy, qualification policy, visibility, and cancellation policy configurable.

---

## 15. Future Boundary

Page 041 does not own:

- worker matching
- worker ranking
- application review
- assignment
- attendance
- timesheets
- payroll
- billing
- payments
- notification delivery
- messaging
- compliance verification
- document verification
- fraud engine
- scheduling optimization
- analytics

It creates and validates the governed shift draft and provides explicit publication entry points only.

---

## 16. Validation

Confirmed:

- Frozen title remains Create Shift.
- Architecture Freeze unchanged.
- Employer Portal planning unchanged.
- Pages 001-040 unchanged.
- No Page 042 files created.
- No approval record created.
- No implementation started.
- No React created.
- No frontend created.
- No backend created.
- No APIs created.
- No database changes created.
- No shift implementation created.
- No scheduling engine created.
- No staffing or matching implementation created.
- No payroll or billing implementation created.
- No notification or messaging implementation created.
- No compliance or document-verification implementation created.
- No AI shift implementation created.

---

## 17. Final Status

```text
Page 041 — Create Shift
Wireframe: COMPLETE
Product Review: PENDING IN SEPARATE FILE
Approval Record: NOT CREATED
Owner Review: REQUIRED

Page 042
BLOCKED
```
