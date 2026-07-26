# Resident Job

## Page 060 - Replacement Engine Wireframe Revision 1

**Status:** Controlled Revision 1 Complete  
**Original Wireframe:** `PAGE_060_REPLACEMENT_ENGINE_LOW_FIDELITY_WIREFRAME.md`  
**Implementation:** Not Started  
**Page 061:** Admin Dashboard unblocked after approval, not created

---

## 1. Revision Summary

Revision 1 strengthens Page 060 - Replacement Engine as a governed replacement workflow. It clarifies
replacement eligibility, lifecycle separation, candidate governance, human authority, source-of-truth
boundaries, assignment boundaries, notification boundaries, financial boundaries, replacement continuity,
auditability, privacy, AI governance, accessibility, international readiness, and readiness for
Page 061 - Admin Dashboard.

No redesign or implementation is introduced.

---

## 2. Replacement Eligibility

Represent independently:

- replacement requested
- replacement authorized
- policy permits replacement
- original assignment remains valid
- replacement blocked
- replacement unavailable
- replacement expired

Clarify:

```text
Replacement requested != Replacement approved
Replacement approved != Replacement assigned
```

Replacement eligibility is a governed prerequisite. It is not itself an assignment, notification, or
attendance outcome.

---

## 3. Replacement Lifecycle

Represent lifecycle stages separately:

- request received
- under review
- candidate search
- candidate comparison
- candidate selected
- approval pending
- approved
- rejected
- cancelled
- expired
- authoritative workflow handoff complete

Do not collapse lifecycle stages. Candidate selected, approval pending, approved, handoff complete, worker
notified, worker accepted, and attendance confirmed must remain separate concepts.

---

## 4. Candidate Governance

Replacement candidates must independently satisfy:

- role compatibility
- qualification verification
- licence validity
- certification validity
- schedule compatibility
- availability
- organizational authorization
- policy compliance

Clarify:

```text
Visible worker != Eligible replacement
Eligible replacement != Approved replacement
```

The interface must not allow unrestricted worker selection outside the governed candidate pool.

---

## 5. Human Authority

Represent authority for:

- initiate replacement
- review eligibility
- compare candidates
- approve replacement
- reject replacement
- escalate replacement
- cancel replacement request
- read-only audit

Every decision records:

- actor
- role
- timestamp
- replacement reference
- assignment reference
- rationale where required

---

## 6. Source-of-Truth Boundary

Page 060 may reference:

- shifts
- assignments
- worker availability
- qualifications
- conflict outcomes
- policies

It must never become authoritative for those records.

All operational changes return to their authoritative workflow.

Clarify:

```text
Replacement review != Source record changed
Candidate selected != Assignment record changed
Workflow handoff complete != Downstream workflow completed
```

---

## 7. Assignment Boundary

Page 060 prepares replacement only.

It must not:

- assign workers
- reassign workers
- modify attendance
- close assignments
- cancel assignments
- release the original assignment
- accept on behalf of a worker

Those responsibilities remain owned elsewhere.

---

## 8. Notification Boundary

Page 060 prepares downstream notification workflows only.

It must not:

- send email
- send SMS
- send push notifications
- contact workers automatically
- fabricate delivery state
- fabricate read state
- fabricate acceptance state

---

## 9. Financial Boundary

Page 060 must not:

- calculate payroll
- calculate compensation
- modify invoices
- issue refunds
- reconcile payments
- alter rates
- determine travel compensation

Financial responsibility remains outside Page 060.

---

## 10. Replacement Continuity

Represent:

- continuity preserved
- continuity at risk
- manual intervention required
- replacement pending
- replacement accepted
- replacement rejected
- replacement cancelled

Clarify:

```text
Replacement approved != Continuity guaranteed
Replacement accepted != Attendance confirmed
Replacement cancelled != Financial outcome determined
```

Continuity is an operational status, not a promise of coverage.

---

## 11. Auditability

Preserve:

- replacement requested
- reviewer assigned
- candidate reviewed
- candidate selected
- approval granted
- approval denied
- workflow handed off
- cancelled
- closed

Include:

- actor
- role
- timestamp
- assignment reference
- replacement reference
- worker reference
- policy version
- rationale

Audit records should preserve decisions and handoffs without broadly exposing restricted evidence.

---

## 12. Privacy

Expose only minimum necessary information.

Never expose:

- banking
- tax
- health
- identity documents
- unrelated complaints
- investigations
- protected personal information
- private message bodies
- unrelated support cases

Candidate comparison should use operational eligibility facts, not unrestricted profile or private data.

---

## 13. AI Boundary

AI may:

- summarize candidate information
- compare eligible candidates
- explain policy
- identify missing information
- draft rationale

AI must never:

- approve replacements
- assign workers
- override policy
- waive qualifications
- contact workers
- create authoritative operational state
- hide eligible alternatives
- rank candidates outside governed criteria

AI output remains advisory and evidence-aware.

---

## 14. Page 061 Boundary

Prepare explicitly for:

```text
Page 061 — Admin Dashboard
```

Page 060 owns:

```text
Replacement workflow
```

Page 061 owns:

```text
Operational administration, monitoring, reporting and oversight
```

Do not create Page 061 files.

---

## 15. Accessibility

Review:

- keyboard navigation
- screen-reader support
- semantic headings
- readable comparison
- confirmation before high-impact actions
- focus management
- plain-language errors
- non-color-only eligibility indicators
- mobile touch targets

---

## 16. International Readiness

Do not hardcode:

- worker roles
- qualification rules
- replacement policy
- scheduling rules
- locale
- timezone
- language
- organization structure
- labour rules

Keep policy configurable.

---

## 17. Final Status

```text
Page 060 — Replacement Engine
APPROVED WIREFRAME v1.0

Page 061 — Admin Dashboard
UNBLOCKED
NOT CREATED
```
