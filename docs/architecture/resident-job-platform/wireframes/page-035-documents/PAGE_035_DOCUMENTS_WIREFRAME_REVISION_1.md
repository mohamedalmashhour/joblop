# Page 035 - Documents Wireframe Revision 1

Status: Controlled revision complete
Page: 035 - Documents
Epic: Epic 3 - Worker Portal
Primary user: Authenticated worker
Architecture baseline: Resident Job Architecture Phase 1 v1.0
Epic planning baseline: Epic 3 Worker Portal Planning v1.0
Initial wireframe: PAGE_035_DOCUMENTS_LOW_FIDELITY_WIREFRAME.md
Implementation: Not authorized

## 1. Revision Scope

This controlled revision strengthens document governance, document lifecycle, ownership,
authorization, versioning, replacement, legal hold, privacy, auditability, AI governance, and future
storage integration boundaries.

No redesign, architecture change, implementation, API, database, object storage, OCR, antivirus,
document scanning, identity verification, background-check integration, licence verification,
e-signature, retention engine, legal-hold engine, fraud engine, or AI document implementation is
introduced.

## 2. Ownership Governance

Documents now distinguish every governing role.

| Role | Meaning | Boundary |
| --- | --- | --- |
| Document owner | Workflow or business function that governs the document | Owner is not necessarily the uploader |
| Uploader | Person or system that submitted the file | Upload does not prove ownership or validity |
| Issuer | External or internal party that issued the document | Issuer is not automatically the verifier |
| Reviewer | Authorized role reviewing completeness or acceptability | Review is not universal verification |
| Verifier | Authorized role or workflow confirming validity where applicable | Verification is scoped |
| Requester | Authorized role or workflow requesting the document | Request must be purpose-limited |
| Viewer | Authorized person permitted to see metadata or content | Viewing is governed and auditable |

Required distinctions:

```text
Uploaded
does not equal
Owned

Owned
does not equal
Verified

Verified
does not equal
Globally accepted
```

## 3. Document Lifecycle

Lifecycle states remain independent.

```text
Draft
↓
Upload
↓
Virus / scan pending
↓
Review
↓
Accepted
↓
Verified
↓
Active
↓
Replacement
↓
Superseded
↓
Archived
↓
Retention
↓
Deletion eligible
↓
Deleted
```

No lifecycle state implies another. In particular:

```text
Accepted
does not equal
Verified

Verified
does not equal
Active in every jurisdiction, employer, role, or workflow

Deletion eligible
does not equal
Deleted
```

## 4. Version Governance

Every versioned or replaceable document preserves:

- version chain;
- replaces relationship;
- historical versions;
- duplicate detection state;
- correction workflow;
- actor;
- timestamp;
- reason;
- verification impact;
- retention impact.

Required distinctions:

```text
Current
does not equal
Verified

Superseded
does not equal
Deleted

Replacement
does not equal
Historical loss
```

No historical document may be silently overwritten.

## 5. Sensitive Classification

Sensitive classes are governed independently.

| Class | Visibility | Download rights | Masking | Audit | Retention |
| --- | --- | --- | --- | --- | --- |
| Identity | Worker metadata; restricted staff detail | Restricted | ID number, DOB, address, image masked in previews | Required | Governed; holds possible |
| Licences | Worker and role-relevant employer status | Scoped | Credential number masked where required | Required | Based on credential workflow |
| Certifications | Worker and role-relevant employer status | Scoped | Number/reference masked where required | Required | Based on credential workflow |
| Payroll | Worker and payroll-restricted staff | Worker where authorized | Amount/detail previews minimized | Required | Payroll retention policy |
| Tax | Worker and payroll/tax-restricted staff | Worker where authorized | Tax identifiers masked | Required | Tax/legal retention policy |
| Banking | Worker masked metadata; payment-restricted staff | Restricted | Destination masked | Required | Payment/security policy |
| Background check | Worker status; purpose-limited employer result where governed | Restricted | Report contents hidden | Required | Compliance policy |
| Contracts | Parties and authorized staff | Where permitted | Confidential clauses hidden in previews | Required | Agreement retention policy |
| Legal evidence | Restricted authorized roles | Restricted | Sensitive evidence hidden | Required | Legal/dispute hold policy |
| Dispute evidence | Worker/support/dispute roles | Restricted | Sensitive evidence hidden | Required | Dispute retention policy |

