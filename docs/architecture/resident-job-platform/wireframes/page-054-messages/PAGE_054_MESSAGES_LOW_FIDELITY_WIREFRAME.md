# Resident Job

## Page 054 - Messages Low-Fidelity Wireframe

**Status:** Low-Fidelity Wireframe Complete  
**Owner Review:** Required  
**Approval Record:** Not Created  
**Implementation:** Not Started  
**Page 055:** Support blocked

---

## 1. Purpose

Page 054 designs the authenticated employer-portal Messages experience.

Page 054 owns governed communication between authorized participants. It supports operational
conversation visibility without becoming a workflow approval screen, support case manager,
complaint resolver, rating system, attendance record, timesheet record, invoice record, payment
workflow, or AI conversation generator.

Page 054 may support:

- employer to worker messages
- worker to employer replies where authorized
- scheduler participation
- support visibility where role-permitted
- shift-specific conversations
- booking or assignment conversations
- system conversation states
- governed attachments
- read status
- conversation history
- moderation status where applicable

Page 054 must not own:

- ratings
- attendance
- timesheets
- invoices
- payments
- operational approvals
- complaint resolution
- disciplinary actions
- support case resolution
- AI-generated conversations

---

## 2. Primary Users

Primary users:

- employer
- scheduler
- support participant where authorized

Secondary visibility may include compliance, administrator, or super administrator roles only where
permissions, purpose, and audit requirements allow.

---

## 3. Architecture Reference

| Page | Frozen title | Source |
| --- | --- | --- |
| 054 | Messages | `pages/PAGE_054_MESSAGES.md` |
| 055 | Support | `pages/PAGE_055_SUPPORT.md` |

Page 054 belongs to the Employer Portal. It must not inherit Worker Portal assumptions from Page
033, although it may reuse the same governance pattern for participant authorization, lifecycle
truthfulness, privacy, moderation boundaries, retention, accessibility, and AI limits.

---

## 4. Core Boundary

Messages are communication only.

The page must repeat the following boundary in the header or help text:

```text
Message
does not equal
Approval

Message
does not equal
Assignment change

Message
does not equal
Attendance correction

Message
does not equal
Timesheet approval

Message
does not equal
Payment instruction
```

Users may discuss operational topics, but official decisions must occur in the page that owns that
workflow.

---

## 5. Conversation Ownership

The Messages page owns conversation display and message composition for authorized participants.

Conversation types:

- shift conversation
- assignment conversation
- worker-employer conversation
- scheduler coordination conversation
- system notice conversation
- support-linked conversation reference
- archived conversation

Page 054 does not own the underlying shift, assignment, attendance, timesheet, invoice, payment,
rating, or support-case record.

---

## 6. Participant Authorization

Participants must be authorized per conversation.

Participant types:

| Participant type | Meaning | Boundary |
| --- | --- | --- |
| Employer participant | Authorized employer-side user | May not access unrelated workers or residences |
| Scheduler participant | Authorized scheduling role | May communicate only within permitted operational scope |
| Worker participant | Worker tied to the governed interaction | Access may be limited to the relevant interaction |
| Support participant | Authorized support staff | Access requires role, reason, and auditability |
| System participant | Platform-generated notice | Does not represent a human reply |
| Removed participant | Previously authorized user | Past audit remains, future access may be read-only or revoked |

Clarify:

```text
Authenticated
does not equal
Authorized for every conversation

Organization membership
does not equal
Access to every worker conversation

Support visibility
does not equal
Unrestricted staff access
```

---

## 7. Conversation Lifecycle

Conversation lifecycle states:

```text
Not available
-> Created
-> Participants authorized
-> Open
-> Reply restricted where applicable
-> Read-only
-> Archived
-> Closed
-> Retained where required
```

Clarify:

```text
Archived != Deleted
Closed != Deleted
Read-only != Closed
Retained != Visible to all users
```

Lifecycle status must explain what the user can do next.

---

## 8. Message Lifecycle

Message lifecycle states:

