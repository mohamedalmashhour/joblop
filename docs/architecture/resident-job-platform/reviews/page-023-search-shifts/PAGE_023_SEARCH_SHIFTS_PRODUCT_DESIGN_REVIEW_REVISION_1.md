# Page 023 - Search Shifts Product Design Review Revision 1

Status: Product Design Review Revision 1 complete
Epic: Epic 3 - Worker Portal
Page: 023 - Search Shifts
Wireframe reviewed: PAGE_023_SEARCH_SHIFTS_WIREFRAME_REVISION_1.md
Architecture baseline: Resident Job Architecture Phase 1 v1.0
Epic planning baseline: Epic 3 Worker Portal Planning v1.0
Implementation: Not authorized

## 1. Executive Summary

Page 023 Revision 1 resolves the documented owner conditions. The revised wireframe now separates
discovery, suitability, eligibility, and application state; explains the verified-worker boundary;
strengthens compensation transparency; keeps requirement gaps actionable but privacy-safe; and
preserves Page 024 - Shift Details as the deeper review surface.

The page now functions as a controlled worker shift-discovery surface, not a generic job board and
not an assignment engine.

Recommendation:

```text
APPROVE AS APPROVED WIREFRAME v1.0
```

## 2. Condition Resolution Review

| Condition | Review finding | Status |
| --- | --- | --- |
| Discovery, suitability, eligibility, and application remain independent | Four-layer model added and repeated in desktop/mobile cards. | Resolved |
| Verified worker cannot be mistaken for universal eligibility | Verified-worker boundary and separate worker states added. | Resolved |
| Search result card includes required placeholders | Role, residence, location, date, time, timezone, duration, compensation, requirements, urgency, deadline, application state, eligibility summary, and change indicators included. | Resolved |
| Compensation truthful and properly separated | Worker pay, premiums, travel, reimbursement, estimated gross, net-pay boundary, employer billing boundary, and platform margin boundary included. | Resolved |
| Filters and ranking transparent | Hard filters separated from preference sorting; silent hiding is prohibited. | Resolved |
| Requirement gaps actionable and privacy-safe | Safe summaries and next actions added; sensitive background-check details excluded. | Resolved |
| Availability separate from assignment | Page 022 confirmed as authoritative source; availability match does not equal assignment eligibility. | Resolved |
| Application boundary clear | Safest flow and after-apply state progression added. | Resolved |
| Urgent shifts do not bypass protections | Same-day and urgent guardrails added. | Resolved |
| Employer/residence visibility governed | Allowed and prohibited employer/residence information added. | Resolved |
| AI explainable and non-discriminatory | AI allowed/prohibited list added; opaque "Best for you" claims avoided. | Resolved |
| Saved searches and alerts safe | Alerts require explicit confirmation and do not guarantee availability. | Resolved |
| Empty and error states complete | Required states and next actions added. | Resolved |
| Privacy boundaries explicit | Worker-only, employer-visible, and platform-only data separation added. | Resolved |
| Mobile usability improved | Compact card model preserves role, time, pay, eligibility, and action clarity. | Resolved |
| Accessibility complete | Search/filter/results/sorting/status/compensation accessibility requirements added. | Resolved |
| International readiness complete | Currency, locale, role, distance, credential, background-check, and labour-rule assumptions remain configurable. | Resolved |

## 3. Strengths

### 3.1 Operational Search Model

The page no longer treats search visibility as eligibility. The four-layer model creates a strong
foundation for future implementation:

```text
Discoverable
↓
Potentially suitable
↓
Eligibility status
↓
Application state
```

### 3.2 Worker Trust

Workers can see why a shift appears without being promised selection, assignment, final pay, or
universal eligibility.

### 3.3 Compensation Integrity

The revised page follows the Financial UX Standard by distinguishing:

- worker pay from employer billing;
- gross estimate from final pay;
- travel allowance from wages;
- known compensation from unavailable compensation.

### 3.4 Privacy

The page keeps worker search behavior, private preferences, viewed shifts, private location
preferences, and reasons for unavailability worker-only.

### 3.5 Page 024 Boundary

The search result card provides enough context for discovery but does not duplicate the full Shift
Details page.

## 4. Remaining Risks

No remaining risks block approval at wireframe level.

Future implementation and launch risks:

| Risk | Classification | Future control |
| --- | --- | --- |
| Eligibility logic may become opaque | Implementation risk | Require explainable eligibility and audit evidence. |
| Ranking may unintentionally hide shifts | Implementation risk | Separate hard filters from preference sort and log ranking policy. |
| Compensation data may be incomplete | Implementation risk | Label unavailable, estimated, pending, and known values. |
| Employer visibility may leak private worker data | Security/privacy risk | Enforce backend permission checks and field-level visibility. |
| Notification alerts may become spammy or confusing | Product risk | Require explicit opt-in and channel/frequency controls. |

These are not wireframe defects.

## 5. Scorecard

| Category | Score |
| --- | ---: |
| Discovery clarity | 9.7 |
| Suitability versus eligibility | 9.8 |
| Verified-worker meaning | 9.7 |
| Compensation transparency | 9.6 |
| Filters and ranking | 9.5 |
| Requirement-gap explanation | 9.6 |
| Availability relationship | 9.8 |
| Application boundary | 9.7 |
| Urgent-shift safety | 9.5 |
| Employer information | 9.4 |
| Privacy | 9.7 |
| AI governance | 9.8 |
| Mobile usability | 9.5 |
| Accessibility | 9.5 |
| International readiness | 9.7 |
| Operational readiness | 9.6 |
| Consistency with Pages 016-022 | 9.8 |
| Handoff to Page 024 Shift Details | 9.7 |
| Overall score | 9.7 |

## 6. Governance Review

| Governance area | Result |
| --- | --- |
| Architecture Freeze unchanged | Pass |
| Epic 3 Planning unchanged | Pass |
| UX Foundation unchanged | Pass |
| Navigation unchanged | Pass |
| Pages 016-022 unchanged | Pass |
| EPIC_3_MID_ARCHITECTURE_REVIEW.md unchanged | Pass |
| No Page 024 files created | Pass |
| No implementation started | Pass |
| No React/frontend/backend/API/database work | Pass |
| Unrelated app changes untouched | Pass |

## 7. Approval Recommendation

Page 023 satisfies the approval rule:

- Discovery, suitability, eligibility, and application states remain independent.
- "Verified worker" cannot be mistaken for universal eligibility.
- Compensation is truthful and properly separated.
- Requirement gaps are actionable but privacy-safe.
- Availability remains separate from assignment.
- Urgent shifts do not bypass worker protections.
- AI matching is explainable and non-discriminatory.
- Search Shifts does not duplicate Page 024.
- No governance, financial, privacy, or operational risk remains at wireframe level.

## 8. Final Review Status

```text
Page 023 - Search Shifts
Product Review Revision 1: COMPLETE
Recommendation: APPROVE AS APPROVED WIREFRAME v1.0

Page 024 - Shift Details
May be unblocked only after the approval record is created.
```
