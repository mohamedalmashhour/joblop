# Resident Job

## Page 054 - Messages Wireframe Revision 1

**Status:** Controlled Revision 1 Complete  
**Original Wireframe:** `PAGE_054_MESSAGES_LOW_FIDELITY_WIREFRAME.md`  
**Implementation:** Not Started  
**Page 055:** Support unblocked after approval, not created

---

## 1. Revision Summary

Revision 1 strengthens Page 054 as the governed Messages page for the Employer Portal. The page
remains communication-only and does not become the authoritative place for approvals, operational
state changes, financial execution, support-case resolution, ratings, complaints, discipline, or AI
automation.

This revision adds explicit governance for:

- conversation eligibility
- participant authorization
- conversation lifecycle
- message lifecycle
- delivery and read-status truthfulness
- workflow separation
- support boundary
- attachments
- privacy
- retention
- editing and deletion history
- moderation
- safety and emergency boundary
- notification boundary
- search and filtering
- auditability
- AI boundaries
- Ratings boundary
- readiness for Page 055 - Support

No redesign, implementation, API, database, messaging engine, attachment implementation,
notification implementation, moderation implementation, support implementation, or AI automation is
introduced.

---

## 2. Conversation Eligibility

Conversation access must follow a governed eligibility chain:

```text
Valid platform relationship exists
-> User is authorized for the related organization, residence, shift, assignment, booking, or support context
-> Conversation scope is active
-> Participant remains eligible
-> No policy restriction applies
-> Conversation access permitted
```

The page must clarify:

```text
User account exists != Conversation access
Organization membership != Access to every conversation
Assigned worker != Access outside the relevant assignment
```

Users must not be able to start unrestricted conversations with arbitrary platform users.

---

## 3. Participant Authorization

Authorized participant types may include:

- employer
- worker
- authorized residence manager
- authorized department manager
- platform support where governed
- read-only auditor only where explicitly permitted

The page must clarify:

```text
Participant != Conversation administrator
Support access != Unlimited access to all conversations
Organization owner != Automatic access to private conversations outside policy
```

Authorization remains scoped to the governing interaction and may be removed, restricted, or made
read-only where policy requires.

---

## 4. Conversation Lifecycle

Conversation lifecycle states must remain independent:

- unavailable
- not started
- active
- restricted
- participant removed
- archived
- closed
- reopened where governed
- retention hold
- deleted from active view
- service unavailable

The page must clarify:

```text
Archived != Deleted
Closed != Audit history removed
Participant removed != Prior messages erased
```

The UI must not silently erase conversation history.

---

## 5. Message Lifecycle

Message lifecycle states must remain separate:

- draft
- sending
- sent
- delivered where supported
- read where supported
- failed
- retry available
- edited where policy permits
- deleted from view where policy permits
- hidden by moderation
- unavailable

Clarify:

```text
Sent != Delivered
Delivered != Read
Read != Agreement
Message received != Workflow approval
```

The UI must not fabricate successful sending, delivery, or read receipts.

---

## 6. Read-Status Truthfulness

Read state appears only when supported by authoritative evidence.

Represent:

- unread
- read
- read status unavailable
- delivery status unavailable
- participant disabled read receipts where policy permits

Clarify:

```text
Conversation opened != Every message read
Message marked read != Worker accepted assignment
Message marked read != Employer approved attendance, timesheet, invoice, or payment
```

Read status must never imply agreement, acceptance, approval, or completion of a governed workflow.

---

## 7. Workflow Boundary

Messages are communication only.

Messages must not become the authoritative place to:

- create or approve shifts
- assign workers
- confirm attendance
- approve timesheets
- issue invoices
- authorize payments
- approve refunds
- submit ratings
- resolve disputes
- impose discipline
- change accepted terms silently

Clarify:

```text
Message agreement != Governed workflow state
User typed "approved" != Platform approval record
```

Every high-impact action must route to its authoritative workflow.

---

## 8. Support Boundary

Page 054 may provide an entry point to Page 055 - Support.

Page 054 must not own:

- support case creation logic
- case assignment
- escalation
- service-level tracking
- complaint adjudication
- investigations
- incident management
- emergency response

Clarify:

```text
Message to support != Support case opened
Support participant joined != Issue resolved
```

Page 055 owns support workflows. No Page 055 files are created by this revision.

---

## 9. Attachment Governance

Attachment states must be governed:

- selected
- uploading
- uploaded
- scanning pending
- available
- blocked
- expired
- removed
- unavailable

Allowed categories may include governed examples such as:

- shift-related document
- invoice or timesheet reference
- safe image
- approved supporting file

The page must not allow unrestricted sensitive uploads.

Do not expose:

- identity documents
- banking data
- tax data
- health information
- resident or patient information
- confidential complaint evidence
- raw credentials
- malicious executable files

Clarify:

```text
Uploaded != Safe
Scanning complete != Content verified as true
Attachment available != Permission to redistribute
```

No upload or scanning implementation is created.

---

## 10. Privacy

Page 054 must display only minimum necessary conversation information.

Do not expose:

- private phone numbers
- private email addresses
- home addresses
- banking information
- tax identifiers
- health information
- identity documents
- complaints
- investigation notes
- precise location history
- resident or patient information
- unrelated employment history

Use governed platform identities and role-appropriate display names rather than unrestricted
personal contact details.

---

## 11. Retention

Retention states must remain configurable:

- active
- archived
- retention period active
- legal hold
- scheduled deletion
- deletion blocked
- retained for audit
- unavailable

Clarify:

```text
Archived != Eligible for immediate deletion
User deletes from view != System record erased
Legal hold != Permanent retention without review
```

Do not hardcode retention periods.

---

## 12. Editing and Deletion

If editing or deletion is represented, history must be preserved.

Represent:

- edit permitted
- edited
- deletion requested
- removed from participant view
- preserved for audit
- blocked by policy
- blocked by legal hold

Clarify:

```text
Edited != Original erased
Deleted from view != Audit history deleted
```

Messages tied to disputes, approvals, safety, or financial matters must not be silently altered.

---

## 13. Moderation Boundary

Represent only high-level moderation states:

- report submitted
- review pending
- restricted
- hidden
- restored
- removed
- appeal available
- closed

Page 054 must not own:

- investigation
- disciplinary decisions
- fraud findings
- legal adjudication
- complaint resolution

Clarify:

```text
Reported != Violation proven
Hidden != Permanent deletion
Restricted participant != Misconduct proven
```

---

## 14. Safety and Emergency Boundary

The page must separate:

- routine communication
- urgent operational issue
- safety concern
- emergency

Clarify:

```text
Urgent message != Emergency response triggered
Unread message != Emergency ignored
Messages != Emergency dispatch
```

Emergencies must route to the approved emergency procedure. Do not hardcode emergency numbers or
promise immediate monitoring or response.

---

## 15. Notification Boundary

Page 054 may show notification status where already governed.

It must not own:

- email delivery
- SMS
- push notifications
- provider logic
- notification scheduling
- emergency paging

Clarify:

```text
Notification sent != Message delivered
Notification delivered != Message read
```

No notification implementation is created.

---

## 16. Search and Filtering

Governed filters may include:

- participant
- organization
- residence
- assignment or shift reference
- date
- unread
- archived
- support-related
- attachment present

Search must remain inside the user's authorized conversation scope and must not broadly index
restricted private content.

---

## 17. Auditability

Conceptual audit events include:

- conversation created
- participant added
- participant removed
- message sent
- delivery status changed
- read status changed
- attachment uploaded
- message edited
- message removed from view
- report submitted
- moderation state changed
- conversation archived
- conversation closed
- support access
- authorization denied

Audit metadata may include:

- actor
- role
- timestamp
- conversation reference
- related workflow reference
- action
- prior state
- resulting state
- purpose or reason where required

Do not broadly log full private message bodies.

---

## 18. AI Boundary

AI may:

- suggest respectful wording
- summarize visible conversation content
- identify missing context
- translate messages where authorized
- identify potentially restricted personal information before sending
- suggest navigation to the correct governed workflow
- draft support requests

AI must never:

- send messages automatically
- impersonate a user
- fabricate delivery or read status
- approve workflows
- change assignment or financial state
- determine misconduct
- decide moderation outcomes
- expose restricted content
- contact emergency services
- create hidden profiles from conversations

AI-assisted text must remain user-reviewed before sending.

---

## 19. Ratings Boundary

Page 053 owns Ratings.

Messages may not:

- create a rating
- alter a rating
- pressure a user to submit a specific rating
- reveal blind ratings before publication
- retaliate over ratings
- bypass rating moderation or appeals

Clarify:

```text
Message feedback != Platform rating
```

---

## 20. Empty and Error States

Represent:

- no conversations
- no authorized participants
- conversation unavailable
- participant removed
- message failed
- delivery status unavailable
- read status unavailable
- attachment blocked
- attachment unavailable
- moderation pending
- conversation archived
- access denied
- service unavailable

Do not fabricate successful sending or delivery.

---

## 21. Mobile Design

Mobile priority order:

1. conversation context
2. participant identity and role
3. related shift, assignment, or support reference
4. message history
5. composer
6. attachment state
7. delivery and read status
8. support handoff
9. privacy notice
10. failed and restricted states

Avoid dense administrative controls.

---

## 22. Desktop Design

Desktop may use:

- conversation list
- governed filters
- conversation context
- participant panel
- message history
- attachment status
- moderation status where permitted
- support handoff
- audit guidance
- privacy and retention notice

Do not expose restricted participant data in persistent side panels.

---

## 23. Accessibility

Review:

- semantic conversation headings
- keyboard navigation
- screen-reader-friendly message metadata
- accessible composer
- accessible attachment controls
- no color-only delivery or read states
- readable timestamps and timezones
- focus management
- sufficient contrast
- clear moderation and error messages
- confirmation before destructive actions

---

## 24. International Readiness

Do not hardcode:

- language
- date format
- time format
- timezone
- conversation eligibility
- participant roles
- retention period
- moderation policy
- edit or deletion policy
- read-receipt policy
- attachment categories
- privacy terminology
- emergency process
- support model

Keep jurisdiction, organization, residence, role, locale, timezone, messaging policy, retention
policy, moderation policy, and attachment policy configurable.

---

## 25. Validation

Confirmed:

- Frozen title remains Messages.
- Pages 001-053 remain unchanged.
- Page 055 remains Support.
- No Page 055 files created.
- No implementation started.
- No React created.
- No frontend created.
- No backend created.
- No APIs created.
- No database changes created.
- No messaging engine created.
- No attachment implementation created.
- No notification implementation created.
- No moderation implementation created.
- No support implementation created.
- No AI messaging automation created.
- Unrelated app changes remain untouched.

---

## 26. Final Status

```text
Page 054 — Messages
Revision 1: COMPLETE
Approval eligibility: SATISFIED

Page 055 — Support
UNBLOCKED AFTER APPROVAL
NOT CREATED
```
