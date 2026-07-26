# Page 038 - Company Profile Low-Fidelity Wireframe

Status: Initial wireframe complete
Epic: Epic 4 - Employer Portal
Primary users: Employer, Administrator
Secondary users: Support, Finance, Compliance, Super Administrator where role-permitted
Architecture baseline: Resident Job Architecture Phase 1 v1.0
Frozen architecture source: pages/PAGE_038_COMPANY_PROFILE.md
Preceding baseline: Page 037 - Employer Dashboard Approved Wireframe v1.0
Implementation: Not authorized

## 1. Frozen Page Confirmation

The frozen architecture page map defines:

| Page | Frozen title | Source |
| --- | --- | --- |
| 037 | Employer Dashboard | pages/PAGE_037_EMPLOYER_DASHBOARD.md |
| 038 | Company Profile | pages/PAGE_038_COMPANY_PROFILE.md |
| 039 | Residences | pages/PAGE_039_RESIDENCES.md |

Page 038 remains an Employer Portal page. It must not inherit worker-profile assumptions and must
not expose worker-private, resident, patient, banking, tax, legal, or internal risk information.

## 2. Page Purpose

Company Profile lets authorized employer-side users view and manage permitted organization
information while understanding legal identity, verification, visibility, compliance, billing,
tax, document, location, support, and role-management boundaries.

The page allows authorized users to:

- view and manage permitted organization information;
- understand organization verification status;
- manage approved public and operational details;
- distinguish legal identity from display information;
- view or route to locations and operating sites where permitted;
- view compliance and document requirements;
- understand which information is visible to workers;
- access governed billing, tax, user-management, and support workflows;
- understand pending changes, verification requirements, restrictions, and history.

The page must not:

- become the source of truth for billing, payroll, tax, users, shifts, documents, compliance, or payments;
- expose confidential corporate, banking, tax, identity, worker, resident, or patient information broadly;
- allow any employer user to modify legal or verified organization information;
- treat submitted information as verified;
- treat verification as authorization for every service or jurisdiction;
- silently overwrite historical organization information;
- allow AI to approve or alter legal organization records;
- combine public profile content with restricted legal and financial records in one ambiguous form.

## 3. Company Information Domains

The page is organized by domain, not as one undifferentiated form.

| Domain | Examples | Boundary |
| --- | --- | --- |
| Public profile | Display name, logo, description, industry or residence type, general service area, approved public contact | Does not expose restricted legal, tax, billing, or staffing-risk information |
| Legal organization identity | Legal name, registered name, masked registration number, jurisdiction, organization type, legal address, authorized representative | Requires verification and stronger authorization for changes |
| Operational information | Primary location, additional sites, staffing contact, scheduling contact, compliance contact, finance contact | Routes to location/contact workflows where needed |
| Verification and compliance | Organization verification, required documents, pending review, expiry, renewal, restrictions | Summarizes only; does not adjudicate compliance |
| Worker-facing information | Employer name shown to workers, workplace description, arrival guidance, address visibility, contact-role visibility, accessibility information | Shows only approved operational information |
| Restricted administration | Billing setup, tax information, banking or payment method, user/role management, legal notices, account closure | Routes to governed workflows; not editable as ordinary profile fields |

## 4. Source-of-Truth Boundary

Page 038 is a governed control surface. It may display or route to authoritative workflows, but it
does not own all underlying records.

Authoritative workflows may include:

- organization verification;
- legal-information review;
- billing;
- tax;
- payment method;
- document management;
- user and role management;
- compliance;
- location management;
- support.

Required distinctions:

```text
Displayed on Page 038
does not equal
Owned by Page 038

Submitted
does not equal
Verified

Verified
does not equal
Active for every service

Saved
does not equal
Effective across all downstream workflows
```

## 5. Independent Company States

Company Profile must not collapse unrelated states into a single "Active" or "Verified" badge.

| State dimension | States |
| --- | --- |
| Edit state | View only, editable, editing, saving, saved, save failed, edit unavailable |
| Verification state | Not started, required, submitted, under review, more information required, verified, failed, expired, unavailable |
| Effective state | Draft, pending, scheduled, effective, restricted, suspended, superseded, unavailable |
| Publication state | Private, worker-visible, public where permitted, restricted, publication pending, removed from public view |
| Compliance state | Compliant, attention required, action required, restricted, suspended, status unavailable |

