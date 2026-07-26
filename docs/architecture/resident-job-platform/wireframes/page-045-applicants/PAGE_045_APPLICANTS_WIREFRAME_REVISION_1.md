# Resident Job

## Page 045 - Applicants Wireframe Revision 1

**Status:** Approved Wireframe Candidate  
**Revision Scope:** Controlled Revision 1  
**Original Wireframe:** `PAGE_045_APPLICANTS_LOW_FIDELITY_WIREFRAME.md`  
**Implementation:** Not Started  
**Page 046:** Unblocked after approval, not created

---

## 1. Summary of Revision

Revision 1 strengthens Page 045 in the owner-approved areas:

- applicant lifecycle governance
- employer review workflow
- human decision authority
- applicant privacy
- qualification truthfulness
- filtering and comparison boundaries
- auditability
- AI separation
- fairness
- readiness for Page 046 - Assigned Worker

No redesign was introduced. Page 045 remains applicant review only.

---

## 2. Applicant Lifecycle Governance

Applicant states must remain visibly independent:

- application submitted
- application received
- employer review
- shortlisted
- clarification requested
- offer pending
- accepted
- declined
- withdrawn
- closed

Clarify:

```text
Applied != Shortlisted
Shortlisted != Approved
Approved != Assigned
Assigned != Confirmed
Confirmed != Checked in
```

No applicant lifecycle state may imply assignment, confirmation, attendance, payroll, billing, or payment.

---

## 3. Human Decision Boundary

Employer decisions remain explicit and human-controlled.

Represent separately:

- viewed
- reviewed
- shortlisted
- declined
- clarification requested
- moved to assignment

Clarify:

```text
Employer review != Assignment
Shortlist != Offer
Offer != Acceptance
Move to assignment != Assigned Worker
```

The page may route to Page 046 / assignment workflow, but it must not complete the assignment.

---

## 4. Qualification Truthfulness

Represent qualifications as governed review information:

- licence
- certification
- background check
- availability
- required training
- document status

Clarify:

```text
Visible qualification != Verified
Verified != Eligible
Eligible != Assigned
```

Applicant review may display qualification context, but final eligibility and assignment remain outside Page 045.

---

## 5. Filtering Boundary

Filtering may use only governed criteria.

Allowed conceptual filters:

- availability
- qualification
- licence
- certification
- language where lawful and operationally necessary
- distance where governed
- application date
- department
- residence
- shift

Filtering must not use:

- protected characteristics
- health information
- complaints
- disputes
- retaliation indicators

Clarify:

```text
Filter result != Hiring recommendation
Filtered list != Ranked list
Hidden by filter != Rejected
```

Filters must remain employer-controlled and reversible.

---

## 6. Comparison Boundary

Applicant comparison is informational only.

The comparison view may show:

- applicant status
- availability fit
- licence status
- certification status
- required training status
- visible conflicts
- document status
- clarification needed

It must not:

- compute hidden scores
- automatically rank
- automatically reject
- hide applicants
- create AI hiring decisions
- make rating the sole comparison factor

Employer judgment remains authoritative.

---

## 7. Privacy

Employers must never see:

- banking information
- tax information
- protected complaints
- internal investigations
- private disputes
- unrelated employment history
- protected health information
- internal moderation notes

Only minimum necessary hiring information may appear.

Applicant detail panels must clearly distinguish:

```text
Employer-visible information
Platform-only information
Worker-private information
```

Platform-only and worker-private information must not be exposed in applicant review.

---

## 8. AI Boundary

Page 045 owns no AI decision-making.

AI suggestions remain on Page 044 only.

Page 045 may display only employer-controlled review actions.

Clarify:

```text
AI suggestion != Employer decision
Employer decision != Assignment
```

Page 045 must not duplicate AI worker suggestions, AI ranking, AI rejection, AI scoring, or AI assignment behavior.

---

## 9. Fairness

Applicant review must explicitly prohibit considering:

