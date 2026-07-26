# Resident Job

## Page 042 - Recurring Shift

**Status:** Low-Fidelity Wireframe Complete  
**Owner Review:** Required  
**Approval Record:** Not Created  
**Implementation:** Not Started  
**Page 043:** Blocked

---

## 1. Purpose

Page 042 designs the authenticated employer experience for configuring a governed recurring shift template.

This page owns recurrence governance only.

It does not own:

- single-shift creation
- worker staffing
- worker assignment
- worker applications
- attendance
- timesheets
- payroll
- billing
- payments
- matching
- notification delivery
- messaging
- recurrence processing
- background jobs
- AI automation

---

## 2. Primary Users

Authorized employer users who may configure recurring staffing needs:

- organization owner
- administrator
- residence manager
- department manager
- scheduler
- staffing coordinator

Access to employer dashboards, departments, or residences does not automatically grant authority to create, edit, pause, or cancel recurring shift templates.

---

## 3. Core Concept

The page must make this lifecycle unmistakable:

```text
Single Shift
↓
Recurring Template
↓
Generated Shift Occurrence
↓
Published Occurrence
↓
Assigned Occurrence
↓
Completed Occurrence
```

A recurring template is never itself a worked shift.

Clarify:

```text
Template created != Occurrence generated
Occurrence generated != Published
Published != Assigned
Assigned != Worked
Worked != Payroll approved
```

---

## 4. Page Boundary

Page 042 owns:

- recurrence rule configuration
- recurring template details
- future occurrence preview
- exception policy
- series status
- pause/resume/cancel concept
- auditability concept

Page 042 does not own:

- occurrence generation engine
- scheduling jobs
- worker assignment
- applications
- attendance
- payroll
- billing
- matching
- notifications
- messaging

The page governs recurrence configuration only.

---

## 5. Information Architecture

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
│   ├── Recurring Shift
│   ├── Template status
│   ├── Last saved
│   └── Help / recurrence policy
│
├── Main recurrence workspace
│   ├── Step 1: Template Context
│   ├── Step 2: Base Shift Details
│   ├── Step 3: Recurrence Rule
│   ├── Step 4: Effective Dates and Timezone
│   ├── Step 5: Publication Policy
│   ├── Step 6: Exception Policy
│   ├── Step 7: Occurrence Preview
│   ├── Step 8: Review and Save Template
│   └── Step 9: Activation Request
│
├── Right governance panel
│   ├── Template lifecycle
│   ├── Series status
│   ├── Conflict warnings
│   ├── AI advisory helper
│   └── Audit summary
│
└── Footer actions
    ├── Save Draft
    ├── Preview Occurrences
    ├── Request Approval
    └── Activate Recurring Template
```

### Mobile Structure

Mobile uses a step-based recurrence flow:

```text
Recurring Shift
├── Progress indicator
├── Current template state
├── Current step card
├── Compact warning drawer
├── Occurrence preview summary
├── Save draft
└── Continue / Review
```

Avoid dense recurrence tables on mobile.

---

## 6. Recurring Template States

### Template Draft State

- Not started
- Draft
- Saving
- Saved
- Save failed
- Draft unavailable
- Stale draft
- Conflicting edit

### Template Validation State

- Not validated
- Validation pending
- Valid
- Correction required
- Invalid
- Validation unavailable

### Template Approval State

- Not required
- Approval required
- Approval pending
- Approved
- Rejected
- Approval unavailable

### Series State

- Active series
- Paused series
- Completed series
- Expired series
- Cancelled series

Clarify:

```text
Series paused != Occurrences deleted
Series cancelled != Historical shifts deleted
```

### Occurrence State

- Not generated
- Generated
- Pending publication
- Published
- Paused
- Cancelled
- Assigned
- Completed
- Exception applied

Template, series, and occurrence states must remain independent.

---

## 7. Low-Fidelity Wireframe - Desktop

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ Resident Job Employer Portal                                                │
│ Organization: [Select]   Residence: [Select]   User Role: Scheduler          │
├─────────────────────────────────────────────────────────────────────────────┤
│ Recurring Shift                                  Template Draft: Saved        │
│ Create a governed recurrence template. This is not a worked shift.           │
├───────────────────────────────────────────────┬─────────────────────────────┤
│ STEP 1 OF 9                                   │ Governance Panel            │
│ Template Context                               │ ┌─────────────────────────┐ │
│                                               │ │ Template: Draft          │ │
│ Organization                                  │ │ Validation: Pending      │ │
│ [ Organization selector                    v ]│ │ Approval: Required       │ │
│                                               │ │ Series: Not active       │ │
│ Residence                                     │ │ Occurrences: Not created │ │
│ [ Residence selector                       v ]│ └─────────────────────────┘ │
│                                               │                             │
│ Department                                    │ Conflict Warnings           │
│ [ Department selector                      v ]│ ┌─────────────────────────┐ │
│                                               │ │ No recurrence rule.      │ │
│ Template boundary notice                      │ │ No effective start.      │ │
│ [A template is not a worked shift.]           │ └─────────────────────────┘ │
│                                               │                             │
│ [Continue] [Save Draft]                       │ AI Advisory                 │
│                                               │ ┌─────────────────────────┐ │
│                                               │ │ AI can explain rules and │ │
│                                               │ │ visible conflicts only.  │ │
│                                               │ │ It cannot activate,      │ │
│                                               │ │ publish, assign, or      │ │
│                                               │ │ modify staffing.         │ │
│                                               │ └─────────────────────────┘ │
├───────────────────────────────────────────────┴─────────────────────────────┤
│ Save Draft | Preview Occurrences | Request Approval | Activate Template       │
│ Template created != occurrence generated. Occurrence generated != published.  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 8. Step Detail Wireframes

### Step 1 - Template Context

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
Department selected != recurring template permitted.
```