```text
Draft
-> Ready to send
-> Sending
-> Sent
-> Delivered where supported
-> Read where supported
-> Failed
-> Hidden by moderation where applicable
-> Retained where required
```

Clarify:

```text
Sent != Read
Delivered != Agreement
Read != Approval
Failed != Deleted
Hidden != Deleted from audit history
```

Read receipts must be truthful and visibly labelled as available only where supported.

---

## 9. Information Architecture

Desktop layout:

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Resident Job | Employer Portal | Messages | Role: [Employer/Scheduler]       │
├──────────────────────────────────────────────────────────────────────────────┤
│ Messages are governed communication. Official decisions happen in their      │
│ owning workflow pages.                                                       │
├───────────────────────┬──────────────────────────────────────────────────────┤
│ Filters               │ Conversation Header                                  │
│ - Unread              │ - Conversation type                                  │
│ - Shift-specific      │ - Related shift / assignment reference               │
│ - Assignment          │ - Participants and authorization state                │
│ - Worker              │ - Lifecycle status                                   │
│ - Scheduler           ├──────────────────────────────────────────────────────┤
│ - Support-linked      │ Message History                                      │
│ - Archived            │ - system notices                                     │
│                       │ - employer messages                                  │
│ Conversation List     │ - worker replies                                     │
│ - participant         │ - attachment indicators                              │
│ - context             │ - moderation labels where applicable                 │
│ - unread              ├──────────────────────────────────────────────────────┤
│ - last activity       │ Compose Area                                         │
│ - status              │ - message input                                      │
│                       │ - attachment control                                 │
│                       │ - privacy reminder                                   │
│                       │ - send action                                        │
│                       ├──────────────────────────────────────────────────────┤
│                       │ Context / Boundaries                                 │
│                       │ - related workflow links                             │
│                       │ - escalation to Support (Page 055)                   │
│                       │ - audit/retention note                               │
└───────────────────────┴──────────────────────────────────────────────────────┘
```

Mobile layout:

```text
Messages
Boundary notice

[Search] [Unread] [Shift] [Support-linked]

Conversation cards
- participant
- context
- unread/status
- last activity

