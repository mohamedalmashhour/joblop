# Resident Job

## Epic 3 Mid-Epic Architecture Review

**Epic:** Epic 3 - Worker Portal  
**Review Scope:** Pages 016-022  
**Review Type:** Integrated worker-domain architecture review  
**Status:** COMPLETE  
**Final Status:** Epic 3 READY to continue to Page 023

---

## 1. Executive Summary

Epic 3 is structurally coherent through the first seven approved worker pages. The pages form a clear worker-domain baseline:

- Page 016 owns the worker operational home screen.
- Page 017 owns personal profile and account-facing worker information.
- Page 018 owns professional information and work preferences.
- Page 019 owns licenses.
- Page 020 owns certifications.
- Page 021 owns background-check workflow visibility.
- Page 022 owns worker availability.

The approved pages preserve the required separations between identity, professional profile, license, certification, background check, availability, assignment, attendance, and payroll. No critical blocker was found.

The next page, Page 023 - Search Shifts, may proceed as the next controlled gate. It must preserve the architecture by treating worker readiness signals as inputs and explanations, not as a single combined eligibility or approval badge.

---

## 2. Scope Reviewed

| Page | Name | Frozen Status | Domain Responsibility |
| --- | --- | --- | --- |
| 016 | Worker Dashboard | Approved Wireframe v1.0 | Operational home, current priorities, aggregated worker alerts |
| 017 | My Profile | Approved Wireframe v1.0 | Personal information, profile status, privacy and account-facing profile context |
| 018 | Professional Information | Approved Wireframe v1.0 | Work history, skills, specialties, languages, preferences |
| 019 | Licenses | Approved Wireframe v1.0 | License records, jurisdiction-aware license status, review boundaries |
| 020 | Certifications | Approved Wireframe v1.0 | Certification and training records distinct from licenses |
| 021 | Background Check | Approved Wireframe v1.0 | Consent, status visibility, worker rights, review process boundaries |
| 022 | Availability Calendar | Approved Wireframe v1.0 | Worker availability, unavailable time, preferences, calendar conflicts |

No Page 023 wireframe, review, approval record, or implementation artifact was created during this review.

---

## 3. Information Ownership

### Ownership Assessment

| Information Type | Owning Page | Assessment |
| --- | --- | --- |
| Current worker action priority | 016 Worker Dashboard | Correct. Dashboard aggregates priority but does not become the source of truth for profile, compliance, or payroll. |
| Personal identity and contact data | 017 My Profile | Correct. Identity-related information is not merged with professional or compliance data. |
| Professional background and preferences | 018 Professional Information | Correct. Self-reported professional data remains separate from verified licenses and certifications. |
| Licenses | 019 Licenses | Correct. Licenses remain distinct from certifications, skills, and worker approval. |
| Certifications | 020 Certifications | Correct. Certifications remain distinct from licenses and legal authority to practise. |
| Background-check workflow | 021 Background Check | Correct. Consent, review, and status are visible without exposing sensitive report content. |
| Availability | 022 Availability Calendar | Correct. Availability is separated from assignment, attendance, and payroll. |

### Duplicated Responsibilities

No critical duplication was found. The main overlap is intentional: Pages 016 and 017-022 may display summary status, but Pages 017-022 remain the owning pages for detailed information and review state.

### Recommendation

High: Page 023 should reference readiness inputs without creating a new combined "eligible worker" badge that collapses profile, compliance, availability, and assignment logic.

---

## 4. Workflow Continuity

The worker journey is coherent:

```text
Worker Dashboard
↓
Profile / Professional Information
↓
Licenses / Certifications / Background Check
↓
Availability Calendar
↓
Search Shifts
↓
Offer / Acceptance
↓
Assignment
↓
Attendance
↓
Timesheet
↓
Earnings / Payment Status
```

### Strengths

- Worker Dashboard can surface what needs attention without owning every workflow.
- Profile and professional pages establish worker readiness inputs before shift discovery.
- Availability Calendar correctly prepares for shift discovery without becoming assignment management.
- Compliance-related pages stay separated and traceable.

### Missing Transitions

No blocking transition is missing before Page 023. The main future requirement is to ensure Search Shifts explains why a worker can or cannot act on an opportunity.

---

## 5. Compliance Consistency

The worker compliance domain remains consistent.

| Area | Finding |
| --- | --- |
| Identity | Kept separate from email verification, credentials, and worker approval. |
| Professional Information | Treated as self-reported or reviewable information, not automatic eligibility. |
| Licenses | Treated as license records, not certifications or employment approval. |
| Certifications | Treated as training or certification records, not legal authority by themselves. |
| Background Check | Treated as consent and review workflow, not automatic approval or rejection. |
| Availability | Treated as worker time preference and availability state, not a guarantee of assignment. |

