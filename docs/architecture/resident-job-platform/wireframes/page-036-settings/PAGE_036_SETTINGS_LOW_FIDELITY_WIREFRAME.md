# Page 036 - Settings Low-Fidelity Wireframe

Status: Initial wireframe complete
Epic: Epic 3 - Worker Portal
Primary user: Authenticated worker
Secondary visibility: Support, Security, Privacy, Compliance, Administrator, and Super Administrator where role-permitted
Architecture baseline: Resident Job Architecture Phase 1 v1.0
Epic planning baseline: Epic 3 Worker Portal Planning v1.0
Documents baseline: Page 035 - Documents Approved Wireframe v1.0
Frozen architecture source: pages/PAGE_036_SETTINGS.md
Implementation: Not authorized

## 1. Frozen Page Confirmation

The frozen architecture page map defines:

| Page | Frozen title | Source |
| --- | --- | --- |
| 035 | Documents | pages/PAGE_035_DOCUMENTS.md |
| 036 | Settings | pages/PAGE_036_SETTINGS.md |
| 037 | Employer Dashboard | pages/PAGE_037_EMPLOYER_DASHBOARD.md |

No title inference, rename, or architecture amendment is introduced.

## 2. Page Purpose

Settings is the authenticated worker page for governing permitted account preferences, security
visibility, privacy controls, communication preferences, language and regional settings,
accessibility preferences, document/data permissions, sessions, export requests, account
deactivation, deletion requests, support, and legal information.

The page must not:

- become the source of truth for profile, payroll, documents, licences, messages, payments, or
  employer relationships;
- expose credentials or security secrets;
- allow silent high-impact changes;
- imply a requested change is immediately effective when review or provider synchronization is
  required;
- allow mandatory security or legal notices to be fully disabled;
- delete regulated records merely because an account is closed;
- guarantee data deletion where retention obligations apply;
- allow AI to change settings without explicit user action;
- combine unrelated account, employment, payment, and governance controls into one ambiguous form.

## 3. Settings Domain Model

Settings are grouped by domain, not presented as one undifferentiated page.

| Domain | Examples | Boundary |
| --- | --- | --- |
| Account | Display name, preferred name, contact information, account status | Does not own worker profile completeness |
| Security | Password, MFA, active sessions, trusted devices, recovery, security alerts | Does not own authentication provider |
| Privacy | Visibility, consent, data-sharing, privacy requests | Does not override legal/employer requirements |
| Communications | Message preferences, notification preferences, contact channels, quiet hours | Does not own Messages or Notifications |
| Language and region | Interface language, locale, timezone, date/time, currency display | Does not translate official records silently |
| Accessibility | Text size, reduced motion, contrast, screen-reader guidance, communication needs | Does not expose medical diagnosis |
| Data and account control | Export, correction, deactivation, deletion request, retention limits | Does not delete regulated records directly |
| Support and legal | Help, privacy, terms, accessibility statement, complaint/escalation path | Does not replace emergency procedures |

## 4. Source-of-Truth Boundary

Settings may route to authoritative workflows but must not replace them.

Examples:

- profile information -> Profile;
- professional information -> Professional Information;
- licences -> Licences;
- certifications -> Certifications;
- payment destination -> Payments;
- notification delivery -> Notifications;
- documents -> Documents;
- formal privacy request -> governed privacy workflow;
- account deletion -> governed account lifecycle workflow.

Required distinctions:

```text
Setting displayed
does not equal
Setting owned by Page 036

Preference submitted
does not equal
Preference effective

Account deletion requested
does not equal
All records immediately deleted
```

## 5. Independent Setting States

Settings must not collapse into one generic "Saved" status.

| State dimension | States |
| --- | --- |
| Edit state | View only, editable, editing, saving, saved, save failed, edit unavailable |
| Verification state | Not required, verification required, verification pending, verified, verification failed, verification unavailable |
| Effective state | Current, pending, scheduled, effective, rejected, superseded, unavailable |
| Security state | Secure, action recommended, action required, restricted, under review, unavailable |
| Request state | Not requested, requested, identity confirmation required, under review, approved, partially fulfilled, denied where legally permitted, completed, cancelled, unavailable |

## 6. Desktop Wireframe

