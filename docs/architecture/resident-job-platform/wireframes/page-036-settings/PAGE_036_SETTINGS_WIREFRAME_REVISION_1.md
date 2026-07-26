# Page 036 - Settings Wireframe Revision 1

Status: Revision 1 complete
Epic: Epic 3 - Worker Portal
Primary user: Authenticated worker
Baseline wireframe: PAGE_036_SETTINGS_LOW_FIDELITY_WIREFRAME.md
Owner decision: Approved with documented conditions
Implementation: Not authorized

## 1. Revision Summary

Revision 1 strengthens Page 036 as a governed settings control surface. It does not redesign the
page, change navigation, alter the Architecture Freeze, modify Epic 3 Planning, or create Page 037.

The revision clarifies:

- source-of-truth ownership;
- high-impact setting protections;
- contact-change lifecycle;
- security and session governance;
- mandatory communication limits;
- privacy, consent, export, deactivation, deletion, retention, and legal-hold boundaries;
- payment-setting boundaries;
- accessibility preference privacy;
- auditability;
- AI limitations;
- employer-portal transition protections.

## 2. Revised Settings Ownership Model

Every displayed setting must communicate six separate concepts:

| Concept | Meaning |
| --- | --- |
| Setting displayed | The worker can see the setting or status on Page 036. |
| Setting editable | The worker can directly edit the value from this surface. |
| Setting owner | The authoritative page, workflow, or business function that owns the value. |
| Governing workflow | The process that reviews, verifies, synchronizes, or completes the change. |
| Verification authority | The workflow or authorized party that confirms the new value. |
| Effective-state authority | The workflow or system that confirms the setting is active. |

Required distinctions:

```text
Displayed on Page 036
does not equal
Owned by Page 036

Submitted
does not equal
Verified

Verified
does not equal
Effective

Saved
does not equal
Synchronized with every downstream service
```

Page 036 remains the worker control surface for governed settings. It is not the replacement source
of truth for Profile, Professional Information, Licences, Certifications, Documents, Payments,
Notifications, Messages, Security, formal privacy workflows, or account-lifecycle workflows.

## 3. High-Impact Change Classification

Settings must visually separate ordinary preferences from high-impact changes.

High-impact changes include:

- primary email;
- primary phone;
- password;
- multi-factor method;
- recovery destination;
- legal or verified name;
- identity-linked information;
- payment destination;
- data export;
- account deactivation;
- account deletion;
- consent withdrawal with material consequences.

Each high-impact setting must include conceptual protection indicators:

| Protection | Purpose |
| --- | --- |
| Reauthentication requirement | Confirms the current user before allowing sensitive action. |
| Second-factor confirmation | Adds a second security check where governed. |
| New-destination verification | Confirms the new email, phone, or recovery channel before it becomes effective. |
| Prior-destination notification | Alerts the previous contact path where governed. |
| Review requirement | Routes sensitive changes to an authorized workflow when necessary. |
| Cooling-off period | Indicates delayed effect where governed. |
| Recovery path | Provides a safe route for unauthorized change reports. |
| Audit event | Preserves actor, reason, timestamp, prior state, and resulting state. |

Ordinary preferences, such as interface language or noncritical reminder choices, must not be given
the same destructive-action treatment.

## 4. Contact Change Lifecycle

Contact changes use a governed lifecycle:

```text
Change requested
↓
Current-session or reauthentication check
↓
New destination verification pending
↓
Verification completed
↓
Change scheduled or effective
↓
Prior destination notified where governed
↓
Prior destination retired
```

Failure and recovery states:

- verification failed;
- verification expired;
- unauthorized change reported;
- change reversed;
- support review required;
- service unavailable.

Required distinctions:

```text
New email entered
does not equal
Primary email changed

New phone verified
does not equal
Account recovery complete
```

The worker should always understand what is current, what is pending, what must be verified, and
where to get help.

## 5. Security and Session Governance

Security settings must remain independent:

- password state;
- multi-factor state;
- recovery state;
- active-session state;
- trusted-device state;
- security-alert state;
- account-review state.

Required distinctions:

```text
Password changed
does not equal
All sessions revoked

Session revoked
does not equal
Password changed

MFA enabled
does not equal
Every recovery path secured

Approximate location
does not equal
Verified physical location
```

Page 036 must not reveal precise device fingerprints, authentication secrets, recovery codes,
internal risk scores, or protected security telemetry.

## 6. Session Revocation States

Session controls must represent:

- revocation requested;
- revocation pending;
- revoked;
- revocation failed;
- session already expired;
- session state unavailable.

Explicit confirmation is required for:

- revoke one session;
- revoke all other sessions;
- revoke every session including the current session where allowed.

