# Worker Compliance Relationship Map

Status: Active architectural relationship document
Scope: Worker Portal compliance-related profile surfaces
Architecture baseline: Resident Job Architecture Phase 1 v1.0
Epic planning baseline: Epic 3 Worker Portal Planning v1.0
Implementation: Not authorized

## 1. Purpose

This document maps the relationship between worker profile, professional, licence, certification,
document, verification, approval, and assignment-eligibility concepts.

It is an architectural relationship document only.

It does not contain:

- Code.
- APIs.
- Database schema.
- Implementation logic.
- Automatic eligibility rules.
- Unapproved legal rules.

## 2. Core Distinctions

```text
Profile identity
≠
Professional information

Professional information
≠
Licence

Licence
≠
Certification

Certification
≠
Supporting document

Document upload
≠
Verification

Verification
≠
Worker approval

Worker approval
≠
Eligibility for every assignment
```

Identity verification and background checks must remain distinct.

```text
Identity verification
≠
Background check

Consent given
≠
Check completed

Background check completed
≠
Requirement satisfied

Requirement satisfied
≠
Worker approval
```

Assignment eligibility is a future governed evaluation based on relevant, approved inputs. It is
not a single badge and not an automatic AI decision.

Certification records and licence records must remain distinct. A licence normally records regulated
authority from an external authority where applicable. A certification records training, competency,
completion, or qualification, and may come from many sources with different levels of authority.

```text
Certification
≠
Licence

Training completed
≠
Legal authority to practise

Certification verified
≠
Requirement satisfied

Requirement satisfied
≠
Assignment approved
```

## 3. Relationship Map

| Concept | Primary Page / Workflow | Owned / Edited By | Review / Authority | Employer Visibility | Expiry Dependency | Jurisdiction Dependency | Assignment Dependency | AI Boundary | Audit Requirement |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Profile identity | Page 017 - My Profile | Worker for permitted fields | Identity verification workflow where applicable | Limited, assignment-relevant identity display only | Usually no | Yes where identity rules vary | May support account trust, not eligibility alone | AI may suggest missing fields only | Changes and review states audited |
| Professional information | Page 018 - Professional Information | Worker | Platform review where applicable | Relevant role, skills, approved summary only | Usually no | Yes for regulated claims | Supports recommendations, not eligibility alone | AI may suggest formatting or categories only | Changes and review states audited |
| Licence | Page 019 - Licenses | Worker record; review staff for review state | Issuing authority plus platform review where applicable | Relevant category, jurisdiction, validity, review state only | Yes | Yes | May be required for specific assignments | AI cannot verify or approve | Records, expiry, corrections, and review audited |
| Certification | Page 020 - Certifications | Worker record; review staff for review state | Source authority plus platform review where applicable; not regulator-equivalent by default | Relevant certification, category, source, review state, validity state, requirement state, and assignment relevance only | Sometimes; no-expiry does not mean permanent validity | Yes | May be jurisdiction-required, role-required, assignment-required, employer-required, platform-required, recommended, optional, or not currently required | AI cannot invent, verify, approve, reject, rank, create requirements, or decide eligibility | Records, expiry, renewal, source, corrections, rejection, visibility, and review audited |
| Supporting document | Documents workflow | Worker uploads/links | Document review workflow where applicable | Not directly visible except permitted evidence indicator | Depends on document | Yes | Supports claim review, not eligibility alone | AI cannot treat upload as proof | Upload, access, review, and correction audited |
| Identity verification | Future verification workflow | Worker submits evidence | Authorized review process | Status only where necessary | Usually no | Yes | Supports account trust, not credential approval | AI cannot verify identity | Review and decision audited |
| Background checks | Page 021 - Background Check | Worker consent; authorized provider/process; platform review where applicable | Approved screening provider/source plus authorized human review where applicable | Requirement/status only where relevant and permitted; never full report by default | Often yes; validity is configurable | Yes | May affect specific role, employer, assignment, or jurisdiction requirements where approved | AI cannot analyze criminal-record content, infer risk, approve/reject workers, alter consent, or decide eligibility | Consent, provider status, disputes, corrections, access, visibility, and review audited |
| Health / occupational requirements | Future governed workflow | Worker / authorized reviewer | Approved occupational policy/source | Relevant status only where necessary | Often yes | Yes | May affect assignment eligibility where approved | AI cannot infer medical/legal eligibility | Status, access, and review audited |
| Availability | Page 022 - Availability Calendar | Worker | Worker-managed with operational constraints | Availability relevant to assignment only | Time-bound | Local time/region sensitive | Required for scheduling, not qualification | AI may detect conflicts only | Changes and conflicts audited |
| Assignment requirements | Assignment workflow | Employer/platform configuration | Approved business rules/contracts/regulators/employer rule | Worker sees relevant requirements | Depends on requirement | Yes | Defines requirement context | AI may explain or recommend, not decide | Requirement changes audited |
| Worker approval | Operational review workflow | Authorized platform staff | Human approval process | Status only where necessary | May depend on documents | Yes | Enables participation but not every assignment | AI cannot approve worker | Approval decisions audited |
| Assignment eligibility | Future governed evaluation | System-assisted, human-governed | Based on approved inputs and rules | Outcome only where appropriate | Yes | Yes | Specific to assignment, role, location, time, and rules | AI cannot be final decision-maker | Eligibility evidence and decision audited |

