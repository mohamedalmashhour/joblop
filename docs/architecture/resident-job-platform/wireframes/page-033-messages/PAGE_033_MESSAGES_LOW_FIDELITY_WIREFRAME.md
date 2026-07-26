# Page 033 - Messages Low-Fidelity Wireframe

Status: Initial wireframe complete
Epic: Epic 3 - Worker Portal
Primary user: Authenticated worker
Secondary visibility: Employer, Residence Representative, Support, Compliance, Moderator, Administrator, and Super Administrator where role-permitted
Architecture baseline: Resident Job Architecture Phase 1 v1.0
Epic planning baseline: Epic 3 Worker Portal Planning v1.0
Financial boundary baseline: EPIC_3_FINANCIAL_BOUNDARY_REVIEW.md
Frozen architecture source: pages/PAGE_033_MESSAGES.md
Implementation: Not authorized

## 1. Frozen Page Confirmation

The frozen architecture page map defines:

| Page | Frozen title | Source |
| --- | --- | --- |
| 032 | Ratings | pages/PAGE_032_RATINGS.md |
| 033 | Messages | pages/PAGE_033_MESSAGES.md |
| 034 | Notifications | pages/PAGE_034_NOTIFICATIONS.md |

No title inference, rename, or architecture amendment is introduced.

## 2. Page Purpose

Messages is the authenticated worker page for governed conversations related to shifts, employers,
support, safety, attendance, payment support, system notices, and other permitted platform
workflows.

The page allows the worker to:

- view authorized conversations;
- distinguish active, unread, archived, restricted, and closed conversations;
- identify who they are communicating with by role and governed display label;
- understand the related shift, employer, residence, case, or support matter;
- send and receive permitted plain-text messages;
- identify when replies are unavailable or restricted;
- report inappropriate content, harassment, retaliation, privacy violations, or unsafe instructions;
- access support or escalation where governed.

The page must not:

- become a general social network;
- expose resident, patient, medical, clinical, or protected information;
- expose private phone numbers, email addresses, or direct contact details by default;
- bypass platform governance;
- replace emergency services;
- replace formal dispute, payroll, attendance, rating, or support records;
- allow unrestricted file transfer;
- guarantee immediate response;
- let AI impersonate a participant or send without explicit user action;
- silently alter or delete message history.

## 3. Conversation Type Model

The inbox must not combine all communications into one ambiguous list.

| Conversation type | Primary participants | Purpose | Boundary |
| --- | --- | --- | --- |
| Shift conversation | Worker and authorized employer or residence representative | Shift-specific operational communication | Tied to a specific shift or assignment window |
| Employer conversation | Worker and employer | Governed operational matters | Not unrestricted social contact |
| Platform support conversation | Worker and authorized support staff | Help, account, workflow, or policy support | Not clinical, payroll, or emergency dispatch |
| Attendance or payment support thread | Worker and support or authorized staff | Case-linked attendance or payment issue | Does not approve hours, payroll, or payments |
| Safety or incident conversation | Worker and restricted authorized staff | Safety, incident, harassment, or retaliation concern | Purpose-limited and escalation-governed |
| System notice thread | Platform to worker | Read-only platform notices | Replies not permitted |

## 4. Conversation Eligibility

Messaging permission is governed and contextual.

Possible eligibility bases:

- active assignment;
- accepted shift;
- completed shift within a configurable follow-up window;
- open support case;
- active dispute or correction request;
- authorized employer-worker relationship;
- platform-initiated support contact.

Required boundaries:

```text
User account
does not equal
Permission to message every user

Accepted shift
does not equal
Unlimited future messaging access

Completed shift
does not equal
Permanent communication channel
```

## 5. Independent Conversation States

The page must not collapse governed states into one generic "status."

### A. Participation State

- Active participant.
- Removed.
- Left.
- Access revoked.
- Access unavailable.

### B. Conversation State

- Open.
- Closed.
- Archived.
- Restricted.
- Read-only.
- Unavailable.

### C. Message Delivery State