No country-specific compliance model was hardcoded across the reviewed pages.

---

## 6. Separation of Concepts

The reviewed pages preserve the required concept boundaries.

| Concept Pair | Status | Notes |
| --- | --- | --- |
| Identity vs Professional Profile | Pass | Page 017 and Page 018 have separate ownership. |
| License vs Certification | Pass | Page 019 and Page 020 remain distinct. |
| Certification vs Assignment Eligibility | Pass | Certification may contribute to eligibility but does not equal eligibility. |
| Background Check vs Worker Approval | Pass | Page 021 does not imply automatic approval. |
| Availability vs Assignment | Pass | Page 022 does not turn available time into assigned work. |
| Assignment vs Attendance | Pass | Assignment is future workflow; attendance remains separate. |
| Attendance vs Payroll | Pass | Attendance may support timesheets but does not equal payment. |
| Timesheet vs Payroll | Pass | Future pages must keep this distinction intact. |

---

## 7. Worker Experience

A new worker can understand:

- what must be completed;
- what is optional;
- what is pending review;
- what may affect recommendations;
- what may block assignment readiness;
- where to update availability;
- where to review licenses, certifications, and background-check status.

The strongest pattern is the separation of "complete", "reviewed", "approved", and "eligible". This prevents the worker from assuming that profile completion or document submission automatically creates work eligibility.

### Worker Experience Risk

Medium: As the number of readiness inputs grows, the worker may need a single non-authoritative readiness summary. This should remain a dashboard summary, not a new source of truth.

---

## 8. Employer Experience

Employer-visible information remains appropriately limited in the current architecture.

Employers should see only information relevant to staffing decisions and assignments, such as role fit, required status indicators, assignment-relevant credentials, and availability-related outcomes where appropriate.

Employers should not see:

- full worker profile details;
- sensitive identity records;
- full background-check report content;
- internal review notes;
- platform-only compliance evidence;
- unrelated documents;
- worker-only preferences that are not operationally relevant.

No reviewed page grants employer-style visibility inside the worker portal.

---

## 9. Privacy Review

The worker privacy boundary is strong through Pages 016-022.

| Data Category | Boundary |
| --- | --- |
| Worker-only data | Remains private unless operationally required. |
| Employer-visible data | Limited to assignment-relevant summaries. |
| Platform-only data | Reserved for authorized operational or compliance review. |
| Sensitive documents | Remain outside the profile/professional pages and should be governed by the Documents workflow. |
| Location and attendance | Must remain tied to authorized shift and attendance workflows, not general tracking. |
| AI-generated signals | Should remain explainable and advisory, not hidden decision records. |

High: Future implementation must enforce these boundaries with explicit permission checks, not only UI hiding.

---

## 10. AI Governance

AI boundaries remain consistent.

AI may:

- suggest missing information;
- recommend standardized role names;
- highlight incomplete profile sections;
- identify possible scheduling conflicts;
- recommend shifts;
- suggest reminders;
- surface review prompts.

AI must not:

- verify identity;
- verify licenses;
- verify certifications;
- approve background checks;
- approve workers;
- assign work;
- accept shifts;
- approve attendance;
- approve timesheets;
- calculate final payment;
- discipline workers;
- expose protected or sensitive information.

No reviewed page gives AI final authority.

---

## 11. Assignment Readiness

The architecture keeps assignment readiness as a sequence, not a single state.

```text
Available
↓
Eligible
↓
Offered
↓
Accepted
↓
Worked
↓
Paid
```

| State | Source / Future Owner | Boundary |
| --- | --- | --- |
| Available | Page 022 Availability Calendar | Worker has indicated time availability. This is not assignment eligibility. |
| Eligible | Future matching / eligibility logic | Must consider profile, credentials, licenses, certifications, background-check status, role requirements, location, timing, and rules. |
| Offered | Future shift discovery / offer workflow | An opportunity is presented. This is not acceptance. |
| Accepted | Future acceptance workflow | Worker has accepted or been confirmed according to approved process. This is not attendance. |
| Worked | Future attendance / shift workflow | Check-in, active shift, check-out, and attendance events. This is not payroll. |
| Paid | Future earnings / payment workflow | Payment status after timesheet and finance process. This is not attendance itself. |

No current page collapses these states. Page 023 must preserve this model.

---

## 12. Design Consistency

