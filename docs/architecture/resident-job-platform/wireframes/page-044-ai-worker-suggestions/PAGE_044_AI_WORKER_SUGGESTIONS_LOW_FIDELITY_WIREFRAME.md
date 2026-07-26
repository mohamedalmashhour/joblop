# Resident Job

## Page 044 - AI Worker Suggestions

**Status:** Low-Fidelity Wireframe Complete  
**Owner Review:** Required  
**Approval Record:** Not Created  
**Implementation:** Not Started  
**Page 045:** Blocked

---

## 1. Purpose

Page 044 designs the authenticated employer experience for reviewing advisory AI worker suggestions for a governed shift.

AI suggestions are advisory only.

The page may help an authorized employer identify potentially relevant workers for a governed shift, but it must not:

- assign workers
- publish shifts
- contact workers automatically
- rank workers using protected characteristics
- create hidden blacklists
- override licence, certification, background-check, availability, or jurisdiction rules
- treat ratings as the sole eligibility factor
- guarantee worker suitability
- guarantee worker acceptance
- replace the Applicants workflow
- replace employer judgment
- make final staffing decisions

---

## 2. Primary Users

Authorized employer users who may review advisory worker suggestions:

- organization owner
- administrator
- residence manager
- department manager
- scheduler
- staffing coordinator

Read-only observers may see permitted information only where authorized.

---

## 3. Source Shift Boundary

Every suggestion set must resolve from a governed shift record.

Clarify:

```text
Shift draft != Published shift
Shift requirement != Worker eligibility
Worker suggested != Worker invited
Worker invited != Worker applied
Worker applied != Worker assigned
```

Suggestions without a governed shift source must show an unavailable state rather than producing generic worker recommendations.

---

## 4. Information Architecture

### Desktop Structure

```text
Employer Shell
├── Top navigation
│   ├── Organization context
│   ├── Residence context
│   ├── User role
│   └── Notifications indicator
│
├── Page header
│   ├── AI Worker Suggestions
│   ├── Source shift reference
│   ├── Data freshness
│   └── AI advisory notice
│
├── Main suggestions workspace
│   ├── Source shift summary
│   ├── Suggestion generation state
│   ├── Suggestion cards
│   ├── Explainability details
│   ├── Requirement match / unconfirmed panel
│   ├── Visible conflicts
│   ├── Employer actions
│   └── Boundary notices
│
├── Right governance panel
│   ├── Human decision boundary
│   ├── Protected data exclusion notice
│   ├── Privacy notice
│   ├── Fairness notice
│   ├── AI limitations
│   └── Audit summary
│
└── Footer actions
    ├── Refresh Suggestions
    ├── Open Worker Details
    ├── Shortlist
    ├── Request Invitation
    └── Go to Applicants
```

### Mobile Structure

Mobile uses cards and progressive disclosure:

```text
AI Worker Suggestions
├── Source shift summary
├── Advisory AI notice
├── Suggestion state
├── Worker suggestion card
│   ├── match explanation
│   ├── requirements matched
│   ├── unconfirmed requirements
│   ├── visible conflicts
│   └── employer actions
└── Applicants workflow link
```

The first mobile screen must answer:

- Which shift are these suggestions for?
- Are suggestions available?
- Are suggestions advisory only?
- What action can the employer take next?

---

## 5. Suggestion Inputs

Represent only approved and explainable inputs:

- role compatibility
- licence status
- certification status
- background-check status
- availability
- scheduling conflict
- residence or department authorization
- jurisdiction
- distance or travel feasibility where governed
- prior assignment history where permitted
- worker preference where permitted
- language only where lawful and operationally necessary

Do not use:

- race
- ethnicity
- religion
- disability
- sex
- gender identity
- sexual orientation
- family status
- age except where legally required
- health information
- unrelated financial information
- protected complaints or disputes
- retaliation signals

---

## 6. Explainability

Every suggestion should conceptually show:

- why the worker appears
- which requirements match
- which requirements remain unconfirmed
- any visible conflict
- data freshness
- source record
- limitation notice

Clarify:

```text
Match indicator != Eligibility approval
High relevance != Best worker
No suggestion != Worker unsuitable
```

### Suggestion Card

```text
┌──────────────────────────────────────────────────────────────┐
│ Worker Suggestion                                            │
│ Name/worker reference: [Minimum necessary identity]           │
│ Advisory relevance: [Potential match / Review required]       │
│                                                              │
│ Why this appears                                             │
│ - Role compatibility: visible match                          │
│ - Availability: available for requested window                │
│ - Licence: status visible as governed                         │
│ - Certification: status visible as governed                   │
│                                                              │
│ Still needs review                                           │
│ - Background-check status: unconfirmed / review required      │
│ - Distance/travel feasibility: visible estimate only          │
│                                                              │
│ Visible conflicts                                            │
│ - Scheduling conflict / incomplete info / none visible        │
│                                                              │
│ Data freshness                                               │
│ - Last updated: [timestamp or freshness label]                │
│                                                              │
│ Actions                                                      │
│ [Open Details] [Shortlist] [Request Invitation] [Dismiss]     │
│                                                              │
│ Boundary: Suggested != Invited != Applied != Assigned         │
└──────────────────────────────────────────────────────────────┘
```