```text
HEADER
Resident Job | Settings | Worker: [Name] | Security | Help

SETTINGS GOVERNANCE NOTICE
Settings route to governed account, security, privacy, notification, document, payment, and
account-lifecycle workflows.
Preference saved does not always mean immediately effective.
Deletion requested does not erase regulated records immediately.
AI cannot change settings.

CATEGORY NAVIGATION
[Account]
[Security]
[Privacy]
[Communications]
[Language & region]
[Accessibility]
[Data & account control]
[Support & legal]

SELECTED SETTINGS PANEL
- Current state
- Pending state
- Verification requirement
- Effective state
- Last updated
- Support path

ACCOUNT
Display name
Preferred name
Verified email
Verified phone
Account creation date
Account status
Last profile update
Contact-verification status

SECURITY
Password change
Password last changed
Multi-factor status
Recovery method status
Security-key/authenticator status where supported
Recent security activity
Active sessions and device controls

PRIVACY
Employer-visible profile information
Search/discoverability where applicable
Contact-information visibility
Rating visibility
Availability visibility
Consent records
Privacy request path

COMMUNICATIONS
Message preference summary
Notification preference summary
Permitted contact channels
Quiet hours summary
Links to Messages and Notifications

LANGUAGE AND REGION
Interface language
Preferred communication language
Locale
Timezone
Date/time/number formats
Currency display preference where relevant

ACCESSIBILITY
Text size
Reduced motion
High contrast
Screen-reader guidance
Keyboard-navigation guidance
Accessible communication preference

DATA AND ACCOUNT CONTROL
Data export request
Correction request
Account deactivation
Account deletion request
Retention and legal-hold limitations

SUPPORT AND LEGAL
Help
Privacy policy
Terms
Accessibility statement
Complaint/escalation path
```

## 7. Mobile Wireframe

```text
TOP BAR
Settings | Help

GOVERNANCE NOTICE COLLAPSED
Some changes require verification or review.

CATEGORY CARDS
Account
Security
Privacy
Communications
Language & region
Accessibility
Data and account control
Support and legal

SETTING DETAIL
Current value
Status
Pending change
Action
Support path
Confirmation for high-impact actions
```

Mobile prioritizes:

- clear categories;
- security alerts;
- action-required items;
- account and privacy status;
- concise current values;
- safe masking;
- large touch targets;
- confirmation before high-impact actions;
- visible support path;
- pending and failed states.

Avoid one extremely long unstructured form.

## 8. Account Information and Contact Changes

Safe fields:

- display name;
- preferred name;
- verified email;
- verified phone;
- account creation date;
- account status;
- last profile update;
- contact-verification status.

Do not expose internal database identifiers or sensitive account metadata unnecessarily.

Required distinctions:

```text
Contact information changed
does not equal
Contact verified

Contact verified
does not equal
Account recovery completed
```

High-impact contact changes conceptually require:

- current-session validation;
- reauthentication where governed;
- verification of the new destination;
- notification to prior destination where appropriate;
- effective-state confirmation;
- recovery path for unauthorized change.

```text
Change requested
↓
New destination verification pending
↓
Verified
↓
Effective
↓
Prior destination retired
```

Editing a field must not imply the authoritative account destination changed immediately.

## 9. Password, Authentication, Sessions, and Devices

Represent:

- password change;
- password last changed;
- multi-factor status;
- recovery method status;
- security-key or authenticator status where supported;
- recent security activity;
- session revocation;
- current session;
- other active sessions;
- approximate device type;
- approximate location where governed;
- last activity;
- session created;
- revoke action and revoke status.

Do not expose password contents, authentication secrets, recovery codes, full device fingerprints,
internal risk scores, precise tracking, or internal security telemetry.

Required distinctions:

```text
Password changed
does not equal
All sessions revoked unless explicitly stated

Multi-factor enabled
does not equal
Account immune from compromise

Approximate location
does not equal
Verified physical location

Session revoked
does not equal
Account password changed
```

## 10. Security Alerts

Security alert preferences or visibility may include:

- new sign-in alerts;
- password changes;
- multi-factor changes;
- recovery changes;
- payment-destination changes;
- session revocations.

Mandatory security alerts must not be fully disabled. Page 036 does not own notification delivery
infrastructure.

## 11. Privacy and Consent Governance

Configurable visibility is represented only where permitted:

- employer-visible profile information;
- public profile visibility where applicable;
- search visibility;
- contact-information visibility;
- rating visibility;
- availability visibility;
- document-status visibility.