## 6. Desktop Wireframe

```text
HEADER
Resident Job | Company Profile | Organization: [Selected organization]
Role: [Employer / Administrator] | Verification | Support

GOVERNANCE NOTICE
Company Profile separates public display, legal identity, operational contacts, verification,
worker-facing information, and restricted administration.
Submitted information is not verified until the governed review completes.
AI cannot approve legal identity, compliance, billing, tax, or organization status.

CATEGORY NAVIGATION
[Overview]
[Public profile]
[Legal identity]
[Operational contacts]
[Locations]
[Verification & compliance]
[Worker-facing preview]
[Restricted administration]
[History & support]

OVERVIEW PANEL
- Organization display name
- Legal identity status
- Verification status
- Publication status
- Compliance attention
- Pending changes
- Restricted actions
- Support path

PUBLIC PROFILE
- Display name
- Logo status
- Short description
- Organization category / workplace type
- General service area
- Approved public contact method
- Worker-facing summary

LEGAL ORGANIZATION IDENTITY
- Legal organization name
- Registered business name
- Organization type
- Masked registration/incorporation number
- Jurisdiction
- Legal address
- Authorized representative
- Effective date
- Verification status
- Last verified date
- Change request path

OPERATIONAL INFORMATION
- Primary operating location
- Staffing contact
- Scheduling contact
- Compliance contact
- Payroll or finance contact
- Support/escalation contact

LOCATIONS AND SITES
- Headquarters
- Primary workplace
- Additional residence or facility
- Active / inactive / pending / restricted status
- Worker-facing arrival guidance
- Accessibility information where governed

VERIFICATION AND COMPLIANCE
- Organization verification lifecycle
- Required documents
- Document status summary
- Compliance reminders
- Expiry or renewal items
- Restrictions
- Support path

WORKER-FACING PREVIEW
- Employer name shown to workers
- Approved logo
- Workplace type
- Assignment-specific location visibility
- Arrival guidance
- Authorized contact role
- Accessibility information
- Visibility warnings

RESTRICTED ADMINISTRATION LINKS
- Billing setup
- Tax information
- Payment method
- User and role management
- Legal notices
- Organization closure request

CHANGE HISTORY AND SUPPORT
- Current value
- Prior value
- Pending change
- Effective date
- Actor
- Reason
- Verification impact
- Audit reference
- Correction/support path
```

## 7. Mobile Wireframe

```text
TOP BAR
Company Profile | Organization selector | Support

STATUS SUMMARY
Verification status
Action-required items
Pending changes
Restricted status

PROFILE SECTIONS
Public profile
Legal identity summary
Operational contacts
Locations
Verification & compliance
Worker-facing preview
Restricted administration
History & support

DETAIL PANEL
Current value
Visibility
State
Owner
Required action
Support path
```

Mobile priorities:

- organization summary;
- verification status;
- action-required items;
- public profile;
- legal information summary;
- operational contacts;
- locations;
- compliance summary;
- support path;
- clear edit permissions;
- large touch targets;
- safe masking.

Avoid one long unstructured form.

## 8. Legal Identity Governance

Safe legal-identity fields:

- legal organization name;
- registered business name;
- organization type;
- masked registration or incorporation number where appropriate;
- incorporation or registration jurisdiction;
- legal address;
- authorized representative;
- effective date;
- verification status;
- last verified date.

Required distinctions:

```text
Legal information submitted
does not equal
Legal identity verified

Legal identity verified
does not equal
Employer authorized for every jurisdiction or staffing category
```

Full legal identifiers must not be exposed unnecessarily. Changes to legal identity require stronger
authorization and governed review.

## 9. Display Profile and Media

Display profile fields:

- display name;
- logo;
- short description;
- organization category;
- service or workplace type;
- general location;
- public contact method where permitted;
- worker-facing summary;
- accessibility or arrival guidance where approved.

Public content must not expose:

- resident names;
- patient details;
- internal staffing gaps;
- private phone numbers;
- internal email addresses;
- billing or tax information;
- legal disputes;
- restricted compliance information.

Logo or media upload is future-governed and may show:

- upload available;
- upload pending;
- review pending;
- approved;
- rejected;
- removed;
- unavailable.

Do not imply uploaded media is immediately public. No storage implementation is designed.

## 10. Organization Verification Lifecycle

