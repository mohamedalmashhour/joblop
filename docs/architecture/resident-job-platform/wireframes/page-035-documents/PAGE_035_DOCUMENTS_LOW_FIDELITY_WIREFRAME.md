# Page 035 - Documents Low-Fidelity Wireframe

Status: Initial wireframe complete
Epic: Epic 3 - Worker Portal
Primary user: Authenticated worker
Secondary visibility: Support, Compliance, Payroll, Security, Administrator, and Super Administrator where role-permitted
Architecture baseline: Resident Job Architecture Phase 1 v1.0
Epic planning baseline: Epic 3 Worker Portal Planning v1.0
Financial boundary baseline: EPIC_3_FINANCIAL_BOUNDARY_REVIEW.md
Notifications baseline: Page 034 - Notifications Approved Wireframe v1.0
Frozen architecture source: pages/PAGE_035_DOCUMENTS.md
Implementation: Not authorized

## 1. Frozen Page Confirmation

The frozen architecture page map defines:

| Page | Frozen title | Source |
| --- | --- | --- |
| 034 | Notifications | pages/PAGE_034_NOTIFICATIONS.md |
| 035 | Documents | pages/PAGE_035_DOCUMENTS.md |
| 036 | Settings | pages/PAGE_036_SETTINGS.md |

No title inference, rename, or architecture amendment is introduced.

## 2. Page Purpose

Documents is the authenticated worker page for viewing governed document metadata, statuses,
versions, expiry, verification, restrictions, retention state, and authorized actions connected to
profile, professional qualifications, shifts, employment, payroll, compliance, support, and platform
workflows.

The page allows the worker to:

- view authorized documents connected to governed workflows;
- distinguish document category, owner, source, status, version, expiry, verification, restriction,
  and retention state;
- upload or replace documents only where authorized;
- view or download documents only where authorized;
- understand which workflow owns each document;
- understand when action is required;
- understand when a document is pending review, rejected, expired, restricted, superseded, or under
  hold;
- access support or correction paths.

The page must not:

- become the authoritative owner of every document;
- expose documents to unrelated employers or workers;
- expose full identity, banking, health, tax, or background-check information in previews;
- silently replace or delete prior versions;
- treat upload as verification;
- treat verification as professional authorization beyond governed scope;
- allow unrestricted file uploads;
- permit AI to approve, alter, fabricate, delete, verify, or disclose documents;
- replace formal compliance, payroll, identity, licensing, or legal workflows.

## 3. Document Category Model

Documents must not be combined into one undifferentiated list.

| Category | Examples | Boundary |
| --- | --- | --- |
| Identity documents | Government-issued identification, identity verification evidence, work-authorization documents where applicable | Identity document received is not identity verified |
| Professional qualifications | Licence, certification, diploma, training record, professional membership | Uploaded credential is not verified eligibility |
| Background and compliance | Background-check result, vulnerable-sector check, compliance acknowledgment, policy acceptance | Review required is not misconduct |
| Employment and assignment | Worker agreement, shift-related form, assignment acknowledgment, workplace policy | Viewed is not accepted |
| Payroll and tax | Payroll statement, tax form, direct-deposit form, reimbursement document | Document generated is not payment settled |
| Support and dispute documents | Correction evidence, dispute attachment, support case document | Support evidence is not final decision |
| Platform-generated documents | Confirmation, statement, approved report, audit receipt | Platform-generated does not mean universally authoritative |

## 4. Source-of-Truth Boundary

Each document must be linked to an authoritative owner or workflow.

Possible owners:

- worker profile;
- licence workflow;
- certification workflow;
- background-check workflow;
- payroll system;
- payment system;
- employer agreement;
- shift record;
- support case;
- dispute workflow;
- compliance workflow;
- platform administration.

Required distinctions:

```text
Document displayed on Page 035
does not equal
Page 035 owns the underlying business rule

Document uploaded
does not equal
Document accepted

Document accepted
does not equal
Document verified

Document verified
does not equal
Worker authorized for every role or jurisdiction
```

## 5. Document Record

Each document record should support safe placeholders for:

- document category;
- document type;
- title;
- owner;
- source workflow;
- related employer, shift, case, or qualification;
- status;
- verification state;
- version;
- replacement relationship;
- issued date;
- effective date;
- expiry date;
- uploaded date;
- last updated;
- access scope;
- retention state;
- legal-hold state;
- action required;
- support path.

Do not expose sensitive full values in list previews.

## 6. Independent Document States

The page must not collapse document status into one generic "Approved" state.

### A. Upload State

- Not uploaded.
- Draft.
- Uploading.
- Uploaded.
- Upload failed.
- Scan pending.
- Upload unavailable.

### B. Review State

- Not reviewed.
- Under review.
- More information required.
- Accepted.
- Rejected.
- Review unavailable.

### C. Verification State

- Not verified.
- Verification pending.
- Verified.
- Verification failed.
- Verification expired.
- Verification unavailable.

### D. Validity State

- Not yet effective.
- Active.
- Expiring.
- Expired.
- Revoked.
- Suspended.
- Validity unknown.

### E. Version State

- Current.
- Superseded.
- Replaced.
- Duplicate.
- Correction pending.
- Historical.

### F. Access State

- Worker visible.
- Employer visible where authorized.
- Platform restricted.
- Compliance restricted.
- Support restricted.
- Unavailable.

### G. Retention State

- Active.
- Archived.
- Retained for audit.
- Retained under hold.
- Deletion eligible.
- Deleted where permitted.

## 7. Upload Eligibility

Document upload must be governed.

Possible eligibility bases:

- required profile document;
- licence renewal;
- certification update;
- background-check request;
- employer agreement;
- payroll setup;
- support case;
- dispute evidence;
- platform request.

Required distinctions:

```text
Authenticated worker
does not equal
Authorized to upload every document type

Upload available
does not equal
Upload mandatory

Upload completed
does not equal
Review completed
```

Workers must not upload documents into unrelated workflows.

## 8. Desktop Wireframe

```text
HEADER
Resident Job | Documents | Worker: [Name] | Notifications | Help

DOCUMENT GOVERNANCE NOTICE
Documents are governed records connected to source workflows.
Upload does not mean accepted.
Accepted does not mean verified.
Verified does not create universal eligibility.
Sensitive documents are privacy-protected and access-limited.

CATEGORY FILTERS
[Action required]
[Identity]
[Professional]
[Background & compliance]
[Employment & assignment]
[Payroll & tax]
[Support & disputes]
[Platform generated]
[Archived / historical]
[Search]

DOCUMENT LIST
| Category | Type | Title | Source workflow | Status | Verification | Version | Expiry | Access | Action |
| Licence | Professional | Food safety certificate | Certification workflow | Under review | Pending | Current | [date] | Worker / compliance | View |
| Payroll | Tax | Annual tax form | Payroll system | Available | Not applicable | Current | N/A | Worker restricted | Download |
| Identity | ID | Identity evidence | Identity workflow | Scan pending | Not verified | Current | [date] | Platform restricted | Status |
| Support | Evidence | Timesheet correction evidence | Support case [ref] | Accepted | Not applicable | Historical | N/A | Support restricted | View status |

SELECTED DOCUMENT DETAIL
- Category and type
- Source workflow and owner
- Related record reference
- Upload state
- Review state
- Verification state
- Validity state
- Version state
- Access state
- Retention state
- Legal-hold state
- Action required
- Support path

VERSION HISTORY
Original -> Replacement -> Superseded -> Retained / deletion eligible where permitted
Each version preserves actor, timestamp, reason, verification impact, and retention decision.

UPLOAD / REPLACE ACTION
Available only for authorized workflow.
Allowed format guidance.
Sensitive-content warning.
Scan pending state.
Upload failed and correction states.

ACCESS AND PRIVACY
Worker visible: authorized document metadata and permitted content.
Employer visible: minimum necessary role-relevant information where authorized.
Platform restricted: identity, background, tax, banking, fraud, legal-hold, and audit details.
```

## 9. Mobile Wireframe