The page must not imply immediate revocation unless the authentication system confirms it.

## 7. Mandatory Communications Boundary

Workers cannot fully disable mandatory notices.

Mandatory notice categories include:

- security alerts;
- payment-destination changes;
- material shift changes;
- account-recovery notices;
- legal notices;
- mandatory operational notices.

Communication types remain separate:

| Type | Worker control |
| --- | --- |
| Mandatory in-app notice | Cannot be suppressed by ordinary preference. |
| Mandatory external notice where required | Cannot be fully disabled where governed. |
| Optional reminder | May be configurable. |
| Marketing | Requires separate consent/preference control. |
| Product update | May be configurable where permitted. |

Required distinctions:

```text
Channel disabled
does not equal
Mandatory notice suppressed

Preference saved
does not equal
Guaranteed provider synchronization
```

Page 036 must not override Page 034 as the authoritative notification experience.

## 8. Privacy Visibility Boundary

Privacy settings must support minimum-necessary visibility.

Visibility categories:

- employer-visible profile fields;
- role-relevant compliance status;
- public or discoverable profile information where applicable;
- contact visibility;
- availability visibility;
- ratings visibility;
- restricted platform-only data.

Simple settings must never expose or authorize employer access to:

- tax documents;
- banking data;
- identity images;
- raw background-check details;
- private disputes;
- legal-hold information;
- internal safety or fraud signals.

Mandatory legal or operational visibility cannot be overridden by an ordinary preference.

## 9. Consent Governance

Consent must remain distinct from preferences, contract, and required processing.

Consent categories:

- contractual processing;
- legally required processing;
- legitimate operational use;
- marketing consent;
- communication preference.

Required distinctions:

```text
Preference
does not equal
Consent

Consent
does not equal
Contract

Consent withdrawn
does not equal
Historical processing erased

Consent unavailable for withdrawal
does not equal
Consent ignored
```

Each consent record should conceptually preserve:

- purpose;
- version;
- status;
- effective date;
- withdrawal date;
- governing basis;
- consequences;
- audit history.

No consent engine is designed.

## 10. Data Export Lifecycle

Export requests must show a governed lifecycle:

```text
Available
↓
Request submitted
↓
Identity confirmation required
↓
Under review
↓
Preparing
↓
Partially available or ready
↓
Download expired, failed, restricted, or completed
```

Required distinctions:

```text
Export request
does not equal
Immediate generation

Export ready
does not equal
Public access

Download completed
does not equal
Account deletion
```

Export access must conceptually be authenticated, time-limited, auditable, and privacy-preserving.
No export generation is designed.

## 11. Deactivation Lifecycle

Deactivation remains independent from deletion.

States:

- active;
- deactivation requested;
- obligations check required;
- scheduled;
- deactivated;
- reactivation available;
- reactivation under review;
- reactivation restricted;
- unavailable.

Required distinctions:

```text
Deactivated
does not equal
Deleted

Deactivated
does not equal
Anonymized

Deactivated
does not equal
Historical assignments, payments, disputes, or legal records erased
```

The page must represent effects on:

- future shift eligibility;
- active assignments;
- open support cases;
- payment processing;
- messaging access;
- mandatory notices.

Any unresolved operational effects remain design debt or implementation policy questions, not
Page 036 assumptions.

## 12. Account Deletion Lifecycle

Deletion requests must remain governed.

States:

- not requested;
- requested;
- identity confirmation required;
- obligations review;
- retention obligations identified;
- under review;
- partially fulfilled;
- approved;
- scheduled;
- completed;
- denied where law permits;
- cancelled;
- unavailable.

Required distinctions:

```text
Deletion requested
does not equal
Immediate deletion

Deletion approved
does not equal
Every record deleted

Deletion completed
does not equal
Required payroll, tax, audit, dispute, fraud, safety, compliance, or legal-hold records erased
```

Do not promise irreversible deletion where the governing policy supports only deactivation,
anonymization, restriction, or partial deletion.

## 13. Retention and Legal-Hold Truthfulness

Represent separately:

- ordinary retention;
- audit retention;
- payroll or tax retention;
- dispute hold;
- fraud hold;
- safety hold;
- legal or regulatory hold;
- deletion eligible;
- deletion completed;
- anonymization where permitted.

Required distinctions:

```text
Deletion eligible
does not equal
Deleted

Account closed
does not equal
Hold released

Worker request
does not equal
Authority to release a hold
```

The page must not expose confidential legal or investigative details.

## 14. Payment Boundary

Settings may route to Page 031 Payments for payment-destination management but must not own,
display, or edit:

- full account numbers;
- routing details;
- payment credentials;
- provider secrets;
- employer billing information.