---

## 7. Independent States

### Suggestion Generation

- Not requested
- Requested
- Processing
- Available
- Partial
- Failed
- Unavailable

### Worker Relevance

- Potential match
- Requirements matched
- Review required
- Conflict detected
- Incomplete information
- Not currently available

### Employer Action

- Not reviewed
- Reviewed
- Shortlisted
- Invitation requested
- Dismissed
- Support required

### Invitation

- Not created
- Draft
- Sent through governed workflow
- Failed
- Withdrawn
- Unavailable

Do not collapse these into one generic "Recommended" status.

---

## 8. Human Decision Boundary

The employer must retain explicit control over:

- reviewing suggestions
- opening worker details
- shortlisting
- requesting an invitation
- proceeding to Applicants or later assignment workflows

AI must not perform these actions automatically.

Clarify:

```text
AI suggested != Human reviewed
Shortlisted != Invited
Invitation requested != Invitation sent
Invitation sent != Worker applied
Worker applied != Worker assigned
```

---

## 9. Worker Privacy

Employers may see only minimum-necessary staffing information.

Do not expose:

- private documents
- full background-check details
- banking information
- tax information
- private disputes
- internal moderation notes
- health information
- unrelated earnings
- unrelated employer history
- precise private location

The page should display privacy notes where sensitive context could be inferred.

---

## 10. Fairness and Retaliation Protection

Suggestion logic must not penalize workers for:

- filing complaints
- reporting safety issues
- disputing attendance
- disputing earnings or payments
- using accessibility features
- declining unrelated shifts
- limited availability outside the shift window

A low rating must not automatically exclude a worker.

Ratings, if visible, must be contextual and must never be the sole eligibility or recommendation factor.

---

## 11. Applicants Boundary

Page 044 does not own Applicants.

It may route to:

- Applicants
- worker details
- governed invitation workflow
- support

It must not:

- replace applicant review
- approve applications
- reject applicants
- assign workers
- create marketplace behavior
- publish shift visibility

Page 045 remains Applicants until a separate owner decision changes the architecture.

---

## 12. Auditability

Conceptually preserve:

- suggestion request
- input version
- model or rules version where governed
- suggestion result
- employer review
- shortlist
- dismissal
- invitation request
- override or exception

Audit records include:

- actor or system
- role
- timestamp
- action
- shift reference
- worker reference
- reason where applicable
- result

Do not log protected information or raw private documents.

---

## 13. AI Boundary

AI may:

- summarize governed worker-shift compatibility
- explain visible matching factors
- identify missing requirements
- flag visible scheduling conflicts
- help the employer navigate to the correct workflow

AI must never:

- decide final eligibility
- assign workers
- reject workers
- publish shifts
- contact workers without explicit authorized action
- fabricate credentials or availability
- infer protected characteristics
- create hidden reputation scores
- override compliance
- guarantee suitability or attendance

AI outputs must be explainable, evidence-aware, and labeled as recommendations, not decisions.

---

## 14. Empty and Error States

Represent:

- no governed source shift
- source shift unavailable
- suggestions not requested
- suggestions processing
- partial suggestions
- suggestions failed
- suggestions unavailable
- missing shift requirements
- missing worker data
- stale worker data
- privacy restriction
- support unavailable
- invitation unavailable

Do not fabricate worker suggestions.

---

## 15. Accessibility

The page must support:

- semantic card structure
- keyboard navigation
- screen-reader-friendly match explanations
- no color-only relevance indicators
- clear limitation notices
- accessible action buttons
- focus management
- sufficient contrast
- mobile-friendly touch targets
- plain-language AI explanation

---

## 16. International Readiness

Do not hardcode:

- worker role
- licence model
- certification model
- background-check model
- jurisdiction
- language requirement
- distance threshold
- rating model
- availability rule
- worker classification
- compliance rule

Keep role compatibility, licence policy, certification policy, background-check policy, jurisdiction, travel feasibility, worker preference, language requirement, and visibility configurable.

---

## 17. Validation

Confirmed:

- Frozen title remains AI Worker Suggestions.
- Pages 001-043 unchanged.
- Page 045 remains Applicants.
- No marketplace page created.
- No Page 045 files created.
- No approval record created.
- No implementation started.
- No React created.
- No frontend created.
- No backend created.
- No APIs created.
- No database changes created.
- No matching engine created.
- No ranking engine created.
- No invitation implementation created.
- No notification or messaging implementation created.
- No AI automation created.

---

## 18. Final Status

```text
Page 044 — AI Worker Suggestions
Wireframe: COMPLETE
Product Review: PENDING IN SEPARATE FILE
Approval Record: NOT CREATED
Owner Review: REQUIRED

Page 045 — Applicants
BLOCKED
```
