# Resident Job

## Page 046 - Assigned Worker

**Status:** Low-Fidelity Wireframe Complete  
**Owner Review:** Required  
**Approval Record:** Not Created  
**Implementation:** Not Started  
**Page 047:** Blocked

---

## 1. Purpose

Page 046 designs the authenticated employer experience for viewing and managing the worker assigned to a governed shift.

This page allows an authorized employer user to:

- view the worker assigned to a governed shift
- understand the assignment state
- review assignment-relevant qualifications and availability
- understand confirmation, acceptance, cancellation, replacement, and support states
- access governed shift, messaging, attendance, and support workflows
- understand what information is visible before and after assignment

This page must not:

- create the initial application decision
- rank applicants
- re-run AI suggestions
- calculate payroll
- approve attendance
- mark a shift completed
- expose private worker information
- guarantee worker arrival
- treat assignment as employment completion
- replace messaging, attendance, timesheets, payroll, billing, or dispute workflows
- allow AI to assign, replace, cancel, or penalize workers autonomously

---

## 2. Primary Users

Authorized employer users who may view assignment information:

- organization owner
- administrator
- residence manager
- department manager
- scheduler
- staffing coordinator

Role-specific permissions determine whether the user can request clarification, cancellation, replacement, support, or attendance handoff.

---

## 3. Assignment Boundary

The page must clearly separate:

```text
Applicant review
↓
Assignment request
↓
Assignment created
↓
Worker notified
↓
Worker response
↓
Assignment confirmed
↓
Worker checked in
↓
Shift completed
↓
Timesheet approved
↓
Payroll completed
```

Clarify:

```text
Applicant approved != Assigned
Assigned != Worker notified
Worker notified != Accepted
Accepted != Confirmed attendance
Confirmed != Checked in
Checked in != Shift completed
Shift completed != Timesheet approved
```

---

## 4. Source-of-Truth Boundary

Page 046 may display the governed assignment record.

It must route to authoritative workflows for:

- applicant decision
- shift terms
- worker eligibility
- messaging
- cancellation
- replacement
- attendance
- timesheets
- payroll
- billing
- disputes
- support

Clarify:

```text
Displayed assignment != Page 046 owns every downstream state
Worker shown != Worker currently present
Assignment confirmed != Attendance confirmed
```

---

## 5. Independent Assignment States

### Assignment State

- Not assigned
- Assignment pending
- Assigned
- Reassignment pending
- Replaced
- Assignment cancelled
- Assignment unavailable

### Worker Response State

- Not notified
- Notification pending
- Notified
- Viewed where supported
- Accepted
- Declined
- Response expired
- Response unavailable

### Operational State

- Upcoming
- Arrival window open
- Check-in available
- Checked in
- In progress
- Checked out
- Completed
- Cancelled
- Operational state unavailable

### Review State

- No review required
- Employer review required
- Support review
- Compliance review
- Dispute open
- Resolved
- Closed

Do not collapse these into one generic "Confirmed" status.

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
│   ├── Assigned Worker
│   ├── Shift reference
│   ├── Assignment state
│   └── Privacy / source-of-truth notice
│
├── Assigned worker workspace
│   ├── Worker summary
│   ├── Assignment record
│   ├── Worker response state
│   ├── Qualification summary
│   ├── Contact / messaging entry point
│   ├── Cancellation and replacement panel
│   ├── Attendance handoff
│   ├── Shift-change review
│   ├── Financial boundary summary
│   └── Assignment history
│
├── Right governance panel
│   ├── Assignment boundary
│   ├── Worker privacy notice
│   ├── Attendance boundary
│   ├── Fairness notice
│   ├── AI limitations
│   └── Support path
│
└── Footer actions
    ├── Open Shift Details
    ├── Open Conversation
    ├── Request Clarification
    ├── Request Replacement
    ├── Request Cancellation
    ├── Open Attendance Workflow
    └── Request Support