- Draft.
- Sending.
- Sent.
- Delivered.
- Failed.
- Delivery unknown.

### D. Moderation State

- Not flagged.
- Flagged.
- Under review.
- Restricted.
- Removed from recipient view.
- Restored.
- Review unavailable.

### E. Escalation State

- No escalation.
- Support requested.
- Safety review.
- Formal case opened.
- Resolved.
- Closed.

## 6. Conversation Record

Each conversation card should include safe placeholders for:

- conversation type;
- related shift, employer, residence, or case;
- participant display label;
- participant roles;
- conversation status;
- unread count;
- last activity;
- created date;
- closed date where applicable;
- reply availability;
- restriction state;
- escalation state;
- retention notice where applicable.

Do not expose unnecessary personal identifiers.

## 7. Desktop Wireframe

```text
HEADER
Resident Job | Messages | Worker: [Name] | Help | Notifications

BOUNDARY NOTICE
Messages are governed platform conversations.
Message sent does not mean message seen.
Messages are not emergency response, clinical records, payroll approval, attendance approval,
rating decisions, or off-platform payment channels.
AI does not impersonate participants or send messages.

INBOX FILTERS
[Unread]
[Active shifts]
[Employer]
[Support]
[Safety or incident]
[System notices]
[Archived / closed]
[Search]

INBOX LIST
| Type | Related item | Participant / role | Status | Unread | Last activity | Restriction | Action |
| Shift | Shift [ref] | Residence Representative | Open | 2 | [timestamp] | None | Open |
| Support | Case [ref] | Support Staff | Open | 1 | [timestamp] | Support requested | Open |
| System Notice | Policy [ref] | Platform | Read-only | 0 | [timestamp] | Replies unavailable | View |
| Safety | Case [ref] | Safety Review | Restricted | 1 | [timestamp] | Safety review | Open |

SELECTED CONVERSATION HEADER
- Participant display label: [role or governed name]
- Participant role: [role]
- Employer/residence: [safe name where appropriate]
- Related shift/case/support reference: [reference]
- Conversation type: [type]
- Conversation state: [state]
- Participation state: [state]
- Reply availability: [available / unavailable / restricted]
- Safety/privacy notice: [notice]

CONTEXT PANEL
- Related shift: [safe shift reference]
- Related case: [case reference]
- Eligible communication window: [configurable placeholder]
- Retention notice: [policy placeholder]
- Escalation state: [state]
- Support path: [route]

MESSAGE THREAD
[Timestamp] [Role label] [Message text]
Delivery: [sent/delivered/failed/unknown]
Moderation: [not flagged/under review/restricted/removed from recipient view]
Edited: [yes/no where policy allows]
Attachment: [none / pending / restricted / rejected / available]

COMPOSE AREA
- Plain-text message field
- Character guidance
- Prohibited-content reminder
- Privacy reminder
- Send button
- Retry failed send
- Discard draft
- Report action
- Support escalation

REPORT / SAFETY ACTIONS
Report: harassment, threats, discrimination, retaliation, spam, impersonation,
prohibited personal information, inappropriate attachment, off-platform payment request,
unsafe instruction, privacy violation.

SYSTEM NOTICE THREADS
Read-only platform messages.
Reply unavailable.
Support route shown where applicable.
```

## 8. Mobile Wireframe

```text
TOP BAR
Messages | Search | Help

BOUNDARY NOTICE COLLAPSED
Messages are governed. For emergencies, follow local emergency procedures.

PRIMARY TABS
[Unread] [Active] [Support] [Archived]

CONVERSATION CARD
Type label
Related shift/case
Participant role
Unread count
Status and restriction
Last activity

CONVERSATION VIEW
Header:
Participant role
Related shift/case
Reply availability
Privacy/safety notice

Thread:
Readable message timeline
Timestamps
Delivery states
Moderation and restriction labels

Compose:
Plain-text field
Send
Report
Support
```

Mobile must prioritize:

- inbox;
- unread status;
- conversation type;
- related shift or case;
- message thread;
- compose area;
- report and support actions;
- privacy guidance;
- large touch targets;
- safe attachment status;
- restricted or read-only states.