```text
TOP BAR
Documents | Search | Help

GOVERNANCE NOTICE COLLAPSED
Upload is not verification. Sensitive documents are access-limited.

PRIMARY TABS
[Action] [Current] [Expiring] [Restricted] [History]

DOCUMENT CARD
Category
Type
Safe title
Source workflow
Status
Verification
Expiry
Action required
View / upload / support action

DETAIL VIEW
Owner and source workflow
Status stack
Version history
Access scope
Retention and hold state
Support path
```

Mobile prioritizes:

- document categories;
- action-required items;
- expiry;
- verification state;
- current version;
- upload or replacement action;
- view or download action;
- support path;
- sensitive-document labels;
- large touch targets;
- privacy-safe previews.

Avoid dense document tables.

## 10. File-Type Governance

Allowed categories are conceptual only:

- PDF;
- approved image format;
- jurisdiction-approved document type.

Explicitly prohibited or restricted:

- executable files;
- scripts;
- archives where not approved;
- password-protected files where unsupported;
- files containing unrelated personal information;
- resident medical records;
- other workers' documents;
- banking credentials in ordinary uploads;
- malware or unscanned content.

File states:

- file accepted;
- file rejected;
- file too large;
- unsupported format;
- password-protected;
- corrupt file;
- scan pending;
- malware suspected;
- upload unavailable.

No scanning implementation is designed.

## 11. Sensitive Document Classification

Each class conceptually defines who may view, whether employer access is permitted, whether download
is permitted, whether masking is required, whether staff access is audited, retention expectations,
and replacement rules.

| Class | Preview rule | Employer access |
| --- | --- | --- |
| Identity | Masked metadata only | No, unless explicitly required and authorized |
| Banking | Masked destination/status only | No |
| Tax | Safe title and period only | No |
| Background check | Status only | Purpose-limited result only where governed |
| Legal | Safe title and status only | Only if party and authorized |
| Health-related | Avoid ordinary document preview | Highly restricted |
| Professional licence | Safe credential metadata, masked number where required | Role-relevant status only |
| Employment | Agreement metadata and version | Relevant parties only |
| Operational document | Safe title and related workflow | Purpose-limited |

Do not expose sensitive document contents in previews.

## 12. Identity Documents

Identity documents must:

- use masked metadata;
- hide full document numbers in previews;
- hide full date of birth in previews;
- hide full address unless governed;
- hide image content in list view;
- require explicit authorized access for detailed viewing;
- preserve verification and replacement history conceptually;
- represent legal or fraud hold where applicable.

Required distinctions:

```text
Identity document received
does not equal
Identity verified

Identity verified
does not equal
Employment eligibility confirmed
```

No biometric or identity-provider integration is designed.

## 13. Licences and Certifications

Represent:

- issuing authority;
- jurisdiction;
- credential type;
- credential number masked where required;
- issue date;
- expiry date;
- verification state;
- role applicability;
- employer or jurisdiction restrictions;
- renewal action;
- suspension or revocation status where known.

Required distinctions:

```text
Licence uploaded
does not equal
Licence verified

Licence verified
does not equal
Valid for every role, employer, or jurisdiction

Certification
does not equal
Professional licence
```

Do not imply universal authorization.

## 14. Background-Check Documents

Background-check records require stricter treatment.

Worker-visible information may include:

- request status;
- completion state;
- validity window;
- whether action is required;
- support path.

Do not expose unnecessary report details, internal risk signals, or investigative notes.

Employer access is governed and purpose-limited.

Required distinctions:

```text
Check completed
does not equal
Automatically eligible

Review required
does not equal
Misconduct
```

## 15. Payroll and Tax Documents

Represent:

- document period;
- document type;
- generated date;
- correction state;
- download availability;
- jurisdiction;
- support path.

Do not expose:

- full banking details;
- employer billing data;
- unrelated deductions;
- internal payroll configuration;
- tax credentials.

Required distinctions:

```text
Document generated
does not equal
Payment settled

Statement available
does not equal
Tax filing completed
```

Page 035 must not calculate payroll or taxes.

## 16. Contracts and Agreements

Represent:

- agreement type;
- parties;
- effective date;
- status;
- version;
- signature state;
- superseded state;
- governing jurisdiction;
- related employer or assignment;
- download availability.

Contract state flow:

```text
Draft
↓
Issued
↓
Viewed
↓
Signed where applicable
↓
Effective
↓
Superseded
↓
Terminated
```

Do not design e-signature implementation.

Viewed does not equal accepted.

## 17. Versioning and Replacement

Every replaceable document preserves:

- original document;
- new document;
- version number;
- replaces relationship;
- superseded timestamp;
- actor;
- reason;
- verification impact;
- retention decision.

Required distinctions:

```text
Replace
does not equal
Delete immediately

Superseded
does not equal
Invalid in every context

Current
does not equal
Verified
```

No historical document may be silently overwritten.

## 18. Deletion, Retention, and Legal Hold

The page distinguishes:

- removed from worker view;
- archived;
- superseded;
- deletion eligible;
- deleted;
- retained for audit;
- retained under fraud hold;
- retained under dispute hold;
- retained under legal or regulatory hold.

Ordinary deletion must not override active dispute, fraud review, legal hold, compliance hold, or
required audit retention.

Legal hold states:

- no hold;
- hold requested;
- hold active;
- hold released;
- hold unavailable.

Legal hold conceptually preserves:

- reason;
- authority;
- actor;
- timestamp;
- case reference;
- affected version;
- release record.

Workers should not see confidential internal legal notes unless permitted.

No retention or legal-hold implementation is designed.

## 19. Access Control and Employer Boundary

Worker-visible:

- own authorized documents;
- statuses;
- expiry;
- action required;
- download or upload controls where permitted;
- support paths.

Employer-visible only where governed:

- role-relevant licence or certification status;
- required employment document;
- authorized agreement;
- minimum necessary verification result.

Platform-only or restricted:

- identity-document images;
- background-check details;
- tax documents;
- banking documents;
- moderation notes;
- fraud signals;
- legal-hold details;
- audit history.

Employers must not access:

- unrelated worker documents;
- banking documents;
- tax documents;
- identity images unless explicitly required and authorized;
- background-check raw details;
- private dispute evidence;
- legal-hold information;
- documents from other employers;
- internal platform notes.

Employer access is role-based, purpose-limited, time-limited where appropriate, auditable, and
revocable.

## 20. Staff Access and Auditability

Staff access to identity documents, background checks, tax documents, banking documents, legal
documents, dispute evidence, and restricted professional records must conceptually preserve:

- actor;
- role;
- action;
- document reference;
- version;
- purpose or case reference;
- timestamp;
- result.

Do not place document contents into broad application logs.

## 21. View and Download Governance

Represent:

- view available;
- download available;
- download restricted;
- preview unavailable;
- authorization expired;
- document unavailable;
- file scan pending;
- document removed;
- service unavailable.

Sensitive documents require explicit authorization, minimized previews, masked filenames where
appropriate, no public or permanent links, no storage paths, and no provider metadata exposure.

No storage implementation is designed.

## 22. Document Requests

Governed document request states:

- requested;
- worker notified;
- upload available;
- submitted;
- review pending;
- accepted;
- correction required;
- rejected;
- expired;
- withdrawn;
- unavailable.

Each request includes:

- requester role;
- purpose;
- document type;
- due date where permitted;
- visibility;
- support path.

Unauthorized employers or staff cannot create arbitrary document requests.

## 23. Expiry, Renewal, Rejection, and Correction

Expiry and renewal states:

- active;
- expiring soon;
- expired;
- renewal submitted;
- renewal under review;
- renewal accepted;
- renewal rejected;
- grace period where governed;
- role restriction pending review.

Required distinctions:

```text
Expired document
does not equal
Automatic misconduct

Renewal submitted
does not equal
Credential extended
```

Rejected documents include safe reason category, resubmission permission, correction guidance,
support path, last review date, reviewer role where appropriate, and appeal or dispute route where
governed.

Do not expose confidential fraud or investigation details.

```text
Rejected document
does not equal
Rejected worker

Correction required
does not equal
Misconduct
```