| Area | Assessment |
| --- | --- |
| Terminology | Strong. The reviewed pages consistently distinguish verification, review, approval, eligibility, assignment, and payment. |
| Navigation | Strong. Worker pages remain within worker portal scope. |
| Status Models | Strong, but future pages should reuse controlled status language. |
| Review States | Strong. Pending, reviewed, verified where applicable, correction requested, and unavailable remain distinguishable. |
| Visual Hierarchy | Strong. Dashboard priority model correctly separates primary, secondary, and tertiary information. |
| Mobile Consistency | Strong. The reviewed pages preserve mobile-first hierarchy. |
| Accessibility Consistency | Strong. All pages include accessibility considerations and state-specific guidance. |

Medium: A shared worker-status vocabulary should be maintained as future pages introduce offers, assignments, attendance, timesheets, and earnings.

---

## 13. International Readiness

The reviewed pages are internationally ready at the wireframe level.

No reviewed page hardcodes:

- one country's employment model;
- one background-check regime;
- one professional-licensing regime;
- one payroll model;
- one emergency number;
- one tax model;
- country-specific legal guarantees.

Country-specific rules remain future configuration and legal/compliance work.

---

## 14. Risks

| Risk | Severity | Description | Recommendation |
| --- | --- | --- | --- |
| Combined eligibility badge | High | Future shift pages may be tempted to reduce readiness into one opaque status. | Keep eligibility explainable and separate from availability, approval, and assignment. |
| Document responsibility duplication | High | Licenses, certifications, and background checks may all need supporting documents. | Keep sensitive document storage and evidence handling in the Documents workflow. |
| Permission leakage | High | Employer-visible summaries may accidentally expose worker-only or platform-only data. | Require explicit permission and visibility matrices before implementation. |
| AI scope creep | High | AI recommendations could be mistaken for approvals. | Keep AI outputs labeled as suggestions and require human decision points. |
| Status vocabulary drift | Medium | Later pages may introduce inconsistent words for the same state. | Maintain a shared worker status glossary. |
| Availability vs assignment confusion | Medium | Workers may believe setting availability guarantees offers. | Future Page 023 should reinforce availability does not equal assignment. |
| Offline behavior complexity | Medium | Calendar and attendance flows will require careful offline design later. | Add offline validation before implementation. |
| International rule variation | Medium | License, certification, background-check, and payroll rules vary by jurisdiction. | Keep all legal and operational rules configurable and reviewed. |

No Critical risks were found.

---

## 15. Scoring

| Category | Score |
| --- | ---: |
| Architecture | 9.6 |
| UX consistency | 9.4 |
| Compliance | 9.7 |
| Privacy | 9.8 |
| AI governance | 9.8 |
| Accessibility | 9.4 |
| International readiness | 9.6 |
| Operational readiness | 9.4 |
| Future implementation readiness | 9.2 |
| Overall Epic 3 score | 9.6 |

---

## 16. Recommendations

### Critical

None.

### High

1. Preserve readiness as a multi-factor model on Page 023.
   - Page 023 should explain why a shift is recommended, unavailable, blocked, or requires review without creating a single misleading eligibility badge.

2. Keep supporting documents in the Documents workflow.
   - Pages 019-021 may reference documents, but the future Documents page should own upload, evidence, retention, visibility, and review controls.

3. Add implementation-stage permission matrices before building worker pages.
   - Employer-visible, worker-only, and platform-only fields must be enforced in backend and API design.

4. Maintain strict AI labels.
   - Recommendations must remain visibly advisory and must not look like assignments, approvals, or financial decisions.

### Medium

1. Create a shared worker-status vocabulary before assignment and attendance pages are implemented.
2. Use the Worker Dashboard as a readiness summary, not a source of truth.
3. Add timezone and offline-readiness review before implementing calendar, shift, or attendance flows.
4. Ensure mobile views preserve the "what do I need to do now?" priority pattern.

### Low

1. Perform a visual consistency audit after several more Worker Portal pages are approved.
2. Consider future progressive disclosure for complex compliance explanations.
3. Add non-blocking design debt entries for richer educational help text where needed.

---

## 17. Validation

- Pass: No approved pages were modified.
- Pass: No implementation work was started.
- Pass: No React components were created.
- Pass: No backend logic was created.
- Pass: No APIs were created.
- Pass: No database models were created.
- Pass: No new wireframes were created.
- Pass: No Page 023 wireframe, review, approval record, or implementation artifact was created during this review.
- Pass: Frozen architecture was respected.
- Pass: No commit was created.
- Pass: No push, merge, or deployment was performed.

---

## 18. Final Status

```text
Epic 3 READY to continue to Page 023
```

Page 023 remains uncreated at the wireframe gate and must begin only as the next controlled gate.
