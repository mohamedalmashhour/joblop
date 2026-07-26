# Page 038 - Company Profile Wireframe Revision 1

Status: Revision 1 complete
Epic: Epic 4 - Employer Portal
Primary users: Employer, Administrator
Baseline wireframe: PAGE_038_COMPANY_PROFILE_LOW_FIDELITY_WIREFRAME.md
Owner decision: Approved with documented conditions
Implementation: Not authorized

## 1. Revision Summary

Revision 1 strengthens Company Profile governance without redesigning the page or changing the
frozen architecture, navigation, or approved Pages 001-037.

The revision focuses on:

- company identity governance;
- legal vs public profile separation;
- organization lifecycle;
- role-based permissions;
- verification governance;
- location governance;
- compliance boundaries;
- privacy and worker-facing visibility;
- auditability;
- AI boundaries;
- multi-organization readiness.

## 2. Organization Identity Model

Company Profile must clearly separate six identity layers.

| Layer | Meaning | Boundary |
| --- | --- | --- |
| Public company profile | Display name, logo, description, general service/workplace category | Not legal proof and not operational approval |
| Legal organization | Legal name, registered name, jurisdiction, legal address, authorized representative | Governed and verification-sensitive |
| Operational identity | Staffing contacts, scheduling contacts, finance contacts, operating sites | Used for day-to-day staffing workflows |
| Verified identity | Identity data confirmed through governed review | Does not authorize every service automatically |
| Employer-facing profile | Internal employer administration view | Permission-gated and not worker-visible by default |
| Worker-facing profile | Approved information shown to workers for assignments | Minimum necessary and restricted |

Required distinctions:

```text
Public profile
does not equal
Legal identity

Legal identity
does not equal
Verification

Verification
does not equal
Operational approval
```

## 3. Organization Lifecycle

Organization lifecycle states remain independent:

```text
Draft
↓
Submitted
↓
Verification
↓
Verified
↓
Restricted
↓
Suspended
↓
Active
↓
Deactivation requested
↓
Deactivated
↓
Closure requested
↓
Closed
```

No lifecycle state automatically implies another.

Required distinctions:

```text
Submitted
does not equal
Verified

Verified
does not equal
Active

Active
does not equal
Approved for every staffing category

Suspended
does not equal
Fraud proven

Closed
does not equal
Historical shifts, invoices, payments, audits, or legal records erased
```

## 4. Verification Governance

Verification must separate:

- submitted information;
- document review;
- verification;
- compliance review;
- approval;
- operational eligibility.

Required distinctions:

```text
Documents submitted
does not equal
Verified

Verified
does not equal
Approved for every service

Compliance review
does not equal
Operational eligibility

Operational eligibility
does not equal
Permanent approval
```

Verification states must include:

- not started;
- information required;
- submitted;
- document review;
- under review;
- more information required;
- verified;
- rejected;
- expired;
- suspended;
- unavailable.

Internal risk scores, fraud indicators, investigative notes, and restricted evidence must not be
exposed.

## 5. Public vs Restricted Information

The page must visibly separate:

| Visibility category | Examples |
| --- | --- |
| Worker-visible | Approved display name, workplace type, arrival guidance, assignment-specific location, authorized contact role |
| Public-visible | Approved public profile content where permitted |
| Employer administration | Operational contacts, organization status, pending changes, internal settings |
| Legal information | Legal name, jurisdiction, authorized representative, masked identifiers |
| Financial information | Billing/tax/payment links and masked status only |
| Compliance information | Summary statuses, document requirements, attention items |

Workers must never receive restricted organization data, including:

- legal registration numbers;
- tax identifiers;
- billing details;
- banking data;
- internal compliance notes;
- internal user roles;
- legal disputes;
- fraud or risk signals;
- legal-hold details.

## 6. Organization Roles

Roles are conceptual and permission-gated.

| Role | Typical scope | Boundary |
| --- | --- | --- |
| Owner | Organization-level authority where verified | Not automatically all platform powers |
| Administrator | Manage permitted organization settings | Not automatically legal representative |
| HR | Worker/application-related administration where permitted | Not billing/tax authority by default |
| Scheduler | Shift and staffing operations | Not legal, tax, or payment authority |
| Payroll | Payroll or timesheet-related visibility where permitted | Not worker payment control or employer legal identity |
| Finance | Billing and invoice access where permitted | Not compliance or worker management by default |
| Compliance | Compliance summaries and document statuses where permitted | Not fraud adjudication |
| Operations | Day-to-day staffing coordination | Not unrestricted organization administration |
| Read-only | View-only access | No edit authority |

Required distinction:

```text
Dashboard visibility
does not equal
Edit authority
```

