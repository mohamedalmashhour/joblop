# Page 039 - Residences Product Design Review

Status: Product review complete
Page: 039 - Residences
Epic: Epic 4 - Employer Portal
Reviewed artifact: PAGE_039_RESIDENCES_LOW_FIDELITY_WIREFRAME.md
Implementation: Not authorized

## 1. Executive Summary

The Page 039 Residences wireframe creates a governed Employer Portal experience for viewing and
managing residence or operating-facility records without becoming a clinical record, resident
registry, scheduling engine, staffing engine, compliance adjudication surface, document repository,
billing system, or incident-management system.

The design separates residence identity, location/contact, worker-facing information, operational
status, compliance, and restricted administration. It protects resident and patient information,
keeps staffing summaries non-authoritative, limits worker-facing visibility to approved operational
details, and prevents AI from activating, suspending, verifying, publishing, assigning, or inferring
resident needs.

Recommendation:

```text
APPROVE WITH OWNER REVIEW
```

No approval record is created at this stage. Page 040 remains blocked.

## 2. Strengths

- Residence identity, location, worker-facing information, operational information, compliance, and
  restricted administration are clearly separated.
- Source-of-truth boundaries prevent Page 039 from owning shifts, staffing, compliance, documents,
  billing, users, incidents, or clinical records.
- Independent record, verification, operational, publication, and compliance states avoid a vague
  generic "Active" status.
- Residence record placeholders are safe and avoid confidential resident-level information.
- Residence types remain configurable and are not confused with licence status or permission to
  offer services.
- Role-based access avoids treating organization membership as access to every residence.
- Residence creation is represented as a future governed lifecycle, not implemented.
- Address/location governance prevents exposure of resident rooms, medical units, security codes,
  and sensitive access instructions.
- Worker-facing visibility is strictly minimum necessary.
- Staffing summaries are clearly non-authoritative and do not replace scheduling or attendance.
- Compliance and document status are summarized without exposing restricted evidence.
- Contacts are role-specific and do not grant universal authority.
- High-impact status changes require authorization, reason, evidence where required, effective
  date, prior-state preservation, audit, and support/review path.
- Multi-residence isolation prevents cross-site data leakage.
- Resident and patient information boundaries are explicit.
- Safety/incident details are protected.
- Billing stays routed to governed workflows.
- AI boundaries are strong and consistent with prior Employer Portal pages.

## 3. Weaknesses

### 3.1 Residence Permission Model Requires Later Detail

The wireframe identifies role and residence boundaries, but future employer pages and engineering
must define exact residence-level permissions, role inheritance, and organization-wide override
rules.

Classification: Future implementation governance condition, not wireframe defect.

### 3.2 Location and Compliance Sources Need Future Contracts

The page summarizes location, verification, staffing, and compliance states. Later implementation
must define exact source contracts, refresh cadence, status definitions, and audit behavior.

Classification: Future implementation condition.

### 3.3 Sensitive Arrival Guidance Needs Operational Policy

The wireframe correctly warns against exposing sensitive access instructions broadly. Future
operations must define what arrival guidance is safe for worker visibility and when it appears only
after confirmed assignment.

Classification: Future operational policy condition.

## 4. Risk Review

| Risk | Severity | Review |
| --- | --- | --- |
| Residence management exposes resident or patient information | Critical | Avoided. |
| Listed residence treated as verified or active | Critical | Avoided. |
| Organization membership grants access to every residence | Critical | Avoided. |
| Worker preview exposes restricted operational details | Critical | Avoided. |
| Staffing summaries become authoritative staffing records | Critical | Avoided. |
| Status changes lack authorization or audit history | Critical | Avoided conceptually. |
| Prior location information silently overwritten | High | Avoided through version/history model. |
| Staff access unaudited | High | Auditability required. |
| AI activates, suspends, verifies, publishes, or assigns staffing | Critical | Avoided. |
| Page 039 becomes source of truth for shifts, compliance, documents, billing, or incidents | Critical | Avoided. |
| Safety or incident details leak through residence summary | Critical | Avoided. |
| Billing details or payroll information leak | Critical | Avoided. |