Required distinctions:

```text
Payment destination change requested
does not equal
Verified

Verified
does not equal
Effective

Effective
does not equal
Applied to already-issued payments
```

Page 031 remains authoritative for payment status and destination governance.

## 15. Accessibility Preference Privacy

Accessibility settings may include:

- text size;
- contrast;
- reduced motion;
- screen-reader preference;
- keyboard support;
- communication accessibility.

These preferences:

- are not medical diagnoses;
- must not create employment eligibility decisions;
- must not be broadly visible to employers;
- may be shared only when authorized and operationally necessary.

The page must not infer disability or protected characteristics.

## 16. Auditability

Audit history is conceptually required for:

- contact changes;
- password or multi-factor changes;
- recovery changes;
- session revocations;
- consent changes;
- privacy requests;
- export requests;
- deactivation;
- deletion requests;
- staff-assisted changes;
- high-impact change reversals.

Audit records should include:

- actor;
- role;
- action;
- setting or request reference;
- prior state;
- resulting state;
- reason or case reference;
- timestamp;
- result.

Do not log passwords, tokens, recovery codes, full contact values, banking data, or sensitive
document content.

## 17. AI Boundary

AI may:

- explain settings and statuses;
- help locate the correct authoritative workflow;
- summarize worker-visible preferences;
- explain consequences using approved policy;
- help draft support, correction, export, or privacy requests.

AI must never:

- change settings;
- submit high-impact requests without explicit confirmation;
- disable mandatory notices;
- change authentication or recovery methods;
- revoke sessions;
- export data;
- deactivate or delete accounts;
- alter consent;
- release holds;
- change payment destinations;
- fabricate completion;
- expose restricted information;
- infer protected characteristics;
- override the authoritative workflow.

## 18. Employer Portal Transition Boundary

Page 036 closes the Worker Portal. Page 037 begins the Employer Portal. Worker settings must not
create employer administration powers.

Page 036 must not allow an employer to:

- change worker security settings;
- change worker privacy settings;
- request deletion on the worker's behalf;
- access worker sessions;
- access private export requests;
- change worker consent;
- view restricted accessibility preferences;
- alter payment destinations;
- release holds;
- edit identity-linked information.

Employer Portal pages may receive only authorized, minimum-necessary worker information through
governed staffing workflows. Worker settings do not become employer controls.

## 19. Revised Mobile Priority

Mobile must prioritize:

1. security or account actions requiring immediate attention;
2. high-impact pending changes;
3. mandatory communication status;
4. privacy and visibility summaries;
5. export, deactivation, and deletion request state;
6. ordinary preferences.

Secondary panels should collapse by default. Destructive or high-impact actions require clear
confirmation, current-state review, and support/recovery paths.

## 20. Approval Criteria Resolution

| Approval criterion | Resolution |
| --- | --- |
| Page 036 remains a control surface rather than source of truth | Satisfied. |
| High-impact changes have additional protection | Satisfied. |
| Contact changes remain pending until verified | Satisfied. |
| Session and security states remain independent | Satisfied. |
| Mandatory notices cannot be improperly disabled | Satisfied. |
| Privacy and consent concepts remain separate | Satisfied. |
| Export access is governed | Satisfied. |
| Deactivation and deletion remain independent | Satisfied. |
| Retention and legal holds are truthful | Satisfied. |
| Payment settings remain outside Page 036 ownership | Satisfied. |
| Worker settings cannot create employer administrative access | Satisfied. |
| Auditability is complete | Satisfied. |
| AI cannot execute or complete high-impact changes | Satisfied. |
| No governance, privacy, security, or operational risk remains | Satisfied at wireframe level. |

## 21. Validation

| Requirement | Result |
| --- | --- |
| Frozen title remains Settings | Pass |
| Architecture Freeze unchanged | Pass |
| Epic 3 Planning unchanged | Pass |
| Pages 016-035 unchanged | Pass |
| Financial Boundary Review unchanged | Pass |
| No Page 037 files created | Pass |
| No implementation started | Pass |
| No React/frontend/backend/API/database work | Pass |
| No authentication implementation created | Pass |
| No session-management implementation created | Pass |
| No notification-provider implementation created | Pass |
| No privacy-export implementation created | Pass |
| No account-deletion implementation created | Pass |
| No consent-engine implementation created | Pass |
| No legal-hold implementation created | Pass |
| No AI settings implementation created | Pass |
| Unrelated app changes untouched | Pass |

## 22. Final Revision Status

```text
Page 036 - Settings
Revision 1: COMPLETE
Approval conditions: SATISFIED

Page 037 - Employer Dashboard
UNBLOCKED
NOT CREATED
```