Sensitive document contents must not appear in list, search, notification, or persistent side-panel
previews.

## 6. Employer Access Boundary

Employers receive only the minimum document information required for the governed workflow.

Never expose to employers:

- tax documents;
- banking documents;
- identity images;
- private dispute evidence;
- legal-hold information;
- unrelated documents;
- documents tied to other employers;
- background-check raw details;
- internal platform notes.

Employer access must be purpose-limited, role-based, time-limited where appropriate, auditable, and
revocable.

## 7. Retention and Hold Governance

Retention states remain independent:

- Active.
- Archived.
- Superseded.
- Audit retained.
- Fraud hold.
- Dispute hold.
- Legal hold.
- Deletion eligible.
- Deleted.

Required distinctions:

```text
Eligible
does not equal
Deleted

Hold
does not equal
Permanent retention

Deleted from user view
does not equal
Destroyed where audit or hold retention applies
```

No retention, legal-hold, fraud-hold, or dispute-hold implementation is designed.

## 8. Privacy Boundary

Previews must never expose:

- ID numbers;
- tax identifiers;
- banking information;
- background report contents;
- protected health information;
- legal evidence.

Sensitive content requires explicit authorization before viewing. Search and list previews must use
safe labels such as:

- Identity document status updated.
- Payroll document available.
- Background-check status updated.
- Legal or dispute evidence restricted.
- Banking document requires secure review.

## 9. Auditability

The page conceptually preserves audit history for:

- upload;
- replace;
- verify;
- download;
- view;
- hold;
- release;
- delete.

Audit placeholders include:

- actor;
- role;
- timestamp;
- action;
- document;
- version;
- reason.

Document contents must not be copied into broad application logs.

## 10. AI Boundary

AI may:

- explain status;
- explain expiry;
- summarize visible metadata;
- explain next actions.

AI must never:

- approve;
- reject;
- verify;
- sign;
- delete;
- alter;
- release holds;
- expose restricted documents;
- determine eligibility.

The authoritative document workflow remains controlling.

## 11. Future Integration Boundary

Page 035 does not own:

- object storage;
- OCR;
- antivirus;
- document scanning;
- identity verification;
- background provider;
- licence verification;
- retention engine;
- legal hold engine;
- e-signature;
- fraud engine.

It provides governed visibility and entry points only.

## 12. Revision Validation

| Approval condition | Result |
| --- | --- |
| Ownership is governed | Pass |
| Lifecycle remains truthful | Pass |
| Versioning is preserved | Pass |
| Employer access is minimal | Pass |
| Retention and holds are documented | Pass |
| Privacy is preserved | Pass |
| Auditability is complete | Pass |
| AI cannot approve, verify, alter, delete, or disclose documents | Pass |
| No governance, compliance, privacy, or operational risks remain at wireframe level | Pass |

## 13. Governance Validation

| Requirement | Result |
| --- | --- |
| Architecture Freeze unchanged | Pass |
| Epic 3 Planning unchanged | Pass |
| Pages 016-034 unchanged | Pass |
| No Page 036 files created | Pass |
| No implementation started | Pass |
| No React/frontend/backend/API/database work | Pass |
| No storage implementation created | Pass |
| No OCR or identity verification implementation created | Pass |
| No e-signature implementation created | Pass |
| No legal-hold or retention engine created | Pass |
| No commit, push, merge, or deployment | Pass |

## 14. Final Revision Status

```text
Page 035 - Documents
Revision 1: COMPLETE
Approval criteria: SATISFIED

Page 036 - Settings
UNBLOCKED as next controlled gate
NOT CREATED
```
