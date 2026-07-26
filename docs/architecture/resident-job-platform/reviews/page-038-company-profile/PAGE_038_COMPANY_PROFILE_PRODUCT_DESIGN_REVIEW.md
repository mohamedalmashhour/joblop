# Page 038 - Company Profile Product Design Review

Status: Product review complete
Page: 038 - Company Profile
Epic: Epic 4 - Employer Portal
Reviewed artifact: PAGE_038_COMPANY_PROFILE_LOW_FIDELITY_WIREFRAME.md
Implementation: Not authorized

## 1. Executive Summary

The Page 038 Company Profile wireframe creates a governed employer organization profile experience
that separates public display, legal identity, operational contacts, verification, compliance,
worker-facing information, and restricted administration. It treats Page 038 as a control surface,
not the source of truth for billing, tax, user management, documents, compliance, payments, or
organization verification.

The page is ready for owner review. No approval record is created at this stage, and Page 039
remains blocked.

Recommendation:

```text
APPROVE WITH OWNER REVIEW
```

## 2. Strengths

- Clear separation between public profile, legal identity, operational contacts, verification,
  worker-facing information, and restricted administration.
- Strong source-of-truth language prevents Page 038 from owning billing, tax, documents,
  compliance, user management, payments, or verification engines.
- Independent edit, verification, effective, publication, and compliance states avoid ambiguous
  "Active" or "Verified" claims.
- Legal identity is safely represented with masking, verification status, and change-request
  governance.
- Public profile content cannot expose resident names, patient details, internal staffing gaps,
  legal disputes, billing, tax, or restricted compliance information.
- Logo/media handling is correctly treated as a future governed capability, not immediate public
  publication.
- Organization verification lifecycle is truthful and avoids treating document upload as
  verification.
- Authorized representative, administrator, billing contact, compliance contact, scheduler, and
  read-only user roles remain distinct.
- Role visibility does not imply edit authority.
- Versioning and history protect prior values and pending changes.
- Locations and sites are conceptual and do not expose resident or patient information.
- Worker-facing preview is minimum-necessary and excludes legal identifiers, tax identifiers,
  billing, banking, disputes, and internal risk signals.
- Compliance, billing, tax, payment, and documents are summarized or routed only.
- Organization status remains truthful and avoids implying fraud or record erasure.
- Multi-organization boundaries are explicit.
- Staff access and high-impact changes require auditability conceptually.
- AI cannot verify, approve, publish, alter legal records, change billing/tax, or infer fraud.

## 3. Weaknesses

### 3.1 Employer Permission Model Requires Later Precision

The wireframe correctly describes role-based edit permissions, but later employer pages and
engineering must define exact permission grants, organization roles, and approval rules.

Classification: Future implementation governance condition, not wireframe defect.

### 3.2 Verification and Compliance Need Source Contracts Later

The page summarizes verification and compliance status without implementing them. Future
engineering must define source contracts, update cadence, status definitions, and audit events.

Classification: Future implementation condition.

### 3.3 Legal and Tax Language Requires Qualified Review Before Launch

The wireframe stays country-neutral and avoids final legal/tax claims. Launch content and workflow
language will require qualified legal/tax review before production use.

Classification: Future launch governance condition.

## 4. Risk Review

| Risk | Severity | Review |
| --- | --- | --- |
| Public and legal information mixed | Critical | Avoided. |
| Any organization user can alter legal identity | Critical | Avoided through stronger authorization and role gates. |
| Submitted information treated as verified | Critical | Avoided. |
| Verification treated as universal service authorization | Critical | Avoided. |
| Sensitive corporate or worker data exposed | Critical | Avoided. |
| Prior verified values silently overwritten | Critical | Avoided through version/history model. |
| Role visibility treated as edit authority | High | Avoided. |
| Organization switching leaks data | Critical | Avoided conceptually. |
| Staff access unaudited | High | Auditability required. |
| AI verifies, approves, publishes, or changes legal records | Critical | Avoided. |
| Page 038 becomes authoritative for billing/tax/documents/users/compliance | Critical | Avoided. |
| Worker-facing preview exposes restricted information | Critical | Avoided. |
| Organization status implies fraud or erased history | High | Avoided. |

## 5. Scorecard

| Category | Score |
| --- | ---: |
| Domain separation | 9.9 |
| Source-of-truth clarity | 10.0 |
| Independent states | 9.9 |
| Legal identity governance | 9.8 |
| Public profile privacy | 10.0 |
| Verification truthfulness | 10.0 |
| Role and permission separation | 9.7 |
| High-impact change protection | 9.8 |
| Versioning and history | 9.8 |
| Locations and sites | 9.6 |
| Worker-facing visibility | 10.0 |
| Compliance boundary | 9.8 |
| Financial boundary | 10.0 |
| Document boundary | 9.8 |
| Organization-status truthfulness | 9.8 |
| Multi-organization isolation | 9.7 |
| Auditability | 9.8 |
| AI governance | 10.0 |
| Mobile usability | 9.6 |
| Accessibility | 9.7 |
| International readiness | 9.9 |
| Consistency with Page 037 | 9.9 |
| Readiness for future employer pages | 9.7 |
| Overall score | 9.8 |

## 6. Product Review Findings

| Review area | Result |
| --- | --- |
| Domain separation | Pass |
| Source-of-truth clarity | Pass |
| Independent states | Pass |
| Legal identity governance | Pass |
| Public profile privacy | Pass |
| Verification truthfulness | Pass |
| Role and permission separation | Pass |
| High-impact change protection | Pass |
| Versioning | Pass |
| Locations | Pass |
| Worker-facing visibility | Pass |
| Compliance boundary | Pass |
| Financial boundary | Pass |
| Document boundary | Pass |
| Organization-status truthfulness | Pass |
| Multi-organization isolation | Pass |
| Auditability | Pass |
| AI governance | Pass |
| Mobile usability | Pass |
| Accessibility | Pass |
| International readiness | Pass |
| Consistency with Page 037 | Pass |
| Readiness for future employer pages | Pass |

## 7. Required Improvements

No required wireframe corrections are identified at this review stage.

Future pages should continue validating:

- exact organization permissions;
- site/location ownership;
- billing and tax routing;
- document and compliance-source contracts;
- user-management boundaries;
- organization status and closure governance;
- worker-facing visibility.

These are future consistency checks, not Page 038 blockers.

## 8. Governance Review

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

## 9. Recommendation

```text
APPROVE WITH OWNER REVIEW
```

Page 038 is structurally sound and ready for owner review. It preserves employer-portal boundaries,
worker privacy, legal-identity governance, verification truthfulness, financial separation,
auditability, and AI limits.

## 10. Final Review Status

```text
Page 038 - Company Profile
Wireframe: COMPLETE
Product Review: COMPLETE
Approval Record: NOT CREATED
Owner Review: REQUIRED

Page 039 - Residences
BLOCKED
```