- race
- ethnicity
- religion
- disability
- sex
- gender identity
- sexual orientation
- family status
- protected complaints
- retaliation indicators

Clarify:

```text
Low rating != Automatic rejection
Complaint history != Reduced consideration
Dispute history != Reduced consideration
Accessibility feature use != Reduced consideration
```

Employer notes and decline reasons must not introduce protected or retaliatory criteria.

---

## 10. Auditability

Auditability must conceptually preserve:

- applicant review
- shortlist
- clarification
- decline
- archive
- move to assignment

Audit records include:

- actor
- role
- timestamp
- action
- applicant reference
- prior state
- resulting state

Optional where applicable:

- reason
- source shift reference
- clarification reference
- support escalation reference

Do not log protected information or private worker documents.

---

## 11. Page 046 Boundary

Page 045 owns:

```text
Applicant Review
```

Page 046 owns:

```text
Assigned Worker
```

Page 045 may expose a controlled route:

```text
Move to assignment workflow
```

But this action does not assign the worker and does not confirm the assignment.

Do not introduce assignment management into Page 045.

---

## 12. Revised Low-Fidelity Structure

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ Applicants                                                                 │
│ Human-controlled applicant review. Assignment happens in Page 046.           │
├───────────────────────────────────────────────┬─────────────────────────────┤
│ Applicant Queue                               │ Governance Panel            │
│                                               │                             │
│ Tabs                                          │ Lifecycle                   │
│ New | Review | Shortlisted | Clarification    │ Applied != Shortlisted      │
│ Offer Pending | Accepted | Declined | Closed  │ Shortlisted != Assigned     │
│                                               │                             │
│ Filters                                       │ Privacy                     │
│ Availability | Licence | Certification        │ Minimum necessary info only │
│ Department | Residence | Shift                │                             │
│                                               │ Fairness                    │
│ Applicant Cards                               │ No protected characteristics│
│ ┌───────────────────────────────────────────┐ │ No retaliation indicators   │
│ │ Applicant reference                        │ │                             │
│ │ Status: Under review                       │ │ AI Separation              │
│ │ Qualification: visible summary             │ │ AI suggestions live on     │
│ │ Availability: visible summary              │ │ Page 044 only.             │
│ │ Conflict: none visible / review required   │ │                             │
│ │ Actions: Review | Shortlist | Clarify      │ │ Page 046 Boundary          │
│ │          Decline | Archive | Move forward  │ │ Move forward != Assigned   │
│ └───────────────────────────────────────────┘ │                             │
├───────────────────────────────────────────────┴─────────────────────────────┤
│ Review selected | Compare selected | Request clarification | Move forward    │
│ Reviewed != Shortlisted. Shortlisted != Offer. Offer != Acceptance.          │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 13. Conditions Resolved

Revision 1 resolves the documented conditions:

- Applicant lifecycle remains truthful.
- Employer decisions remain human-controlled.
- Qualifications remain governed.
- Filtering remains fair.
- Comparison remains informational.
- Privacy is preserved.
- Page 046 ownership is preserved.
- Auditability is complete.
- AI remains advisory only and owned by Page 044.
- No governance, privacy, operational, or compliance risks remain in wireframe scope.

---

## 14. Validation

Confirmed:

- Pages 001-044 remain frozen.
- Original Page 045 wireframe remains intact.
- Architecture Freeze unchanged.
- Employer Portal planning unchanged.
- UX Foundation unchanged.
- Navigation unchanged.
- Page 046 not created.
- No implementation started.
- No React created.
- No frontend created.
- No backend created.
- No APIs created.
- No database changes created.
- No assignment engine created.
- No staffing engine created.
- No payroll created.
- No billing created.
- No notifications created.
- No messaging created.
- No AI automation created.

---

## 15. Final Status

```text
Page 045 — Applicants
Revision 1: COMPLETE
Approval Record: CREATED IN SEPARATE FILE
Status: APPROVED WIREFRAME v1.0

Page 046 — Assigned Worker
UNBLOCKED
NOT CREATED
```
