# Page 034 - Notifications Low-Fidelity Wireframe

Status: Initial wireframe complete
Epic: Epic 3 - Worker Portal
Primary user: Authenticated worker
Secondary visibility: Support, Compliance, Security, Administrator, and Super Administrator where role-permitted
Architecture baseline: Resident Job Architecture Phase 1 v1.0
Epic planning baseline: Epic 3 Worker Portal Planning v1.0
Financial boundary baseline: EPIC_3_FINANCIAL_BOUNDARY_REVIEW.md
Messages baseline: Page 033 - Messages Approved Wireframe v1.0
Frozen architecture source: pages/PAGE_034_NOTIFICATIONS.md
Implementation: Not authorized

## 1. Frozen Page Confirmation

The frozen architecture page map defines:

| Page | Frozen title | Source |
| --- | --- | --- |
| 033 | Messages | pages/PAGE_033_MESSAGES.md |
| 034 | Notifications | pages/PAGE_034_NOTIFICATIONS.md |
| 035 | Documents | pages/PAGE_035_DOCUMENTS.md |

No title inference, rename, or architecture amendment is introduced.

## 2. Page Purpose

Notifications is the authenticated worker page for viewing governed notices related to shifts,
attendance, earnings, payments, ratings, messages, compliance, support, account security, platform
policy, and service status.

The page allows the worker to:

- view governed notifications;
- distinguish unread, read, archived, expired, action-required, failed-delivery, and restricted
  notifications;
- understand why a notification was sent;
- understand which authoritative record or workflow the notification relates to;
- control permitted notification preferences;
- access the governed destination page or support path;
- understand when delivery through a specific channel failed or is unavailable.

The page must not:

- become the authoritative record for the underlying event;
- imply delivery means the notification was read;
- guarantee delivery time;
- expose confidential resident, employer, financial, or security information in previews;
- allow preferences to disable legally or operationally mandatory notices;
- replace emergency procedures;
- replace Messages, disputes, payroll, attendance, ratings, or support records;
- allow AI to fabricate events or send notices without governed authorization;
- silently alter notification history.

## 3. Notification Category Model

The page must not combine all notifications into one undifferentiated stream.

| Category | Examples | Boundary |
| --- | --- | --- |
| Shift notifications | Application update, shift accepted, shift changed, shift cancelled, upcoming shift, check-in reminder, checkout reminder | Not a substitute for the shift record |
| Attendance notifications | Evidence received, timesheet requires attention, correction requested, attendance review completed | Not proof of misconduct |
| Earnings and payment notifications | Earnings updated, payroll status changed, payment scheduled, payment sent, payment returned, destination verification required | Not payroll or payment authority |
| Messaging notifications | New message, restricted conversation, support reply | Not the message thread |
| Ratings notifications | New feedback, response available, moderation update, dispute update | Not proof of competence |
| Compliance notifications | Licence expiring, certification review, background-check status, profile verification required | Not credential approval by itself |
| Security notifications | Sign-in alert, password changed, payment destination changed, suspicious activity review, session revoked | Not fraud-rule disclosure |
| Platform and policy notices | Policy update, terms update, planned maintenance, service interruption | Legal/policy review may be required |

## 4. Source-of-Truth Boundary

Each notification points to an authoritative underlying record.

Examples:

- shift record;
- attendance record;
- timesheet;
- earnings statement;
- payment record;
- rating record;
- message thread;
- support case;
- compliance record;
- security event.

Required clarifications:

```text
Notification
does not equal
Authoritative record

Notification dismissed
does not equal
Underlying issue resolved

Notification read
does not equal
Required action completed
```

## 5. Notification Record

Each notification should support safe placeholders for:

- category;
- title;
- concise privacy-safe summary;
- related record type;
- related record reference;
- created timestamp;
- delivery channels attempted;
- in-app state;
- action-required state;
- urgency label;
- expiry state;
- read state;
- archive state;
- restriction state;
- support path;
- destination action.