Avoid dense multi-column layouts on mobile.

## 9. Message Composition

Message composition supports:

- plain-text message;
- character guidance;
- send state;
- retry after failure;
- discard draft;
- prohibited-content reminder;
- privacy reminder;
- report action;
- support escalation.

Do not support rich formatting unless governed. Do not allow hidden executable content.

## 10. Attachments Boundary

Attachments are represented only as a future governed capability.

Possible permitted categories:

- shift-related document;
- attendance evidence;
- approved image;
- support document;
- policy-approved file.

Prohibited in ordinary messaging:

- executable files;
- unscanned files;
- resident medical records;
- government identity documents;
- banking details;
- confidential employer documents;
- unrelated personal files.

Attachment states:

- upload pending;
- scan pending;
- available;
- restricted;
- rejected;
- expired;
- unavailable.

No attachment implementation is designed.

## 11. Privacy Boundary

Workers should see only conversations they are authorized to access.

Do not expose:

- other workers' conversations;
- private employer discussions;
- internal moderation notes;
- internal fraud signals;
- support-only annotations;
- resident details;
- medical or clinical information;
- private staff contact information.

Conversation previews must minimize sensitive content and should use safe summaries where needed.

## 12. Resident and Patient Information Boundary

Ordinary messaging must not contain:

- resident full names;
- diagnoses;
- medication details;
- care plans;
- identifying room numbers;
- health-card information;
- personal support needs;
- protected health information.

When operational context is necessary, use minimum-necessary, role-based references.

Messages must not become a clinical record.

## 13. Safety and Emergency Boundary

The page distinguishes:

```text
Ordinary operational message
↓
Urgent support request
↓
Safety incident
↓
Emergency procedure outside ordinary chat
```

Required clarifications:

```text
Message sent
does not equal
Message seen

Support requested
does not equal
Immediate intervention
```

For emergencies, the page must direct users to the appropriate emergency procedure rather than
relying on chat. Do not hardcode emergency numbers or guarantee response times.

## 14. Reporting and Moderation

Reporting categories:

- harassment;
- threats;
- discrimination;
- retaliation;
- spam;
- impersonation;
- prohibited personal information;
- inappropriate attachment;
- off-platform payment request;
- unsafe instruction;
- privacy violation.

Moderation states must be visible without exposing internal detection rules.

```text
Report submitted
does not equal
Misconduct proven

Flagged
does not equal
Automatically removed

Removed from recipient view
does not equal
Deleted from audit history
```

## 15. Harassment and Retaliation Protection

The page must address:

- employer pressure after a dispute;
- retaliation after safety reporting;
- repeated unwanted messages;
- coercion to accept shifts;
- pressure to communicate off-platform;
- pressure to disclose personal contact information;
- threats related to ratings, payment, or future work.

Governed actions:

- mute;
- restrict;
- report;
- request support;
- close or limit the thread where policy allows.

Do not silently block access without explanation.

## 16. Off-Platform Communication Boundary

The page must not encourage workers to move to:

- personal phone;
- private email;
- external messaging app;
- unapproved payment channel.

If contact details are ever shared, visibility must be governed and purpose-limited.

Off-platform communication may not preserve platform audit or support protections.

## 17. Message Editing, Removal, and Closure

If editing is represented:

- preserve original message;
- preserve revision;
- show edited status;
- retain audit history.

If removal is represented:

- distinguish sender removal from recipient removal;
- preserve governed audit history;
- show removed-message placeholder where appropriate;
- do not silently erase material evidence.

Closure reasons may include:

- shift completed;
- support case resolved;
- access window expired;
- participant removed;
- moderation restriction;
- employer relationship ended;
- formal case transferred;
- safety restriction.

Required distinctions:

```text
Closed
does not equal
Deleted

Archived
does not equal
Closed

Read-only
does not equal
Unavailable
```

## 18. Search Boundary

Search may cover:

- participant display name;
- employer or residence;
- shift reference;
- case reference;
- conversation type;
- date range;
- message text where policy allows.