Represent a governed lifecycle:

```text
Verification not started
↓
Information required
↓
Documents requested
↓
Submitted
↓
Under review
↓
Additional information required
↓
Verified, rejected, expired, suspended, or unavailable
```

Required distinctions:

```text
Documents uploaded
does not equal
Organization verified

Organization verified
does not equal
Eligible for every staffing service

Verification suspended
does not equal
Fraud proven
```

Do not expose internal risk scores or investigative notes.

## 11. Authorized Representatives and Roles

Represent separate concepts:

- organization owner;
- authorized legal representative;
- administrator;
- operational contact;
- billing contact;
- compliance contact;
- scheduler;
- read-only user.

Required distinctions:

```text
Organization user
does not equal
Authorized representative

Administrator
does not equal
Authorized to change legal identity

Billing contact
does not equal
Authorized to manage workers or compliance
```

Page 038 may link to user and role management but does not implement it.

## 12. Role-Based Edit Permissions

Conceptual permission surfaces:

| Action | Permission posture |
| --- | --- |
| Edit public profile | Role and organization gated |
| Edit operational contacts | Role and organization gated |
| Request legal-information changes | Stronger authorization required |
| View verification status | Role and sensitivity gated |
| Manage locations | Role and organization gated |
| View compliance summaries | Role and sensitivity gated |
| Access billing links | Finance/authorized role gated |
| Access user-management links | Administrator/authorized role gated |
| Request organization closure | High-impact authority gated |

Dashboard visibility must not imply edit authority.

## 13. Change Governance and Versioning

High-impact organization changes include:

- legal name;
- registration number;
- organization type;
- legal address;
- authorized representative;
- ownership or control;
- primary billing entity;
- jurisdiction;
- account closure.

These changes conceptually require:

- stronger authorization;
- reauthentication;
- supporting documents;
- review;
- prior-value preservation;
- effective date;
- audit event;
- support path.

Required distinctions:

```text
Change requested
does not equal
Change effective

Saved draft
does not equal
Verified legal record updated

Superseded
does not equal
Deleted

Current
does not equal
Verified

Pending
does not equal
Effective
```

Version and history must preserve current value, prior value, pending change, effective date,
actor, reason, verification impact, superseded state, and audit history.

## 14. Locations and Sites

Location concepts:

- headquarters;
- primary workplace;
- additional residence or facility;
- active location;
- inactive location;
- pending verification;
- restricted location;
- location unavailable.

Each site may include:

- display name;
- address;
- timezone;
- contact role;
- operating status;
- worker-facing arrival guidance;
- accessibility information;
- compliance status.

Do not expose resident or patient information. No location-management implementation is designed.

## 15. Worker-Facing Visibility

Workers may see only approved operational information, such as:

- employer display name;
- approved logo;
- workplace type;
- general or assignment-specific location;
- approved arrival instructions;
- authorized contact role;
- accessibility information;
- relevant compliance status where governed.

Workers must not see:

- legal registration numbers;
- tax identifiers;
- billing details;
- banking data;
- internal compliance notes;
- internal user roles;
- organization disputes;
- fraud or risk signals.

## 16. Compliance, Billing, Tax, Payment, and Documents Boundaries

Company Profile may summarize or route to governed workflows.

It must not own:

- licence verification;
- legal compliance decisions;
- document review engine;
- background-check provider;
- regulator integration;
- suspension adjudication;
- billing setup;
- tax compliance;
- banking or payment credentials;
- worker payment details;
- document storage;
- document versioning;
- retention;
- legal holds.

Required distinctions:

```text
Billing setup submitted
does not equal
Payment method verified

Payment method verified
does not equal
Invoice paid

Tax information provided
does not equal
Tax compliance confirmed

Document submitted
does not equal
Document accepted
```

Do not expose full bank account information, full card details, tax credentials, payroll records,
worker payment details, internal platform margin, provider secrets, or full sensitive documents.

## 17. Organization Status

Represent:

- active;
- pending verification;
- restricted;
- suspended;
- deactivation requested;
- deactivated;
- closure requested;
- closed where permitted;
- status unavailable.

Required distinctions:

```text
Restricted
does not equal
Closed

Suspended
does not equal
Fraud proven

Deactivated
does not equal
Historical shifts, invoices, payments, or legal records erased
```

No organization closure implementation is designed.

## 18. Multi-Organization Boundary