## 7. Location Governance

Location categories:

- headquarters;
- operational sites;
- residences;
- inactive sites;
- restricted sites;
- pending sites.

Required distinction:

```text
Location listed
does not equal
Operationally approved
```

Location states:

- draft;
- submitted;
- pending verification;
- active;
- inactive;
- restricted;
- suspended;
- unavailable.

Locations may show worker-facing arrival guidance only when approved and operationally necessary.
Resident and patient information must never be exposed.

## 8. Change Governance

High-impact organization changes include:

- legal name;
- registration number;
- organization type;
- legal address;
- authorized representative;
- ownership or control;
- jurisdiction;
- primary billing entity;
- organization closure.

These changes conceptually require:

- stronger authorization;
- supporting evidence;
- review;
- verification;
- effective date;
- historical preservation;
- audit.

Required distinctions:

```text
Change requested
does not equal
Change effective

Evidence uploaded
does not equal
Change approved

Pending change
does not equal
Current verified record
```

## 9. Privacy and Restricted Data

Page 038 must not expose:

- worker documents;
- worker banking;
- tax data beyond authorized masked status or links;
- resident information;
- patient information;
- legal disputes;
- fraud indicators;
- legal-hold information;
- private staff notes;
- unrelated organization data.

Use minimum-necessary visibility, masking, role-based access, and support routing.

## 10. Compliance Boundary

Page 038 may show compliance summaries, action-required items, expiry/renewal warnings, and
support paths.

It must not own:

- legal compliance decisions;
- compliance adjudication;
- regulator integration;
- restricted evidence review;
- suspension adjudication;
- fraud investigation;
- document-storage retention.

Required distinctions:

```text
Compliance attention
does not equal
Noncompliance

Restriction
does not equal
Fraud proven

Document accepted
does not equal
Organization eligible for every service
```

## 11. Auditability

Audit history is conceptually required for:

- legal identity changes;
- verification;
- role-sensitive edits;
- organization status changes;
- operational contact changes;
- location status changes;
- compliance summary changes;
- worker-facing visibility changes;
- staff-assisted corrections.

Audit records should include:

- actor;
- role;
- timestamp;
- action;
- organization reference;
- prior state;
- resulting state;
- reason or case reference;
- result.

Do not log confidential document content, credentials, full tax identifiers, banking details, fraud
signals, or legal-hold details.

## 12. AI Boundary

AI may:

- explain company profile sections;
- summarize visible information;
- explain verification status;
- draft profile descriptions for human review;
- assist support requests;
- identify missing visible information.

AI must never:

- verify organizations;
- approve legal identity;
- approve compliance;
- publish legal changes;
- alter organization status;
- expose restricted information;
- infer fraud;
- create or remove organization roles;
- approve locations;
- treat submitted information as verified.

The authoritative organization record remains controlling.

## 13. Multi-Organization Boundary

Multi-organization readiness must separate:

- current organization;
- membership;
- role;
- pending membership;
- revoked membership.

Required distinctions:

```text
Same user
does not equal
Same permissions

Organization switch
does not equal
Shared data

Membership pending
does not equal
Access granted

Membership revoked
does not equal
Organization deleted
```

No organization switching is implemented. Cross-organization data leakage must be prevented.

## 14. Approval Criteria Resolution

| Approval criterion | Resolution |
| --- | --- |
| Legal and public identities remain separate | Satisfied. |
| Lifecycle states remain independent | Satisfied. |
| Verification remains truthful | Satisfied. |
| Employer roles are governed | Satisfied. |
| Worker-facing visibility is controlled | Satisfied. |
| Privacy boundaries are preserved | Satisfied. |
| Auditability is complete | Satisfied at wireframe level. |
| AI cannot approve or alter legal organization data | Satisfied. |
| No governance, compliance, privacy, or operational risks remain | Satisfied at wireframe level. |

## 15. Validation

| Requirement | Result |
| --- | --- |
| Frozen title remains Company Profile | Pass |
| Architecture Freeze unchanged | Pass |
| Employer Portal scope unchanged | Pass |
| Pages 001-037 unchanged | Pass |
| No Page 039 files created | Pass |
| No implementation started | Pass |
| No React/frontend/backend/API/database work | Pass |
| No verification implementation created | Pass |
| No billing implementation created | Pass |
| No document implementation created | Pass |
| No user-management implementation created | Pass |
| No commit, push, merge, or deployment | Pass |

## 16. Final Revision Status

```text
Page 038 - Company Profile
Revision 1: COMPLETE
Approval conditions: SATISFIED

Page 039 - Residences
UNBLOCKED
NOT CREATED
```