## 24. Fraud and Integrity Boundary

Fraud or integrity review is represented only as a restricted state.

Worker-facing wording:

- additional review required;
- verification pending;
- support contact available.

Do not expose:

- detection logic;
- risk score;
- internal evidence;
- other users' records;
- investigative strategy.

AI or automation must not make final high-impact decisions alone.

## 25. Notifications Boundary

Page 035 may show document-related notification state only where already governed.

It does not own:

- push delivery;
- email delivery;
- SMS delivery;
- notification scheduling;
- reminder engine;
- provider logic.

No notification implementation is designed.

## 26. Search and Filters

Supported filters:

- category;
- status;
- action required;
- expiry;
- employer;
- shift or case;
- verification;
- current or historical;
- restricted or available.

Search remains within the worker's authorization scope and must not expose sensitive content in
previews.

## 27. AI Boundary

AI may:

- explain document statuses;
- summarize worker-visible metadata;
- identify upcoming expiry;
- help the worker understand required next steps;
- assist with classification suggestions before upload;
- help draft a support request.

AI must not:

- fabricate documents;
- alter files;
- approve or reject documents;
- verify identity;
- determine professional eligibility;
- determine background-check outcome;
- infer protected characteristics;
- expose restricted document content;
- change retention or legal-hold state;
- delete documents;
- create signatures;
- conceal failed verification;
- make final fraud decisions.

The authoritative document and workflow record remain controlling.

## 28. Empty and Error States

Required states:

- no documents;
- no action required;
- document unavailable;
- upload unavailable;
- upload failed;
- scan pending;
- unsupported format;
- corrupt file;
- review pending;
- verification unavailable;
- download restricted;
- expired document;
- superseded document;
- legal hold active;
- support unavailable;
- service unavailable.

Do not fabricate document records.

## 29. Accessibility

The page must support:

- semantic document headings;
- screen-reader-friendly status labels;
- keyboard navigation;
- accessible upload controls;
- accessible file-error messages;
- non-color-only expiry and verification states;
- readable dates;
- accessible version history;
- clear restricted-access messaging;
- focus management;
- sufficient contrast;
- plain-language support paths.

## 30. International Readiness

The page must not hardcode:

- document type;
- issuing authority;
- jurisdiction;
- licence rules;
- verification method;
- expiry rules;
- renewal rules;
- retention period;
- legal-hold rules;
- background-check terminology;
- tax-document type;
- employment-document model;
- supported file format;
- language;
- date format;
- employer access rule.

Jurisdiction, employer, role, document type, locale, verification, retention, legal hold, and access
policy remain configurable.

## 31. Future Boundary

Page 035 does not own:

- object storage;
- antivirus scanning;
- OCR;
- identity verification engine;
- background-check provider;
- licence registry integration;
- e-signature;
- payroll generation;
- tax calculation;
- legal-hold engine;
- retention engine;
- fraud adjudication;
- notification delivery;
- dispute resolution;
- employer authorization policy.

It provides governed visibility and entry points only.

## 32. Self Validation

| Requirement | Result |
| --- | --- |
| Frozen title remains Documents | Pass |
| Architecture Freeze unchanged | Pass |
| Epic 3 Planning unchanged | Pass |
| Pages 016-034 unchanged | Pass |
| Financial Boundary Review unchanged | Pass |
| No Page 036 files created | Pass |
| No approval record created | Pass |
| No implementation started | Pass |
| No React/frontend/backend/API/database work | Pass |
| No object-storage implementation created | Pass |
| No upload/download implementation created | Pass |
| No scanning or OCR implementation created | Pass |
| No identity-verification implementation created | Pass |
| No background-check integration created | Pass |
| No e-signature implementation created | Pass |
| No retention or legal-hold implementation created | Pass |
| No AI document implementation created | Pass |
| Unrelated app changes untouched | Pass |

## 33. Final Wireframe Status

```text
Page 035 - Documents
Wireframe: COMPLETE
Product Review: REQUIRED
Approval Record: NOT CREATED

Page 036 - Settings
BLOCKED
```