```

### Mobile Structure

Mobile prioritizes:

```text
Assigned Worker
├── Worker summary
├── Assignment status
├── Worker response
├── Shift date/time
├── Residence and department
├── Qualification summary
├── Contact/message action
├── Cancellation/replacement status
├── Attendance handoff
└── Support path
```

Avoid dense worker dossiers.

---

## 7. Assignment Record

Represent safe placeholders for:

- shift reference
- organization
- residence
- department
- worker display name
- worker role
- assignment status
- worker response
- shift date
- scheduled start and end
- timezone
- arrival window
- approved contact role
- qualification summary
- licence status
- certification status
- background-check status
- assignment created date
- last updated
- cancellation or replacement status
- support path

Do not expose unnecessary personal information.

---

## 8. Worker Identity and Privacy

Employer-visible information should be minimum necessary.

May include where governed:

- worker display name
- profile photo where approved
- role
- assignment-relevant qualification status
- assignment-relevant licence or certification status
- permitted contact method
- assignment history with this employer where permitted

Must not expose:

- banking information
- tax information
- private documents
- full identity-document images
- full background-check details
- private disputes
- protected complaints
- internal moderation notes
- unrelated employment history
- health information
- unrelated earnings
- private home address
- precise live location outside governed attendance use

---

## 9. Qualification Truthfulness

Represent separately:

- requirement exists
- worker document submitted
- worker document verified
- qualification current
- qualification expired
- qualification unavailable
- compliance review required

Clarify:

```text
Document uploaded != Qualification verified
Qualification verified != Assignment guaranteed
Assignment created != Qualification remains valid forever
```

Page 046 must not become a credential-verification workflow.

---

## 10. Worker Confirmation

Represent:

- confirmation requested
- confirmation pending
- accepted
- declined
- expired
- withdrawn
- unavailable

Clarify:

```text
Assigned != Accepted
Accepted != Arrival guaranteed
Confirmation expired != Worker misconduct
```

Do not fabricate read receipts or acceptance.

---

## 11. Contact and Messaging Boundary

Page 046 may provide a governed entry point to the related conversation.

Do not expose personal phone numbers or private email addresses unless policy explicitly permits it.

Clarify:

```text
Message sent != Message read
Message read != Worker confirmed
```

Page 046 must not own messaging.

---

## 12. Cancellation Boundary

Represent separately:

- employer cancellation requested
- employer cancellation effective
- worker cancellation requested
- worker cancellation effective
- support review
- replacement required
- cancellation disputed
- closed

Clarify:

```text
Cancellation requested != Cancelled
Worker cancelled != Misconduct
Cancelled assignment != Earned compensation forfeited
```

Do not calculate penalties, fees, payroll, or compensation.

---

## 13. Replacement Boundary

Represent a governed replacement lifecycle:

- replacement not required
- replacement requested
- replacement search pending
- replacement candidate selected
- replacement assigned
- original assignment released
- replacement failed
- support required

Clarify:

```text
Replacement requested != Original worker removed
Replacement candidate != Replacement assigned
Replacement assigned != Original assignment safely closed
```

Do not assign a replacement on Page 046 automatically.

---

## 14. Attendance Boundary

Page 046 may show high-level attendance state only:

- not started
- check-in available
- checked in
- check-out available
- checked out
- attendance review required
- attendance unavailable

Clarify:

```text
Assigned != Present
Checked in != Worked full shift
Checked out != Hours approved
```

Page 046 must not own GPS evidence, attendance review, timesheets, or payroll.

---

## 15. Shift Change Boundary

If shift terms change after assignment, represent:

- change proposed
- worker notification required
- worker acknowledgment pending
- accepted change
- declined change
- assignment review required
- original terms preserved

High-impact changes may include:

- date
- start time
- end time
- residence
- department
- role
- rate
- premium
- responsibilities

Clarify:

```text
Employer edits shift != Worker accepted new terms
```

Do not silently alter assigned terms.

---

## 16. Rate and Financial Boundary

Page 046 may show the governed worker-facing shift rate summary where already approved.

Do not show:

- employer invoice
- platform margin
- banking details
- tax information
- payroll deductions
- final net pay
- unrelated earnings

Clarify:

```text
Displayed rate != Final payroll
Premium listed != Premium earned
Assignment cancelled != No compensation due
```

Page 046 must not calculate payroll or billing.

---

## 17. Assignment History

Conceptually preserve:

- assignment created
- worker notified
- worker response
- changes
- cancellation
- replacement
- attendance handoff
- support intervention
- final assignment state

History should preserve:

- actor
- role
- timestamp
- action
- prior state
- resulting state
- reason where applicable

Do not silently overwrite assignment history.

---

## 18. Employer Actions

Represent governed actions:

- view worker profile summary
- open shift details
- open related conversation
- request clarification
- request replacement
- request cancellation
- open attendance workflow
- request support

Do not allow:

- automatic replacement
- automatic penalties
- hidden blacklisting
- unilateral alteration of accepted terms without review
- manual completion of attendance or payroll

---

## 19. Fairness and Retaliation

Do not allow assignment management to penalize workers for:

- reporting safety concerns
- filing complaints
- disputing attendance
- disputing earnings or payments
- requesting accessibility support
- declining changed terms
- declining unrelated work

Clarify:

```text
Declining changed terms != Misconduct
Cancellation != Permanent disqualification
```

Support review must remain available.

---

## 20. AI Boundary

AI may:

- summarize the assignment
- explain assignment states
- identify missing confirmation
- identify visible qualification expiry
- suggest navigation
- help draft a respectful message or support request

AI must not:

- assign workers
- replace workers
- cancel assignments
- alter terms
- determine misconduct
- approve attendance
- calculate compensation
- rank replacement candidates
- expose restricted information
- fabricate worker acceptance or arrival

The governed assignment record remains authoritative.

---

## 21. Page 047 Boundary

Exact frozen Page 047 title:

```text
Page 047 — Live Shift Tracking
```

Page 046 owns:

```text
Assigned Worker
```

Page 047 owns the next frozen workflow.

Do not create Page 047 files in this task.

---

## 22. Empty and Error States

Include:

- no worker assigned
- assignment pending
- worker response pending
- worker declined
- confirmation expired
- assignment cancelled
- replacement pending
- replacement failed
- attendance unavailable
- qualification status unavailable
- conversation unavailable
- support unavailable
- stale assignment
- service unavailable

Do not fabricate assignment success.

---

## 23. Low-Fidelity Layout

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ Assigned Worker                                                            │
│ Assignment view. Presence, attendance, timesheet, payroll live elsewhere.   │
├───────────────────────────────────────────────┬─────────────────────────────┤
│ Assigned Worker Summary                        │ Governance Panel            │
│ ┌───────────────────────────────────────────┐ │ Assignment Boundary         │
│ │ Worker display name                        │ │ Assigned != Accepted        │
│ │ Role                                       │ │ Accepted != Checked in      │
│ │ Assignment status                          │ │ Checked in != Hours approved│
│ │ Worker response                            │ │                             │
│ │ Shift date/time/timezone                   │ │ Privacy                     │
│ │ Residence / department                     │ │ Minimum necessary info only │
│ │ Arrival window                             │ │                             │
│ └───────────────────────────────────────────┘ │ Qualification Truthfulness  │
│                                               │ Uploaded != Verified        │
│ Qualification Summary                          │                             │
│ - Licence status                               │ Attendance Boundary         │
│ - Certification status                         │ Handoff only. No GPS or     │
│ - Background-check status                      │ timesheet ownership here.   │
│ - Compliance review if required                │                             │
│                                               │ AI Boundary                 │
│ Assignment Actions                             │ AI can summarize/explain.   │
│ [Open Shift Details] [Open Conversation]       │ AI cannot assign, replace,  │
│ [Request Clarification] [Request Replacement]  │ cancel, penalize, or approve│
│ [Request Cancellation] [Open Attendance]       │ attendance.                 │
├───────────────────────────────────────────────┴─────────────────────────────┤
│ Cancellation / Replacement / Shift Change / Assignment History              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 24. Accessibility

Review:

- semantic assignment headings
- keyboard navigation
- screen-reader-friendly state labels
- no color-only confirmation or cancellation states
- readable shift times and timezone
- accessible worker-response status
- accessible cancellation and replacement controls
- focus management
- sufficient contrast
- plain-language errors
- clear confirmation before high-impact actions

---

## 25. International Readiness

Do not hardcode:

- worker role
- date format
- time format
- timezone
- employment model
- assignment acceptance rules
- cancellation consequences
- notice periods
- replacement policy
- qualification model
- rate model
- attendance model
- communication channel
- worker identity format
- privacy terminology

Keep jurisdiction, organization, residence, department, role, assignment policy, cancellation policy, locale, and worker classification configurable.

---

## 26. Validation

Confirmed:

- Frozen title remains Assigned Worker.
- Pages 001-045 unchanged.
- Exact Page 047 frozen title identified as Live Shift Tracking.
- No Page 047 files created.
- No approval record created.
- No implementation started.
- No React created.
- No frontend created.
- No backend created.
- No APIs created.
- No database changes created.
- No assignment engine created.
- No replacement engine created.
- No attendance implementation created.
- No payroll or billing implementation created.
- No notification or messaging implementation created.
- No AI assignment automation created.

---

## 27. Final Status

```text
Page 046 — Assigned Worker
Wireframe: COMPLETE
Product Review: PENDING IN SEPARATE FILE
Approval Record: NOT CREATED
Owner Review: REQUIRED

Page 047 — Live Shift Tracking
BLOCKED
```