## 5. Scorecard

| Category | Score |
| --- | ---: |
| Residence-domain separation | 9.9 |
| Source-of-truth clarity | 10.0 |
| State separation | 9.9 |
| Role-based access | 9.7 |
| Creation lifecycle | 9.8 |
| Location governance | 9.8 |
| Worker-facing visibility | 10.0 |
| Staffing truthfulness | 9.9 |
| Service and role coverage | 9.7 |
| Compliance boundary | 9.9 |
| Document boundary | 9.9 |
| Contact governance | 9.8 |
| High-impact status changes | 9.8 |
| Versioning | 9.8 |
| Multi-residence isolation | 9.9 |
| Resident-information protection | 10.0 |
| Safety boundary | 9.9 |
| Billing boundary | 10.0 |
| Auditability | 9.8 |
| AI governance | 10.0 |
| Mobile usability | 9.6 |
| Accessibility | 9.7 |
| International readiness | 9.9 |
| Consistency with Pages 037-038 | 9.9 |
| Readiness for future employer staffing pages | 9.7 |
| Overall score | 9.8 |

## 6. Product Review Findings

| Review area | Result |
| --- | --- |
| Residence-domain separation | Pass |
| Source-of-truth clarity | Pass |
| State separation | Pass |
| Role-based access | Pass |
| Creation lifecycle | Pass |
| Location governance | Pass |
| Worker-facing visibility | Pass |
| Staffing truthfulness | Pass |
| Service and role coverage | Pass |
| Compliance boundary | Pass |
| Document boundary | Pass |
| Contact governance | Pass |
| High-impact status changes | Pass |
| Versioning | Pass |
| Multi-residence isolation | Pass |
| Resident-information protection | Pass |
| Safety boundary | Pass |
| Billing boundary | Pass |
| Auditability | Pass |
| AI governance | Pass |
| Mobile usability | Pass |
| Accessibility | Pass |
| International readiness | Pass |
| Consistency with Pages 037-038 | Pass |
| Readiness for future employer staffing pages | Pass |

## 7. Required Improvements

No required wireframe corrections are identified at this review stage.

Future pages should continue validating:

- department-level permissions;
- residence-to-department relationships;
- safe worker-facing arrival instructions;
- staffing source contracts;
- compliance/document status ownership;
- location status change governance;
- audit-event implementation.

These are future consistency checks, not Page 039 blockers.

## 8. Governance Review

| Requirement | Result |
| --- | --- |
| Frozen title remains Residences | Pass |
| Architecture Freeze unchanged | Pass |
| Employer Portal scope unchanged | Pass |
| Pages 001-038 unchanged | Pass |
| No Page 040 files created | Pass |
| No approval record created | Pass |
| No implementation started | Pass |
| No React/frontend/backend/API/database work | Pass |
| No residence-management implementation created | Pass |
| No location-management implementation created | Pass |
| No staffing or scheduling implementation created | Pass |
| No compliance implementation created | Pass |
| No clinical or resident-record implementation created | Pass |
| No billing implementation created | Pass |
| No AI residence implementation created | Pass |
| Unrelated app changes untouched | Pass |

## 9. Recommendation

```text
APPROVE WITH OWNER REVIEW
```

Page 039 is ready for owner review. It preserves residence governance, resident/patient privacy,
worker-facing visibility limits, staffing truthfulness, compliance and document boundaries,
auditability, AI limits, and consistency with the approved Employer Portal pages.

## 10. Final Review Status

```text
Page 039 - Residences
Wireframe: COMPLETE
Product Review: COMPLETE
Approval Record: NOT CREATED
Owner Review: REQUIRED

Page 040 - Departments
BLOCKED
```