### Step 2 - Base Shift Details

```text
Worker role
[Role selector]

Staffing quantity
[Required worker count]

Rate source
[Governed rate source]

Qualification requirements
[Licence / certification / background check / training / experience]

Boundary note:
Base shift details define template inputs only.
They do not assign workers or approve eligibility.
```

Base shift details are inherited from the Page 041 single-shift governance model, but recurrence controls belong only to Page 042.

### Step 3 - Recurrence Rule

```text
Recurrence type
[Daily / Weekly / Bi-weekly / Monthly / Every X days / Every X weeks / Custom]

Interval
[Every __ days/weeks/months]

Days of week
[Mon] [Tue] [Wed] [Thu] [Fri] [Sat] [Sun]

Monthly pattern
[Day of month / Weekday pattern where governed]

Custom rule summary
[Plain-language recurrence summary]
```

Do not hardcode recurrence models. The displayed options are configurable examples.

Clarify:

```text
Recurrence rule != Generated occurrence.
```

### Step 4 - Effective Dates and Timezone

```text
Effective start
[Date]

Optional end
[End date / number of occurrences / no configured end where governed]

Timezone
[Timezone selector]

Daylight-saving handling
[Governed policy notice]

Timezone change handling
[Governed policy notice]
```

Clarify:

```text
Effective date != Publication date.
Timezone selection != Payroll rule.
```

### Step 5 - Publication Policy

```text
Publication policy
[Manual review before each occurrence]
[Auto-create drafts only]
[Auto-submit for approval where governed]
[Publish occurrence only after authorized action]

Lead time
[Generate / review future occurrences X days ahead where governed]

Visibility
[Employer internal / eligible worker pool / invited workers / marketplace where governed]
```

Boundary note:

```text
Template approved != Occurrences published.
Generated occurrence != Worker-visible shift.
```

### Step 6 - Exception Policy

Represent exceptions:

- skipped occurrence
- edited occurrence
- cancelled occurrence
- additional occurrence
- holiday conflict
- daylight-saving conflict
- timezone change
- manual override

```text
Exception policy
[Default handling for holidays]
[Default handling for DST conflicts]
[Default handling for residence closures]
[Manual review required where governed]
```

Clarify:

```text
Editing one occurrence != Editing the template.
Editing template != Changing historical occurrences.
```

### Step 7 - Occurrence Preview

```text
Preview future occurrences
┌────────────┬────────────┬──────────────┬──────────────┐
│ Date       │ Time       │ Status       │ Warning      │
├────────────┼────────────┼──────────────┼──────────────┤
│ Pending    │ Pending    │ Not created  │ Rule missing │
│ Pending    │ Pending    │ Not created  │ DST review   │
└────────────┴────────────┴──────────────┴──────────────┘
```

Preview must be conceptual only.

Clarify:

```text
Previewed occurrence != Generated occurrence.
Generated occurrence != Published occurrence.
```

No occurrence generation engine is implemented or implied.

### Step 8 - Review and Save Template