Workers cannot override mandatory employer or legal visibility rules through simple settings.

Settings must not expose private documents, banking information, tax data, or restricted disputes
through visibility controls.

Consent records conceptually include:

- consent type;
- purpose;
- status;
- version;
- effective date;
- withdrawal availability;
- consequences of withdrawal;
- legal basis where withdrawal is unavailable.

Required distinctions:

```text
Consent withdrawn
does not equal
All historical processing erased

Preference
does not equal
Legal consent

Consent
does not equal
Contractual requirement
```

Optional marketing consent must remain separate from mandatory operational processing.

## 12. Notification and Messaging Boundaries

Page 036 may link to or summarize Page 034 notification preferences.

It must not duplicate or override Page 034 as the authoritative notification-preference experience.

Required distinctions:

```text
Preference saved
does not equal
Guaranteed delivery

Channel disabled
does not equal
Mandatory in-app notices disabled
```

Messaging controls may include:

- conversation availability;
- blocked or restricted contact status;
- message preview preference;
- support-contact availability;
- communication accessibility preference.

Settings must not create unrestricted user blocking that interferes with active shift, safety,
payment, or dispute workflows. Page 036 does not own messaging moderation.

## 13. Language, Region, and Accessibility

Language and region settings:

- interface language;
- preferred communication language;
- locale;
- timezone;
- date format;
- time format;
- number format;
- currency display preference where relevant.

Required distinctions:

```text
Interface language
does not equal
Official document language

Preferred language
does not equal
Guaranteed human support availability
```

Do not silently machine-translate authoritative records.

Accessibility preferences:

- text size;
- reduced motion;
- high contrast;
- screen-reader optimization;
- keyboard-navigation guidance;
- caption or transcription preference where future features support it;
- accessible communication preference.

Accessibility preferences must not be treated as medical diagnoses and must not be exposed broadly
to employers unless governed and necessary.

## 14. Data Export and Correction Requests

Data export request states:

- Available.
- Request submitted.
- Identity confirmation required.
- Preparing.
- Ready.
- Partially available.
- Expired.
- Failed.
- Restricted.
- Completed.

Required distinctions:

```text
Export requested
does not equal
Export immediately generated

Export ready
does not equal
Publicly accessible

Export completed
does not equal
Account deleted
```

Downloads conceptually require authenticated, time-limited access. No export implementation is
designed.

Correction requests separate:

- direct editable field;
- correction request;
- identity verification;
- document-supported correction;
- disputed information;
- completed correction.

Regulated or verified records must not silently change from a simple settings form.

## 15. Deactivation and Deletion Requests

Deactivation is separate from deletion.

Deactivation states:

- Active.
- Deactivation requested.
- Review required.
- Scheduled.
- Deactivated.
- Reactivation available.
- Reactivation restricted.
- Unavailable.

Required distinctions:

```text
Deactivated
does not equal
Deleted

Deactivated
does not equal
Financial or legal obligations removed

Deactivated
does not equal
Historical shifts or payments erased
```

Deletion request states:

- Not requested.
- Requested.
- Identity confirmation required.
- Under review.
- Retention obligations identified.
- Partially fulfilled.
- Approved.
- Scheduled.
- Completed.
- Denied where law permits.
- Cancelled.
- Unavailable.

Required distinctions:

```text
Deletion requested
does not equal
Immediate deletion

Deletion completed
does not equal
Every regulated record erased

Account deleted
does not equal
Audit, payroll, tax, dispute, fraud, safety, or legal-hold records deleted where retention is required
```

No deletion implementation is designed.

## 16. Retention and Legal-Hold Boundary

Some records may remain after deactivation or deletion because of:

- payroll requirements;
- tax obligations;
- employment records;
- dispute preservation;
- fraud review;
- safety investigation;
- regulatory requirement;
- legal hold;
- audit obligations.

Do not expose confidential hold details unnecessarily.

No user-facing setting may release a hold.

## 17. Payment, Banking, and Employer Boundaries

Settings may route to the governed payment-destination experience but must not display or edit:

- full bank account numbers;
- routing details;
- payment credentials;
- employer billing information;
- platform financial configuration.

Payment-destination changes retain their separate verification and security process. Page 036 does
not own payment setup.

Settings may show current employer relationships, relationship status, visibility or communication
controls where governed, and support path.

