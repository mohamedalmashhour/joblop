# Page 033 - Messages Wireframe Revision 1

Status: Controlled revision complete
Page: 033 - Messages
Epic: Epic 3 - Worker Portal
Primary user: Authenticated worker
Architecture baseline: Resident Job Architecture Phase 1 v1.0
Epic planning baseline: Epic 3 Worker Portal Planning v1.0
Initial wireframe: PAGE_033_MESSAGES_LOW_FIDELITY_WIREFRAME.md
Implementation: Not authorized

## 1. Revision Scope

This controlled revision strengthens:

- conversation governance;
- participant authorization;
- message lifecycle;
- privacy boundaries;
- retention governance;
- moderation;
- safety escalation;
- auditability;
- AI boundaries;
- future integration boundaries.

No redesign, architecture change, implementation, API, database, messaging integration, notification
integration, moderation integration, translation integration, attachment integration, or AI
messaging integration is introduced.

## 2. Participant Authorization

The Messages page now separates participant categories explicitly.

| Participant type | Meaning | Boundary |
| --- | --- | --- |
| Authenticated participant | Signed in user | Not automatically authorized for every conversation |
| Authorized participant | User permitted to access a specific conversation | Permission is contextual and revocable |
| Temporary participant | User granted limited access for a shift, support case, or review window | Access expires or becomes read-only when policy requires |
| Removed participant | User no longer permitted to participate | Prior audit history is preserved |
| Support participant | Authorized support or operations staff | Access requires role, reason, and audit record |
| System participant | Platform-generated notice or read-only thread | Does not represent a human reply |

Required clarifications:

```text
Authenticated
does not equal
Authorized to access a conversation

Completed shift relationship
does not equal
Permanent messaging access

Support participant
does not equal
Unrestricted staff access
```

## 3. Conversation Lifecycle

Conversation lifecycle states are independent and must not collapse into one status.

```text
Conversation requested / created
↓
Participants authorized
↓
Open
↓
Reply available / reply restricted / read-only
↓
Archived
or
Closed
↓
Retained evidence where required
↓
Deleted from user view where permitted
↓
Restored where policy allows
```

Required distinctions:

```text
Archived
does not equal
Deleted

Closed
does not equal
Archived

Read-only
does not equal
Closed

Deleted from user view
does not equal
Removed from governed audit or retained evidence
```

## 4. Message Lifecycle

Messages use a separate lifecycle from the conversation.

```text
Draft
↓
Queued
↓
Sending
↓
Sent
↓
Delivered
↓
Read where supported
↓
Edited where permitted
↓
Removed from a permitted view where governed
↓
Restored where policy allows
↓
Retained where required
```

Required distinctions:

```text
Sent
does not equal
Read

Delivered
does not equal
Seen

Removed from recipient view
does not equal
Evidence destroyed

Edited
does not equal
Original text unavailable to governed audit
```

## 5. Revised Desktop Governance Layout

```text
HEADER
Resident Job | Messages | Worker: [Name] | Help | Notifications

MESSAGING GOVERNANCE NOTICE
Messages are governed platform conversations.
Authentication does not grant access to every conversation.
Message sent does not mean message read.
Ordinary messaging is not emergency response.
AI does not impersonate participants or send messages.

INBOX
Filters: Unread | Active shifts | Employer | Support | Safety | System | Archived
Search: scoped to authorized conversations only

CONVERSATION LIST CARD
- Conversation type
- Related shift / case / employer / system notice
- Participant display role
- Participant authorization state
- Conversation state
- Reply permission
- Unread count
- Last activity
- Restriction / escalation state

CONVERSATION HEADER
- Participant role and governed display name
- Employer/residence safe label where appropriate
- Related shift/case/support reference
- Conversation type
- Participation state
- Reply permission
- Retention notice placeholder
- Safety/privacy notice

THREAD
- Message text visible only within authorized scope
- Draft / queued / sending / sent / delivered / read where supported
- Edited / removed / restored / retained markers where applicable
- Moderation state
- Attachment status where future-governed

COMPOSE
- Plain-text message
- Prohibited-content reminder
- Privacy reminder
- Send / retry / discard draft
- Report
- Request support

SAFETY AND MODERATION PANEL
- Report harassment
- Report discrimination
- Report retaliation
- Report threat
- Report privacy violation
- Report prohibited information
- Request safety review
- Emergency guidance: follow appropriate emergency procedure outside chat
```

## 6. Safety and Escalation Governance