Do not place sensitive full details in notification previews.

## 6. Independent States

The page must not collapse notification state into one generic status.

### A. In-App State

- Unread.
- Read.
- Archived.
- Removed from view where permitted.

### B. Delivery State

- Not attempted.
- Queued.
- Sent.
- Delivered.
- Failed.
- Bounced.
- Delivery unknown.
- Channel unavailable.

### C. Action State

- Informational.
- Action required.
- Action started.
- Action completed.
- Action expired.
- Action unavailable.

### D. Urgency State

- Standard.
- Time-sensitive.
- Critical operational notice.
- Emergency unavailable in notifications.

### E. Retention State

- Active.
- Archived.
- Expired.
- Retained for audit.
- Removed from user view.
- Legal hold where applicable.

## 7. Read and Delivery Truthfulness

Required distinctions:

```text
Sent
does not equal
Delivered

Delivered
does not equal
Read

Read
does not equal
Understood

Read
does not equal
Action completed
```

In-app unread state remains separate from email, SMS, or push delivery state.

Do not fabricate read receipts for external channels.

## 8. Desktop Wireframe

```text
HEADER
Resident Job | Notifications | Worker: [Name] | Messages | Help

NOTIFICATION GOVERNANCE NOTICE
Notifications point to authoritative records.
Reading or dismissing a notification does not complete the underlying action.
Delivery does not prove the notice was read.
Notifications are not emergency response.

FILTER BAR
[Unread]
[Action required]
[Shift]
[Attendance]
[Earnings & payment]
[Messages]
[Ratings]
[Compliance]
[Security]
[Platform notices]
[Archived]
[Search]

NOTIFICATION LIST
| Category | Title | Safe summary | Source record | Urgency | In-app state | Action state | Delivery | Created | Action |
| Shift | Shift time changed | Review updated shift details | Shift [ref] | Time-sensitive | Unread | Action required | In-app delivered | [timestamp] | Open shift |
| Payment | Payment sent | Settlement may still be pending | Payment [ref] | Standard | Read | Informational | Email failed | [timestamp] | View payment |
| Security | Payment destination changed | Review account security | Security event [ref] | Critical operational notice | Unread | Action required | Push unavailable | [timestamp] | Secure account |

SELECTED NOTIFICATION DETAIL
- Full governed notification text
- Why this was sent
- Related record type and reference
- Created date and time
- Urgency
- Required action
- Expiry where applicable
- Channels attempted
- Delivery failures where useful
- Support path
- Privacy or security guidance

SOURCE RECORD CARD
Authoritative record: [record type/ref]
Open destination: [button]
Current source status: [state]
Notification status: [state]

DELIVERY CHANNEL SUMMARY
In-app: [state]
Push: [state / unavailable]
Email: [state / masked destination / failure category]
SMS: [state / masked destination / unavailable]

PREFERENCES ENTRY
Mandatory notices: cannot be fully disabled
Optional notices: configurable where permitted
Quiet hours: configurable with exceptions
```

## 9. Mobile Wireframe

```text
TOP BAR
Notifications | Search | Preferences

GOVERNANCE NOTICE COLLAPSED
Notifications are not source records. Open the related record for action.

PRIMARY TABS
[Unread] [Action] [All] [Archived]

NOTIFICATION CARD
Category
Title
Safe summary
Related record
Urgency label
Action-required label
Timestamp
Delivery issue if present
Open action

DETAIL VIEW
Why sent
Source record
Required action
Delivery state
Support path
Privacy/security guidance
```

Mobile prioritizes:

- unread and action-required items;
- category;
- concise summary;
- timestamp;
- urgency;
- source context;
- action button;
- safe preview;
- preference access;
- large touch targets;
- clear delivery-failure state.

Avoid dense tables.

## 10. Action-Required Notifications

Represent clear actions such as:

- confirm availability;
- review shift change;
- complete profile requirement;
- verify payment destination;
- review timesheet;
- respond to support;
- renew licence or certification;
- review security activity.

Required boundary:

```text
Opening the notification
does not equal
Completing the action
```

The notification layer must not silently perform high-impact actions.

## 11. Mandatory vs Optional Notifications

### A. Mandatory Operational Notices

Examples:

- shift cancellation;
- material schedule change;
- payment destination change;
- account security alert;
- legal or policy notice where required.

### B. Configurable Notifications

Examples:

- shift recommendations;
- reminder frequency;
- marketing;
- optional product updates.

### C. Channel-Specific Preferences

Examples:

- in-app;
- push;
- email;
- SMS where available.

Workers cannot fully disable mandatory notices. Not every channel is always available.

## 12. Preference Governance

If preferences are shown, include:

- category;
- channel;
- mandatory or optional status;
- current setting;
- effective time;
- save state;
- error state;
- jurisdiction or employer restriction where applicable.

Required clarifications:

```text
Preference saved
does not equal
Immediate provider synchronization

Channel enabled
does not equal
Guaranteed delivery
```

Do not design provider implementation.

## 13. Quiet Hours

If quiet hours are represented:

- keep them configurable;
- show timezone;
- show exceptions;
- distinguish delayable from non-delayable notices;
- preserve critical operational and security exceptions;
- explain some notices may still be delivered.

Do not suppress emergency or mandatory security notices solely because of quiet hours.

## 14. Domain Boundaries

### Shift Boundary

Shift notifications may include application outcome, offer expiry, acceptance, cancellation, time or
location change, reminder, or check-in availability. They must open the authoritative shift record.

Do not expose resident names, room numbers, medical details, or unnecessary workplace specifics in
previews.

### Attendance Boundary

Attendance notifications may indicate evidence received, missing check-in, missing checkout, review
needed, correction requested, or review completed.

```text
Missing evidence
does not equal
Worker misconduct
```

Material issues route to the authoritative attendance or timesheet record.

### Earnings and Payment Boundary

Financial notifications preserve truthfulness:

```text
Payment scheduled
does not equal
Payment sent

Payment sent
does not equal
Settled
```

Do not expose full payment destination, bank details, employer billing data, platform margin, or
private deductions in previews.

### Ratings Boundary

Ratings notifications may indicate feedback received, response opportunity, moderation update,
dispute status, removal, or restoration.

Do not reveal protected reporter identity. Do not imply a rating is verified fact or proof of
competence.

### Messaging Boundary

Message notifications may show sender display name or governed role, conversation type, related
shift or case, and concise privacy-safe preview.

Page 034 does not own the message thread.

### Security Boundary

Security notifications may include sign-in alert, password reset, multi-factor change, payment
destination change, account recovery, suspicious activity review, or session revoked.

Include event type, timestamp, approximate device or location only where governed, account-security
action, and support path. Do not reveal internal risk scores or fraud rules.

## 15. Emergency Boundary

Notifications are not emergency dispatch.

```text
Notification created
does not equal
Emergency service contacted

Notification delivered
does not equal
Immediate human response
```

For urgent danger, the interface directs the worker to the approved emergency procedure. No
emergency dispatch is designed.

## 16. Delivery Channels and Failures

Conceptual channels:

- in-app;
- push;
- email;
- SMS where approved.

For each channel:

- enabled or disabled;
- attempted;
- delivered;
- failed;
- unavailable;
- masked address or destination;
- last verified state.

Delivery failure categories:

- unverified email or phone;
- provider unavailable;
- device token invalid;
- bounced email;
- SMS unavailable;
- push permission disabled;
- delivery unknown.

Each failure includes safe reason category, worker action, alternate access path, and last update.

Do not expose provider credentials, message IDs, raw metadata, or guarantee retry timing.

## 17. Notification Retention

The page distinguishes:

- active notification;
- archived notification;
- expired action;
- removed user view;
- audit-retained event;
- legal hold.

Do not silently erase security, payment, attendance, dispute, or compliance notices where retention
is required.

No retention implementation is designed.

## 18. Auditability