```text
Review recurring template
- organization
- residence
- department
- worker role
- recurrence rule
- effective start
- optional end
- timezone
- staffing quantity
- rate source
- qualification requirements
- publication policy
- exception policy

Required confirmations
[ ] I understand this creates a recurrence template, not worked shifts.
[ ] I understand generated occurrences may require review or publication.
[ ] I understand assignment, attendance, payroll, and billing are separate.
[ ] I am authorized to save this recurring template.
```

### Step 9 - Activation Request

```text
Activation status
[Approval required / Approved / Rejected / Activation unavailable]

Actions
[Save Draft]
[Request Approval]
[Activate Template]
```

Clarify:

```text
Saved != Active series.
Approved != Active series.
Activated series != Published occurrences.
```

---

## 9. Exception Handling Detail

The page must show exception management as recurrence governance, not schedule processing.

Exception cards:

```text
Exception: Holiday conflict
Impact: Future occurrence needs review
Action: Mark occurrence for review
Boundary: No automatic cancellation or worker reassignment

Exception: Edited occurrence
Impact: One occurrence differs from template
Action: Preserve template and occurrence distinction
Boundary: Historical occurrences unchanged
```

Exceptions must not silently change historical occurrences.

---

## 10. Series Management

Series actions:

- save draft template
- request template approval
- activate series
- pause series
- resume series
- cancel future series
- mark series completed

Clarify:

```text
Paused series != Occurrences deleted.
Cancelled series != Historical shifts deleted.
Completed series != Payroll completed.
```

Series status must not be treated as occurrence, assignment, attendance, or payroll status.

---

## 11. Auditability

Conceptually preserve audit history for:

- template creation
- recurrence edits
- exception creation
- pause/resume
- cancellation
- occurrence regeneration request

Audit records conceptually include:

- actor
- role
- timestamp
- action
- template reference
- prior state
- resulting state

Optional where applicable:

- reason
- affected future occurrence range
- exception type
- approval status

Do not log resident or patient information.

---

## 12. AI Boundary

AI may:

- explain recurrence rules
- summarize schedules
- identify visible conflicts
- suggest navigation
- explain template vs occurrence terminology

AI must never:

- create recurring schedules autonomously
- publish occurrences
- assign workers
- modify staffing
- alter payroll
- bypass recurrence governance
- change recurrence rules without human action
- cancel or pause a series
- generate occurrences as an operational action

AI output must be labeled as advisory.

---

## 13. Empty and Error States

Represent:

- no authorized residence
- no authorized department
- no available role
- recurrence rule unavailable
- timezone unavailable
- template save failed
- validation unavailable
- publication policy unavailable
- exception policy unavailable
- approval unavailable
- occurrence preview unavailable
- holiday rule unavailable
- daylight-saving conflict
- conflicting edit
- service unavailable

Do not fabricate generated occurrences or successful recurrence activation.

---

## 14. Accessibility

The page must support:

- semantic form sections
- keyboard navigation
- accessible date/time controls
- accessible recurrence controls
- accessible table/list alternatives for occurrence preview
- no color-only warning states
- clear required fields
- screen-reader-friendly progress
- plain-language recurrence summaries
- focus management
- sufficient contrast
- mobile-friendly touch targets

---

## 15. International Readiness

Do not hardcode:

- recurrence model
- work week
- weekend definition
- holiday calendar
- timezone
- daylight-saving rule
- currency
- date format
- time format
- role
- qualification model
- publication lead time
- cancellation rule
- payroll rule
- staffing rule

Keep locale, timezone, holiday handling, recurrence policy, role, rate source, qualification policy, publication policy, and exception policy configurable.

---

## 16. Validation

Confirmed:

- Pages 001-041 unchanged.
- Page 041 remains approved and frozen.
- No Page 043 files created.
- No approval record created.
- No implementation started.
- No React created.
- No frontend created.
- No backend created.
- No APIs created.
- No database changes created.
- No scheduling engine created.
- No recurrence processor created.
- No background jobs created.
- No staffing engine created.
- No payroll created.
- No billing created.
- No notifications created.
- No messaging created.
- No matching created.
- No AI integration created.

---

## 17. Final Status

```text
Page 042 — Recurring Shift
Wireframe: COMPLETE
Product Review: PENDING IN SEPARATE FILE
Approval Record: NOT CREATED
Owner Review: REQUIRED

Page 043
BLOCKED
```
