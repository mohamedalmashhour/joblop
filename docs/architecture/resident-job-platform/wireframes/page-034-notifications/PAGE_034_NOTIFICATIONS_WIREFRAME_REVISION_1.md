# Page 034 - Notifications Wireframe Revision 1

Status: Controlled revision complete
Page: 034 - Notifications
Epic: Epic 3 - Worker Portal
Primary user: Authenticated worker
Architecture baseline: Resident Job Architecture Phase 1 v1.0
Epic planning baseline: Epic 3 Worker Portal Planning v1.0
Initial wireframe: PAGE_034_NOTIFICATIONS_LOW_FIDELITY_WIREFRAME.md
Implementation: Not authorized

## 1. Revision Scope

This controlled revision strengthens:

- source-event authority;
- notification lifecycle truthfulness;
- mandatory-notice governance;
- security-notification protection;
- preference and quiet-hour boundaries;
- privacy-safe previews;
- delivery failure recovery;
- retention and auditability;
- AI boundaries;
- future integration boundaries.

No redesign, architecture change, implementation, API, database, notification-provider integration,
email, SMS, push, template engine, scheduling engine, or AI notification implementation is
introduced.

## 2. Source-Event Authority

Every notification must originate from an authoritative governed event.

```text
Source event created
↓
Notification generated
↓
Channel delivery attempted
↓
Notification viewed
↓
Required action completed
```

Required distinctions:

```text
Notification created
does not equal
Source event confirmed

Notification opened
does not equal
Underlying record resolved

Notification dismissed
does not equal
Required action completed
```

The authoritative business record remains controlling.

## 3. Notification Lifecycle

Notification lifecycle states remain independent.

| Lifecycle dimension | States | Boundary |
| --- | --- | --- |
| Generation | Pending generation, generated, generation failed, suppressed by governed policy, generation unavailable | Generation does not prove delivery |
| In-app visibility | Unread, read, archived, removed from user view, restricted, unavailable | Read does not complete action |
| Channel delivery | Not attempted, queued, sent, delivered, failed, bounced, delivery unknown, channel unavailable | Delivered does not prove read |
| Required action | Informational, action required, action started, action completed, expired, no longer applicable, action unavailable | Notification layer does not silently complete high-impact actions |
| Retention | Active, archived, expired, audit retained, legal hold, deletion eligible, deleted where permitted | Deleted from view does not erase required evidence |

No state may imply another.

## 4. Read and Delivery Truthfulness

The user-facing design reinforces:

```text
Generated
does not equal
Sent

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

Do not fabricate external read receipts.

Do not use "notified" as proof that a worker received, understood, or accepted a material change.

## 5. Mandatory Notice Governance

Mandatory and configurable notices are visibly separated.

| Notice class | Disable rule | Quiet hours | Fallback |
| --- | --- | --- | --- |
| Mandatory legal notice | Cannot be fully disabled where required | Depends on legal/policy rule | In-app record remains available |
| Mandatory security notice | Cannot be fully disabled | Usually non-delayable | Account-security path |
| Mandatory operational notice | Cannot be fully disabled for material events | Some material events non-delayable | Authoritative operational record |
| Employer-required notice | Governed by employer/platform policy | Configurable where permitted | Source workflow |
| Configurable reminder | User-configurable where allowed | Delayable where permitted | In-app center |
| Marketing communication | Optional | Delayable or disabled | Preference management |

Workers must not be able to fully disable required security, material shift-change,
payment-destination, or legally required notices.

## 6. Preference Governance

Notification preferences use independent states:

```text
Preference submitted
↓
Preference saved
↓
Preference effective
↓
Provider synchronized
↓
Delivery attempted under the new preference
```

Required distinctions:

```text
Preference saved
does not equal
Immediate provider synchronization

Channel enabled
does not equal
Destination verified

Destination verified
does not equal
Delivery guaranteed
```

Notification preferences must not alter the source business record.

## 7. Quiet Hours

Quiet hours must show:

- worker timezone;
- effective start and end;
- delayable categories;
- non-delayable exceptions;
- mandatory security exceptions;
- material shift-change exceptions;
- expiration while delayed;
- fallback when timezone is unavailable.

Quiet hours must not suppress:

- account-security alerts;
- payment-destination changes;
- material shift cancellation or relocation;
- legally required notices;
- other approved non-delayable events.

Quiet hours do not guarantee silence across every channel.

## 8. Security Notifications

Security notifications are governed for:

- new sign-in;
- password reset;
- multi-factor change;
- account recovery;
- payment-destination change;
- session revocation;
- suspicious activity review.

Security notification design must:

- minimize sensitive preview content;
- provide a governed account-protection action;
- preserve source-event reference;
- resist preference suppression;
- resist quiet-hour suppression where required;
- avoid exposing internal fraud signals;
- avoid revealing precise location unless governed.

Required distinctions:

```text
Security notification
does not equal
Confirmed fraud