Selected conversation
- header
- participants
- messages
- compose
- related workflow links
- support handoff
```

---

## 10. Shift and Assignment Context

Messages may reference:

- shift title or reference
- assignment reference
- residence or department where permitted
- scheduled date/time
- participant names where authorized
- workflow links

Messages must not edit or override:

- shift requirements
- assignment status
- attendance evidence
- timesheet values
- invoice status
- payment status
- rating status

Any official action must route to the owning page.

---

## 11. Attachments

Attachment governance must be visible.

Attachment states:

- not allowed
- allowed for this conversation
- upload pending
- attached
- unavailable
- blocked by policy
- removed from user view
- retained where required

Allowed attachment categories should be governed and context-specific.

Messages must not expose:

- identity documents unless explicitly permitted in the proper document workflow
- banking details
- tax identifiers
- private health information
- resident or patient information
- confidential investigation records
- unrelated worker profile documents

Clarify:

```text
Attached file != Verified evidence
Uploaded file != Approved document
Removed from view != Removed from retained record
```

---

## 12. Privacy

The page must use minimum necessary communication visibility.

Privacy rules:

- participants see only conversations they are authorized to access
- support access requires role, reason, and auditability
- employer-side users cannot browse all worker conversations by default
- removed participants lose future access where policy requires
- sensitive data warnings appear before sending where appropriate
- private worker data, financial secrets, identity documents, and resident/patient information are excluded

The page must never imply that a message thread is a secure place for unrelated sensitive
documents, banking instructions, medical details, or legal claims.

---

## 13. Retention and Auditability

Messages must communicate that conversation history may be retained according to governed policy.

Conceptual audit events include:

- conversation creation
- participant added
- participant removed
- message sent
- message failed
- attachment added
- attachment removed from user view
- moderation flag
- moderation state change
- archive
- closure
- support handoff

Audit metadata may include:

- actor
- role
- timestamp
- conversation reference
- message reference where appropriate
- related workflow reference
- prior state
- resulting state
- reason category

Private message content must not be broadly visible in audit views.

---

## 14. Moderation Boundary

Page 054 may show moderation states:

- active
- flagged
- hidden pending review
- visible after review
- removed from user view
- read-only during review

Clarify:

```text
Flagged != Violation proven
Hidden != Deleted
Moderation != Complaint resolution
Moderation != Discipline
```

Moderation must not become investigation, fraud adjudication, legal review, disciplinary action,
complaint resolution, ratings moderation, or support-case resolution.

---

## 15. Support Boundary

Page 054 may provide a route to Page 055 - Support.

Messages may reference support:

- request help
- escalate to support
- link a support case where permitted
- show support-linked status

Page 054 does not own:

- support ticket creation
- support prioritization
- support resolution
- incident investigation
- complaint outcome
- emergency response

Clarify:

```text
Support requested != Immediate resolution
Support-linked conversation != Support case ownership
Message escalation != Emergency response
```

Immediate medical, safety, or public-safety emergencies must follow local emergency procedures.
Do not hardcode emergency numbers.

---

## 16. AI Boundary

AI may:

- summarize visible conversation history
- suggest clearer wording for a user to review
- identify potentially sensitive information before sending
- suggest relevant workflow links
- explain conversation status
- translate or simplify text where future policy allows

AI must never:

- send messages automatically
- create conversations automatically
- impersonate workers, employers, schedulers, or support
- approve assignments
- alter shift status
- approve attendance
- approve timesheets
- issue invoices
- execute payments
- resolve complaints
- make disciplinary decisions
- fabricate message content
- expose restricted information

AI-generated suggestions must be visibly labelled and require human review before sending.

---

## 17. Empty, Loading, Error, and Success States

Empty states:

- no conversations
- no unread messages
- no shift-specific conversations
- no archived conversations
- conversation unavailable due to permission

Loading states:

- loading conversation list
- loading selected conversation
- sending message
- uploading attachment

Error states:

- message failed to send
- attachment blocked
- participant no longer authorized
- conversation closed
- read status unavailable
- moderation review in progress

Success states:

- message sent
- draft saved where supported
- attachment added
- conversation archived
- support handoff requested

All states must use plain language and avoid technical jargon.

---

## 18. Accessibility

Accessibility requirements:

- keyboard navigable conversation list and message composer
- screen-reader labels for participant, unread, status, and attachment indicators
- clear focus management when switching conversations
- text alternatives for icons and attachment states
- visible error messages
- non-color-only status indicators
- readable timestamps and lifecycle labels
- mobile touch targets of at least 44px

Long conversations should support logical heading order and skip navigation.

---

## 19. International Readiness

Page 054 must remain country-neutral.

Do not hardcode:

- emergency numbers
- employment rules
- retention periods
- privacy laws
- moderation deadlines
- legal terminology
- language-specific assumptions

The design must allow localization, right-to-left language support, different name formats, and
locale-specific date/time display.

---

## 20. Product Design Review Checklist

The Product Design Review must evaluate:

- conversation ownership
- participant authorization
- message lifecycle
- attachment governance
- read-status truthfulness
- privacy
- retention
- auditability
- moderation boundaries
- support boundary
- AI boundaries
- accessibility
- mobile usability
- international readiness
- readiness for Page 055 - Support

---

## 21. Validation

Confirmed:

- Pages 001-053 remain unchanged.
- Page 055 frozen title is Support.
- No Page 055 files created.
- No implementation started.
- No React created.
- No frontend created.
- No backend created.
- No APIs created.
- No database changes created.
- No messaging engine created.
- No attachment implementation created.
- No moderation implementation created.
- No support implementation created.
- No AI messaging automation created.
- No commit, push, merge, or deployment performed.

---

## 22. Final Status

```text
Page 054 — Messages
Wireframe: COMPLETE
Product Review: REQUIRED
Approval Record: NOT CREATED

Page 055 — Support
BLOCKED
```