The page distinguishes:

| Situation | Worker action | Governance boundary |
| --- | --- | --- |
| Ordinary operational question | Send message | No guaranteed response time |
| Urgent support need | Request support | Support requested does not mean immediate intervention |
| Harassment or discrimination | Report and request support | Report does not prove misconduct |
| Retaliation concern | Report retaliation | Governed review required |
| Threat or safety concern | Safety review path | Ordinary chat is not emergency dispatch |
| Privacy violation | Report privacy issue | Internal rules are not exposed |
| Emergency | Follow emergency procedure outside chat | Do not rely on ordinary messaging |

## 7. Privacy Boundary

Workers see only:

- authorized conversations;
- authorized participants;
- permitted message history;
- governed context required for the thread.

Workers must never see:

- unrelated worker messages;
- internal moderation notes;
- resident or patient information;
- protected health information;
- employer-only discussions;
- staff-only discussions;
- support-only annotations;
- internal fraud signals;
- private staff contact information.

Conversation previews must not leak sensitive information.

## 8. Attachment Governance

Attachments remain conceptual only.

Future-safe attachment statuses:

- pending scan;
- approved;
- rejected;
- restricted;
- expired;
- unavailable.

Attachments must not imply unrestricted file sharing. Ordinary chat must not accept:

- executable files;
- unscanned files;
- resident medical records;
- government identity documents;
- banking details;
- confidential employer documents;
- unrelated personal files.

## 9. Retention Boundary

The page separates retention concepts:

| Retention concept | Meaning | Boundary |
| --- | --- | --- |
| Active conversation | Currently available for permitted reply | Not permanent access |
| Archived conversation | Removed from active view but still accessible where permitted | Not deleted |
| Retained evidence | Preserved for governed support, safety, audit, or dispute need | Not broad-visible content |
| Deleted user view | Hidden from a user-facing view where policy permits | Not evidence destruction |
| Legal hold | Preservation required by governed legal/compliance process | No implementation details |
| Expired retention | Retention period ended according to future policy | No hardcoded periods |

No retention implementation, storage rule, deletion engine, or legal hold workflow is designed.

## 10. Auditability

The wireframe conceptually preserves audit history for:

- conversation creation;
- participant authorization changes;
- participant removal;
- reply-permission changes;
- message edits;
- message removals;
- message restoration;
- moderation actions;
- support access;
- safety escalation;
- attachment status changes.

Audit placeholders include:

- actor;
- role;
- timestamp;
- action;
- reason or case reference;
- result.

Sensitive message content must not be copied into broad operational logs.

## 11. AI Boundary

AI may:

- summarize visible messages;
- explain conversation status;
- draft respectful replies for explicit user review;
- identify possible policy violations;
- suggest support routing.

AI must never:

- impersonate users;
- send messages;
- alter history;
- remove evidence;
- determine misconduct;
- expose restricted content;
- bypass permissions;
- guarantee responses;
- create hidden reputation or conduct signals from messages.

## 12. Future Integration Boundary

Page 033 does not own:

- notification engine;
- push delivery;
- SMS;
- email;
- translation engine;
- voice or video;
- dispute resolution;
- document storage;
- fraud engine;
- emergency dispatch.

The page provides governed entry points only.

## 13. Mobile Revision Notes

Mobile keeps the same governance but collapses it into:

1. Inbox filters.
2. Conversation cards with participant-role and authorization state.
3. Conversation header with reply permission, status, and safety notice.
4. Thread with delivery, moderation, and lifecycle labels.
5. Compose/report/support actions.

The first mobile view must prioritize unread state, active-shift context, restricted/read-only
state, and support/report access without relying on color alone.

## 14. Revision Validation

| Approval condition | Result |
| --- | --- |
| Participant authorization is governed | Pass |
| Message and conversation lifecycles remain independent | Pass |
| Safety escalation is clear | Pass |
| Privacy boundaries are preserved | Pass |
| Attachment governance is explicit | Pass |
| Auditability is documented | Pass |
| AI cannot impersonate or send messages | Pass |
| No governance, privacy, or operational risks remain at wireframe level | Pass |

## 15. Governance Validation

| Requirement | Result |
| --- | --- |
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
| No commit, push, merge, or deployment | Pass |

## 16. Final Revision Status

```text
Page 033 - Messages
Revision 1: COMPLETE
Approval criteria: SATISFIED

Page 034 - Notifications
UNBLOCKED as next controlled gate
NOT CREATED
```