Search must not expose content outside the worker's authorization scope.

Sensitive previews should be minimized.

## 19. Notification Boundary

Page 033 may show notification preferences or message state indicators only where already governed.

It does not own:

- push-notification infrastructure;
- SMS delivery;
- email delivery;
- notification scheduling;
- quiet hours;
- emergency paging;
- delivery-provider logic.

## 20. Translation Boundary

If translation is represented:

- label machine-translated content;
- preserve original text;
- allow viewing original;
- warn that translation may be imperfect;
- do not translate protected information into broader visibility;
- do not treat translation as authoritative evidence.

AI or machine translation must not silently alter the official message record.

## 21. AI Boundary

AI may:

- summarize visible conversation history;
- suggest respectful wording;
- explain conversation states;
- identify potentially prohibited content;
- suggest support routing;
- assist with translation where clearly labelled.

AI must not:

- impersonate a participant;
- send messages without explicit worker action;
- invent replies;
- alter message history;
- determine misconduct;
- close cases;
- expose restricted information;
- infer resident medical information;
- bypass permissions;
- promise response times;
- create hidden worker reputation signals.

The governed conversation record remains authoritative.

## 22. Staff Access and Auditability

Staff access to private conversations, safety reports, harassment reports, removed messages,
reporter identities, restricted attachments, and support cases must conceptually preserve:

- actor;
- role;
- action;
- conversation reference;
- reason or case reference;
- timestamp;
- result.

Do not place sensitive message content into broad operational logs.

## 23. Empty and Error States

Required states:

- no conversations;
- no unread messages;
- conversation unavailable;
- access revoked;
- reply unavailable;
- message failed;
- delivery unknown;
- attachment rejected;
- attachment scan pending;
- moderation pending;
- support unavailable;
- search unavailable;
- stale conversation state;
- service unavailable.

Do not fabricate messages or participants.

## 24. Accessibility

The page must support:

- keyboard navigation;
- screen-reader-friendly unread states;
- semantic conversation headings;
- focus management between inbox, thread, compose field, and report flow;
- accessible message timeline;
- accessible compose controls;
- clear failed-message recovery;
- non-color-only state indicators;
- accessible reporting flow;
- sufficient contrast;
- plain-language privacy notices;
- readable timestamps;
- accessible attachment statuses.

## 25. International Readiness

The page must not hardcode:

- language;
- time format;
- date format;
- message-retention period;
- permitted attachment types;
- moderation policy;
- harassment terminology;
- emergency contact method;
- working-hour expectations;
- response-time expectations;
- privacy law;
- employer relationship model;
- translation availability.

Jurisdiction, employer, assignment, locale, retention, moderation, safety, and communication policy
must remain configurable.

## 26. Future Boundary

Page 033 does not own:

- notifications;
- voice or video calling;
- formal dispute adjudication;
- clinical documentation;
- fraud engine;
- automated moderation enforcement;
- document storage;
- payroll support logic;
- attendance approval;
- ratings;
- matching;
- direct payment;
- emergency dispatch.

It may provide governed entry points where appropriate.

## 27. Self Validation

| Requirement | Result |
| --- | --- |
| Frozen title remains Messages | Pass |
| Architecture Freeze unchanged | Pass |
| Epic 3 Planning unchanged | Pass |
| Pages 016-032 unchanged | Pass |
| Financial Boundary Review unchanged | Pass |
| No Page 034 files created | Pass |
| No implementation started | Pass |
| No React/frontend/backend/API/database work | Pass |
| No messaging implementation created | Pass |
| No notification implementation created | Pass |
| No attachment implementation created | Pass |
| No moderation implementation created | Pass |
| No translation implementation created | Pass |
| No AI messaging implementation created | Pass |
| Unrelated app changes untouched | Pass |

## 28. Final Wireframe Status

```text
Page 033 - Messages
Wireframe: COMPLETE
Product Review: REQUIRED
Approval Record: NOT CREATED

Page 034 - Notifications
BLOCKED
```