## 4. Ownership and Permissions

Worker may edit:

- Permitted profile fields.
- Professional summary.
- Experience descriptions.
- Skills.
- Languages.
- Preferences.
- Draft licence and certification records.
- Links to supporting documents.

May require reviewer action:

- Identity verification.
- Credential review.
- Licence review.
- Certification review.
- Background checks.
- Health or occupational requirement review.
- Worker approval.

Employer visibility is limited to:

- Assignment-relevant profile details.
- Assignment-relevant role or skill summaries.
- Relevant licence or certification category.
- Current validity state where necessary.
- Platform review state where appropriate.
- Requirement relevance where approved.

Employer visibility does not include unrestricted access to:

- Full identifiers.
- Full uploaded evidence.
- Private worker notes.
- Internal reviewer notes.
- Full correction history.
- Internal audit details.
- Unrelated credentials.

Certification-specific employer visibility is limited to facts relevant to a role, employer, or
assignment. Employers do not generally see full certificate identifiers, uploaded evidence, worker
private notes, rejection history, correction history, internal reviewer notes, unrelated
certifications, or full audit trail.

Background-check employer visibility is limited to permitted status facts relevant to a role,
employer, assignment, or jurisdiction. Employers do not generally see full reports, allegations,
identity documents, provider notes, dispute materials, correction evidence, internal review comments,
or full audit trail.

## 5. Prohibited Shortcuts

The platform must not use:

- One generic "verified worker" badge.
- Profile completion as eligibility.
- Uploaded document as proof.
- All certifications as legally equivalent.
- One licence as authority for every role.
- One certification as authority for every role.
- Internal training as regulator-equivalent certification.
- Required for one employer as required for all employers.
- Required for one assignment as required for every assignment.
- Background-check consent as check completion.
- Background-check completion as automatic requirement satisfaction.
- Requirement satisfaction as worker approval.
- Full background-check reports as employer-visible by default.
- Pass/fail background-check labels that erase consent, process, review, and requirement context.
- AI approval of compliance.
- Worker approval as assignment eligibility for every shift.
- Employer visibility as unrestricted profile access.

## 6. Assignment Eligibility Boundary

Assignment eligibility must be treated as a future governed evaluation.

Potential approved inputs may include:

- Account status.
- Worker approval status.
- Professional information.
- Relevant licence status.
- Relevant certification status.
- Supporting document review.
- Identity verification where applicable.
- Background-check status where applicable.
- Health or occupational requirements where applicable.
- Availability.
- Location and jurisdiction.
- Employer or contract requirements.
- Assignment requirements.

No single input automatically creates eligibility for every assignment.

## 7. AI Boundary

AI may:

- Highlight missing information.
- Suggest standardized categories.
- Detect inconsistent dates.
- Flag expiry risk.
- Explain why a requirement may be relevant.
- Recommend review priorities.

AI must not:

- Verify identity.
- Verify documents.
- Verify licences.
- Verify certifications.
- Analyze criminal-record content.
- Predict criminality or infer risk from protected characteristics.
- Approve worker status.
- Approve compliance.
- Determine legal authority.
- Make final assignment eligibility decisions.
- Override human or regulatory review.

## 8. Privacy Boundary

Privacy must be preserved by information type:

- Worker-only data stays private unless approved for operational use.
- Employer-visible data is limited to assignment-relevant information.
- Platform staff access is role-based and audited.
- Sensitive supporting documents remain in the Documents workflow.
- Notifications must not expose sensitive credential details.
- Public display is off by default.

## 9. Audit Requirement

Audit is required for:

- Worker edits to compliance-related records.
- Document uploads and links.
- Review state changes.
- Verification outcomes.
- Corrections and rejections.
- Expiry and renewal events.
- Employer visibility events where applicable.
- Assignment eligibility determinations when future approved workflow exists.
- AI-generated suggestions used in review or recommendation workflows.

## 10. Governance Confirmation

This document is not implementation.

It does not authorize React, frontend, backend, APIs, database schema, verification workflows,
credential workflows, assignment-eligibility automation, deployment, or production data.
