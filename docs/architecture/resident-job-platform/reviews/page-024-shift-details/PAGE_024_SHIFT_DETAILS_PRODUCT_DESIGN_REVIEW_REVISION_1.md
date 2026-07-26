# Page 024 - Shift Details Product Design Review Revision 1

Status: Product Design Review Revision 1 complete
Epic: Epic 3 - Worker Portal
Page: 024 - Shift Details
Wireframe reviewed: PAGE_024_SHIFT_DETAILS_WIREFRAME_REVISION_1.md
Architecture baseline: Resident Job Architecture Phase 1 v1.0
Epic planning baseline: Epic 3 Worker Portal Planning v1.0
Implementation: Not authorized

## 1. Executive Summary

Page 024 Revision 1 resolves the documented owner conditions. The revised wireframe now defines
Shift Details as the authoritative worker-facing record before application, labels confirmed,
estimated, pending, and unavailable information, separates worker compensation from employer
billing, and makes application consent, material changes, workplace safety, travel expectations,
requirements, privacy, and AI boundaries explicit.

The page is ready to be approved as the baseline Shift Details wireframe.

Recommendation:

```text
APPROVE AS APPROVED WIREFRAME v1.0
```

## 2. Condition Resolution Review

| Condition | Review finding | Status |
| --- | --- | --- |
| Authoritative shift record | Complete structured shift record added with confidence labels. | Resolved |
| Shift status and change history | Truthful shift states and material-change handling added. | Resolved |
| Compensation breakdown | Worker compensation separated into rate, premiums, travel, reimbursement, gross estimate, and payment summary. | Resolved |
| Urgent same-day pricing boundary | Client charge, worker pay, travel, reimbursement, currency, recipient, and estimate/confirmation boundaries added. | Resolved |
| Duties and scope of work | Approved duty summary, responsibility, exclusions, and role-scope warning added. | Resolved |
| Qualification and requirement review | Requirement/status/action matrix added. | Resolved |
| Role and safety boundary | Regulated/safety-sensitive scope reminder and support path added. | Resolved |
| Workplace information | Approved workplace information and sensitive-instruction boundary added. | Resolved |
| Travel and location | Travel estimate, distant-site, allowance, live-location, and reimbursement boundaries added. | Resolved |
| Availability and conflict review | Page 022 remains authoritative and availability does not equal eligibility or acceptance. | Resolved |
| Application confirmation | Review checklist added with no preselected or bundled consent. | Resolved |
| Application data boundary | Page 024 does not duplicate onboarding or Page 025 Apply. | Resolved |
| Cancellation, withdrawal, and change terms | Before/after assignment concepts separated. | Resolved |
| Shift policies | Policy-summary boundaries added with approved-source requirement. | Resolved |
| Employer information and trust | Truthful-only employer information and prohibited claims added. | Resolved |
| Privacy boundaries | Worker-only, employer-visible, and platform-only data separation added. | Resolved |
| AI boundaries | AI remains subordinate to structured record and cannot decide, apply, accept, waive, or fabricate. | Resolved |
| Material information unavailable | Critical missing information handling added. | Resolved |
| Error and edge states | Required edge states added. | Resolved |
| Mobile decision usability | Mobile prioritizes role, time, location, pay, status, requirements, conflicts, action, and material changes. | Resolved |
| Accessibility | Semantic, compensation, requirement, warning, confirmation, and status accessibility included. | Resolved |
| International readiness | Jurisdiction, role, pay, policy, currency, date/time, distance, and labour assumptions remain configurable. | Resolved |
| Handoff boundaries | Page 024 connects from Search Shifts and hands off to future workflows without owning them. | Resolved |

## 3. Strengths

### 3.1 Strong Authoritative Record

The page now clearly defines itself as the worker-facing source of truth before application. It
avoids relying on search-card summaries for informed worker decisions.

### 3.2 Compensation Trust

Worker pay, premiums, travel compensation, allowances, reimbursements, and estimated gross are
separated. Employer billing, platform margin, credit terms, and internal pricing calculations remain
hidden.

### 3.3 Safety and Scope

The revised duties and safety sections prevent the page from implying clinical instructions,
regulated-work authorization, or permission to work outside role, licence, training, or assignment
scope.

### 3.4 Application Consent

The page now makes the pre-application review sequence explicit:

```text
Review shift
↓
Review requirements and known gaps
↓
Confirm application information
↓
Apply
```

Application submitted remains separate from shift assignment.

### 3.5 Privacy

Viewing a shift does not expose private worker data to employers. Employer visibility begins only
after the approved application or staffing workflow.

## 4. Remaining Risks

No remaining risks block approval at wireframe level.

Future implementation and launch risks:

| Risk | Classification | Future control |
| --- | --- | --- |
| Material changes after application may be mishandled | Implementation risk | Require change detection, re-review, and audit logging. |
| Compensation may be incomplete or stale | Financial UX risk | Label estimated, confirmed, pending, and unavailable values. |
| Sensitive workplace details may display too early | Privacy/security risk | Enforce staged visibility rules. |
| Requirement explanations may drift into legal conclusions | Compliance risk | Keep requirement status descriptive and source-backed. |
| AI summaries may conflict with structured record | AI governance risk | Structured record must remain authoritative. |

These are implementation and launch-governance risks, not wireframe defects.

## 5. Scorecard

| Category | Score |
| --- | ---: |
| Authoritative shift-record clarity | 9.8 |
| Shift-change transparency | 9.7 |
| Compensation breakdown | 9.8 |
| Urgent-pricing boundaries | 9.7 |
| Duties and scope | 9.6 |
| Requirement-gap explanation | 9.7 |
| Safety | 9.6 |
| Travel | 9.6 |
| Availability relationship | 9.8 |
| Informed application | 9.7 |
| Cancellation and change terms | 9.6 |
| Employer trust claims | 9.5 |
| Privacy | 9.8 |
| AI governance | 9.8 |
| Mobile decision usability | 9.6 |
| Accessibility | 9.6 |
| International readiness | 9.7 |
| Operational readiness | 9.7 |
| Consistency with Pages 016-023 | 9.8 |
| Handoff to future application and assignment workflows | 9.7 |
| Overall score | 9.7 |

## 6. Governance Review

| Governance area | Result |
| --- | --- |
| Frozen title remains Shift Details | Pass |
| Architecture Freeze unchanged | Pass |
| Epic 3 Planning unchanged | Pass |
| UX Foundation unchanged | Pass |
| Navigation unchanged | Pass |
| Pages 016-023 unchanged | Pass |
| EPIC_3_MID_ARCHITECTURE_REVIEW.md unchanged | Pass |
| No Page 025 files created | Pass |
| No implementation started | Pass |
| No React/frontend/backend/API/database work | Pass |
| Unrelated app changes untouched | Pass |

## 7. Approval Recommendation

Page 024 satisfies the approval rule:

- The shift record is complete and truthful.
- Estimated and confirmed information are distinguished.
- Worker pay is separate from employer billing.
- Requirements and worker status remain independent.
- Applying cannot be mistaken for assignment.
- Changing availability cannot modify commitments.
- Material shift changes are visible.
- Cancellation and withdrawal concepts are separate.
- Sensitive data is protected.
- AI cannot fabricate, apply, accept, or waive requirements.
- Page 024 does not absorb attendance or payroll responsibilities.
- No governance, financial, safety, privacy, or operational risk remains at wireframe level.

## 8. Final Review Status

```text
Page 024 - Shift Details
Product Review Revision 1: COMPLETE
Recommendation: APPROVE AS APPROVED WIREFRAME v1.0

Page 025
May be unblocked only after the approval record is created.
```