If one user may belong to multiple organizations, represent conceptually:

- current organization;
- organization switch;
- role per organization;
- access unavailable;
- membership pending;
- membership revoked.

Required distinction:

```text
Same user
does not equal
Same permission across organizations
```

No organization-switching implementation is designed. Cross-organization data leakage must be
prevented.

## 19. Privacy Boundary

The page must not expose:

- worker personal information;
- resident or patient data;
- banking details;
- tax identifiers;
- private legal documents;
- internal risk signals;
- fraud investigations;
- legal-hold details;
- private staff notes;
- unrelated organization data.

Use minimum-necessary display, safe masking, and permission-specific visibility.

## 20. Staff Access and Auditability

Conceptually require auditability for:

- legal identity access;
- legal-information changes;
- verification decisions;
- organization status changes;
- restricted-document access;
- role-sensitive profile changes;
- organization closure requests;
- staff-assisted corrections.

Audit records should include:

- actor;
- role;
- action;
- organization reference;
- prior state;
- resulting state;
- reason or case reference;
- timestamp;
- result.

Do not log confidential document content or credentials.

## 21. Support and Correction

Provide governed paths for:

- incorrect company information;
- legal-name change;
- address change;
- verification issue;
- restricted organization status;
- unauthorized profile change;
- location correction;
- accessibility correction;
- organization closure request.

Ordinary profile edits must not bypass formal correction or verification workflows.

## 22. AI Boundary

AI may:

- explain profile sections;
- explain verification states;
- summarize visible company information;
- help draft approved public descriptions;
- help locate the correct governed workflow;
- help draft support or correction requests.

AI must never:

- verify an organization;
- approve legal information;
- change legal identity;
- approve compliance;
- alter organization status;
- create or remove authorized representatives;
- change billing or tax information;
- expose restricted information;
- fabricate organization metrics;
- infer fraud;
- publish changes without explicit authorized action.

The authoritative organization record remains controlling.

## 23. Empty and Error States

Required states:

- profile unavailable;
- verification unavailable;
- edit unavailable;
- save failed;
- pending change;
- change rejected;
- location unavailable;
- restricted organization;
- document action required;
- support unavailable;
- stale profile;
- service unavailable.

Do not fabricate organization information.

## 24. Accessibility

The page must support:

- semantic headings;
- keyboard navigation;
- accessible edit controls;
- accessible status labels;
- no color-only verification states;
- readable legal and operational distinctions;
- accessible logo-upload placeholder;
- clear error messages;
- focus management;
- sufficient contrast;
- plain-language support paths;
- accessible worker-facing preview.

## 25. International Readiness

The page must not hardcode:

- organization type;
- legal-name structure;
- registration number format;
- business registry;
- jurisdiction;
- address model;
- verification method;
- compliance terminology;
- tax identifier;
- site type;
- worker-facing visibility rules;
- closure rules;
- retention requirements;
- language;
- date format;
- timezone.

Jurisdiction, organization type, employer category, locale, verification policy, access policy, and
compliance policy remain configurable.

## 26. Future Boundary

Page 038 does not own:

- organization verification engine;
- document storage;
- object storage;
- billing;
- tax;
- banking;
- payments;
- user and role management;
- location-management engine;
- compliance adjudication;
- fraud engine;
- legal-hold engine;
- organization closure;
- notification delivery.

It provides governed visibility, controls, and routing only.

## 27. Self Validation

| Requirement | Result |
| --- | --- |
| Frozen title remains Company Profile | Pass |
| Architecture Freeze unchanged | Pass |
| Employer Portal scope unchanged | Pass |
| Pages 001-037 unchanged | Pass |
| No Page 039 files created | Pass |
| No approval record created | Pass |
| No implementation started | Pass |
| No React/frontend/backend/API/database work | Pass |
| No verification implementation created | Pass |
| No document-storage implementation created | Pass |
| No billing or tax implementation created | Pass |
| No user-management implementation created | Pass |
| No location-management implementation created | Pass |
| No legal-hold implementation created | Pass |
| No AI company-profile implementation created | Pass |
| Unrelated app changes untouched | Pass |

## 28. Final Wireframe Status

```text
Page 038 - Company Profile
Wireframe: COMPLETE
Product Review: REQUIRED
Approval Record: NOT CREATED

Page 039 - Residences
BLOCKED
```