Approximate device or location
does not equal
Verified identity
```

## 9. Privacy-Safe Preview Patterns

List, lock-screen, email-subject, SMS, and push previews must not expose:

- resident names;
- diagnoses;
- medication information;
- room numbers;
- bank details;
- full payment destination;
- confidential employer details;
- reporter identity;
- dispute allegations;
- internal moderation notes;
- detailed security signals.

Safe preview patterns:

| Sensitive category | Safe preview pattern |
| --- | --- |
| Payment destination | "Payment destination update requires review" |
| Security event | "Account security activity requires review" |
| Attendance issue | "Attendance record requires attention" |
| Compliance item | "A profile requirement needs review" |
| Rating/dispute | "Feedback status updated" |
| Message | "New message in a governed conversation" |
| Shift change | "A shift detail changed. Review the shift record." |

Full governed detail requires authorized access.

## 10. Financial and Attendance Truthfulness

Notification wording must preserve:

```text
Estimated earnings updated
does not equal
Approved earnings

Payment scheduled
does not equal
Payment sent

Payment sent
does not equal
Settled

Missing attendance evidence
does not equal
Misconduct

Correction requested
does not equal
Rejection
```

Notifications do not overstate the state of financial, attendance, or compliance records.

## 11. Delivery Failure Recovery

Delivery failures include safe recovery guidance.

| Failure category | In-app record available | Worker action | Alternate path | Retry status |
| --- | --- | --- | --- | --- |
| Invalid or unverified destination | Yes | Verify contact destination | Use in-app center | Automatic/manual/unknown |
| Push permission disabled | Yes | Enable permissions where desired | Use in-app center | Unknown |
| Device token invalid | Yes | Reconnect device/app where applicable | Use in-app center | Unknown |
| Bounced email | Yes | Update email | Use in-app center | Unknown |
| SMS unavailable | Yes | Review SMS availability or contact support | Use in-app center | Unknown |
| Provider unavailable | Yes | Check in-app notification center | Support path | Unknown |
| Delivery unknown | Yes | Open related record directly | In-app center/source record | Unknown |
| All external channels failed | Yes | Review in-app record and contact support if needed | In-app center/support | Unknown |

Do not promise retry timing without evidence.

## 12. Retention

The page separates:

- notification visible to worker;
- archived notification;
- expired action;
- retained source event;
- audit-retained notification metadata;
- legal hold;
- deletion from user view;
- permanent deletion where permitted.

Do not silently erase:

- security notices;
- payment notices;
- attendance notices;
- compliance notices;
- dispute-related notices;
- legal notices.

No retention implementation is designed.

## 13. Auditability

Audit history is conceptually preserved for:

- source-event linkage;
- notification generation;
- template version;
- locale;
- channels selected;
- channel attempts;
- delivery result;
- preference state;
- mandatory override;
- read or archive state;
- expiry;
- staff access;
- user action.

Audit placeholders include:

- actor or system;
- role;
- action;
- timestamp;
- notification reference;
- source-event reference;
- result;
- reason where applicable.

Sensitive notification content must not be placed into broad logs.

## 14. Templates and Historical Meaning

Template changes must not rewrite notification history.

Preserve conceptually:

- template identifier;
- template version;
- locale;
- approval state;
- effective date;
- rendered notification reference.

Historical notifications retain their original meaning after future template revisions.

No template engine is designed.

## 15. AI Boundary

AI may:

- summarize visible notifications;
- group related notifications;
- explain state terminology;
- route to the authoritative page;
- help explain why an action may be required.

AI must never:

- fabricate a source event;
- generate mandatory notices without authority;
- send notifications autonomously;
- mark actions completed;
- change preferences;
- suppress security or legal notices;
- invent delivery or read status;
- infer misconduct;
- expose restricted information;
- impersonate an employer or support agent;
- create hidden worker-risk signals.

## 16. Future Integration Boundary

Page 034 does not own:

- business-event creation;
- notification provider infrastructure;
- email delivery;
- SMS delivery;
- push delivery;
- template engine;
- scheduling engine;
- retry engine;
- emergency dispatch;
- messaging;
- dispute adjudication;
- payroll;
- attendance approval;
- security enforcement;
- fraud decisions.

Page 034 provides governed visibility, preferences, and routing only.

## 17. Revision Validation

| Approval condition | Result |
| --- | --- |
| Every notification links to an authoritative source | Pass |
| Generation, visibility, delivery, action, and retention states remain independent | Pass |
| Mandatory notices cannot be improperly disabled | Pass |
| Security notifications are protected | Pass |
| Privacy-safe previews are explicit | Pass |
| Financial and attendance language remains truthful | Pass |
| Delivery failures have recovery paths | Pass |
| Auditability is documented | Pass |
| Historical meaning is preserved | Pass |
| AI cannot fabricate, send, suppress, or complete actions | Pass |
| No governance, privacy, security, or operational risk remains at wireframe level | Pass |

## 18. Governance Validation

| Requirement | Result |
| --- | --- |
| Architecture Freeze unchanged | Pass |
| Epic 3 Planning unchanged | Pass |
| Pages 016-033 unchanged | Pass |
| Financial Boundary Review unchanged | Pass |
| No Page 035 files created | Pass |
| No implementation started | Pass |
| No React/frontend/backend/API/database work | Pass |
| No notification-provider integration created | Pass |
| No email/SMS/push implementation created | Pass |
| No template engine created | Pass |
| No scheduling engine created | Pass |
| No commit, push, merge, or deployment | Pass |

## 19. Final Revision Status

```text
Page 034 - Notifications
Revision 1: COMPLETE
Approval criteria: SATISFIED

Page 035 - Documents
UNBLOCKED as next controlled gate
NOT CREATED
```