Workers cannot erase completed employment records or financial obligations through settings. Do not
expose internal employer notes or unrelated employer data.

## 18. Support and Escalation

Support paths:

- account access issue;
- privacy request;
- security concern;
- accessibility issue;
- data correction;
- account deactivation;
- account deletion;
- unauthorized setting change.

Ordinary support messaging is not emergency response.

## 19. Staff Access and Auditability

Staff access to or changes involving contact information, identity-linked settings, privacy
requests, account deletion, security recovery, session actions, consent records, sensitive
accessibility preferences, or restricted settings must conceptually preserve:

- actor;
- role;
- action;
- setting or request reference;
- reason or case reference;
- timestamp;
- prior state;
- resulting state.

Credentials and sensitive values must not be placed in broad logs.

## 20. High-Impact Change Protection

High-impact settings:

- primary email;
- phone number;
- password;
- multi-factor method;
- recovery destination;
- payment destination;
- account deletion;
- data export;
- legal name where verified;
- identity-linked information.

Possible protections:

- reauthentication;
- second-factor confirmation;
- destination verification;
- notification to prior contact;
- cooling-off period where governed;
- support review;
- account-recovery path.

No protection implementation is designed.

## 21. AI Boundary

AI may:

- explain settings;
- explain state terminology;
- help locate the correct governed workflow;
- summarize visible privacy preferences;
- help draft a support or correction request;
- explain consequences using approved policy text.

AI must not:

- change settings;
- submit requests without explicit user action;
- disable mandatory notices;
- change security methods;
- revoke sessions;
- export data;
- delete or deactivate accounts;
- alter consent;
- release legal holds;
- change payment information;
- fabricate completion status;
- expose restricted information;
- infer protected characteristics.

The governed setting or request record remains authoritative.

## 22. Empty and Error States

Required states:

- setting unavailable;
- save failed;
- verification pending;
- verification failed;
- preference unavailable;
- session list unavailable;
- security action failed;
- export unavailable;
- deletion request unavailable;
- account restriction active;
- support unavailable;
- stale settings;
- service unavailable.

Do not fabricate successful changes.

## 23. Accessibility

The page must support:

- semantic headings;
- keyboard navigation;
- screen-reader-friendly controls;
- accessible validation;
- clear confirmation dialogs;
- non-color-only state indicators;
- accessible session controls;
- accessible privacy controls;
- clear destructive-action language;
- focus management;
- sufficient contrast;
- reduced-motion compatibility;
- plain-language explanations.

## 24. International Readiness

The page must not hardcode:

- language;
- locale;
- timezone;
- date or time format;
- legal name structure;
- phone format;
- address model;
- consent model;
- privacy-right terminology;
- deletion rights;
- export deadlines;
- retention obligations;
- accessibility model;
- authentication method;
- mandatory-notice rules;
- employer relationship model.

Jurisdiction, locale, employer, worker classification, security policy, consent policy, retention
policy, and account-lifecycle policy remain configurable.

## 25. Future Boundary

Page 036 does not own:

- identity verification;
- authentication provider;
- notification delivery;
- messaging engine;
- payment system;
- document storage;
- data-export engine;
- deletion engine;
- consent engine;
- legal-hold engine;
- payroll;
- tax;
- employer records;
- fraud adjudication;
- security-risk scoring.

It provides governed controls, visibility, and entry points only.

## 26. Self Validation

| Requirement | Result |
| --- | --- |
| Frozen title remains Settings | Pass |
| Architecture Freeze unchanged | Pass |
| Epic 3 Planning unchanged | Pass |
| Pages 016-035 unchanged | Pass |
| Financial Boundary Review unchanged | Pass |
| No Page 037 files created | Pass |
| No approval record created | Pass |
| No implementation started | Pass |
| No React/frontend/backend/API/database work | Pass |
| No authentication implementation created | Pass |
| No session-management implementation created | Pass |
| No notification-provider implementation created | Pass |
| No privacy-export implementation created | Pass |
| No account-deletion implementation created | Pass |
| No legal-hold implementation created | Pass |
| No AI settings implementation created | Pass |
| Unrelated app changes untouched | Pass |

## 27. Final Wireframe Status

```text
Page 036 - Settings
Wireframe: COMPLETE
Product Review: REQUIRED
Approval Record: NOT CREATED

Page 037 - Employer Dashboard
BLOCKED
```