Conceptually preserve audit history for:

- notification creation;
- template version;
- source event;
- channels attempted;
- preference state;
- delivery result;
- read or archive action;
- support access;
- mandatory-notice override.

Audit placeholders include:

- actor or system;
- role;
- action;
- notification reference;
- source-event reference;
- timestamp;
- result.

Do not place sensitive notification content into broad logs.

## 19. Templates Boundary

If templates are represented conceptually, require:

- version;
- category;
- locale;
- mandatory or optional classification;
- channel suitability;
- privacy-safe preview;
- approval state;
- effective date.

Silent template changes must not alter historical notification meaning.

No template engine is designed.

## 20. Localization and Translation

Support:

- locale-specific text;
- date and time formatting;
- timezone;
- number and currency formatting;
- original authoritative record;
- translation fallback state.

Do not use machine translation to change the authoritative underlying record.

Do not assume all channels support all languages equally.

## 21. AI Boundary

AI may:

- summarize visible notifications;
- explain notification states;
- group related notifications;
- suggest which governed page to open;
- help explain why an action may be required.

AI must not:

- fabricate a source event;
- send notifications without governed authorization;
- mark actions completed;
- change mandatory preferences;
- suppress security notices;
- infer misconduct;
- alter delivery history;
- claim delivery or read status without evidence;
- expose restricted information;
- impersonate support or an employer;
- create hidden reputation or worker-risk signals.

The authoritative source record remains controlling.

## 22. Empty and Error States

Required states:

- no notifications;
- no unread notifications;
- no action-required notifications;
- notification unavailable;
- source record unavailable;
- stale notification;
- action expired;
- action already completed;
- delivery failed;
- channel unavailable;
- preference save failed;
- support unavailable;
- service unavailable.

Do not fabricate notices.

## 23. Accessibility

The page must support:

- semantic unread indicators;
- screen-reader-friendly urgency labels;
- keyboard navigation;
- focus management;
- accessible filters;
- readable timestamps;
- non-color-only delivery states;
- clear action-required labels;
- accessible preference controls;
- plain-language errors;
- sufficient contrast;
- accessible channel status;
- reduced-motion compatibility where relevant.

## 24. International Readiness

The page must not hardcode:

- language;
- date format;
- time format;
- timezone;
- notification categories;
- mandatory-notice rules;
- SMS availability;
- channel costs;
- quiet-hour rules;
- legal-notice requirements;
- delivery timing;
- retention period;
- emergency contact method;
- employer communication policy;
- worker-classification assumptions.

Jurisdiction, employer, assignment, locale, category, channel, retention, urgency, and policy remain
configurable.

## 25. Future Boundary

Page 034 does not own:

- source business records;
- push infrastructure;
- SMS provider;
- email provider;
- template engine;
- scheduling engine;
- emergency dispatch;
- dispute workflow;
- messaging;
- payroll;
- attendance approval;
- rating moderation;
- identity verification;
- fraud engine;
- account-security enforcement.

It provides governed entry points and status visibility only.

## 26. Self Validation

| Requirement | Result |
| --- | --- |
| Frozen title remains Notifications | Pass |
| Architecture Freeze unchanged | Pass |
| Epic 3 Planning unchanged | Pass |
| Pages 016-033 unchanged | Pass |
| Financial Boundary Review unchanged | Pass |
| No Page 035 files created | Pass |
| No approval record created | Pass |
| No implementation started | Pass |
| No React/frontend/backend/API/database work | Pass |
| No push implementation created | Pass |
| No email implementation created | Pass |
| No SMS implementation created | Pass |
| No notification-provider integration created | Pass |
| No template engine created | Pass |
| No scheduling engine created | Pass |
| No AI notification implementation created | Pass |
| Unrelated app changes untouched | Pass |

## 27. Final Wireframe Status

```text
Page 034 - Notifications
Wireframe: COMPLETE
Product Review: REQUIRED
Approval Record: NOT CREATED

Page 035 - Documents
BLOCKED
```
