# Page 023 - Search Shifts Approval Record v1.0

Page: 023 - Search Shifts
Epic: Epic 3 - Worker Portal
Version: Approved Wireframe v1.0
Status: APPROVED WIREFRAME v1.0
Approval date: 2026-07-22
Implementation: Not authorized

## 1. References

- Architecture baseline: Resident Job Architecture Phase 1 v1.0.
- UX Foundation baseline: Resident Job UX Foundation.
- Epic planning baseline: Epic 3 Worker Portal Planning v1.0.
- Frozen architecture page: pages/PAGE_023_SEARCH_SHIFTS.md.
- Initial wireframe: PAGE_023_SEARCH_SHIFTS_LOW_FIDELITY_WIREFRAME.md.
- Initial product review: PAGE_023_SEARCH_SHIFTS_PRODUCT_DESIGN_REVIEW.md.
- Approved revision: PAGE_023_SEARCH_SHIFTS_WIREFRAME_REVISION_1.md.
- Product review revision: PAGE_023_SEARCH_SHIFTS_PRODUCT_DESIGN_REVIEW_REVISION_1.md.
- Worker compliance reference: WORKER_COMPLIANCE_RELATIONSHIP_MAP.md.
- Mid-epic architecture review: EPIC_3_MID_ARCHITECTURE_REVIEW.md.

## 2. Approved Scope

Page 023 defines the authenticated worker Search Shifts experience.

Approved capabilities at wireframe level:

- Search and discover worker-facing shift opportunities.
- Filter by role, department, date, time, location, travel, compensation, duration, urgency,
  recurring opportunities, employer/residence type, qualification requirement, availability match,
  and application status.
- Distinguish hard filters from preference-based sorting.
- Show shift cards with role, employer/residence, location, date, time, timezone, duration,
  compensation, travel context, requirements, urgency, deadline, application state, eligibility or
  requirement summary, and change indicators where relevant.
- Distinguish discoverable, potentially suitable, eligibility status, and application state.
- Explain requirement gaps with privacy-safe summaries and next actions.
- Display worker-facing compensation without exposing employer billing or platform margin.
- Preserve Page 022 as the authoritative availability source.
- Preserve Page 024 as the full Shift Details page.
- Show urgent and same-day shifts without pressure tactics or bypassed protections.
- Support saved searches and alerts as explicit user-controlled preferences only.
- Keep AI matching explainable, advisory, and non-discriminatory.

## 3. Approval Basis

The approved revision satisfies all documented owner conditions:

- Discovery, suitability, eligibility, and application states remain independent.
- "Verified worker" cannot be mistaken for universal eligibility.
- Compensation is truthful and properly separated.
- Requirement gaps are actionable but privacy-safe.
- Availability remains separate from assignment.
- Urgent shifts do not bypass worker consent, qualification checks, availability review, shift-detail
  review, or safety information.
- AI matching is explainable and non-discriminatory.
- The search page does not duplicate Page 024.
- No governance, financial, privacy, or operational risk remains at wireframe level.

## 4. Explicit Boundaries

Search Shifts does not:

- Assign a worker.
- Accept a shift for a worker.
- Guarantee employer review.
- Guarantee selection.
- Guarantee final pay.
- Verify identity.
- Verify credentials.
- Approve licences.
- Approve certifications.
- Approve background checks.
- Override availability.
- Expose employer billing.
- Expose platform margin.
- Expose private worker search behavior to employers.
- Expose exact live worker location.

## 5. Launch / Implementation Conditions

These are future implementation or launch-governance conditions, not wireframe defects:

- Search and ranking implementation.
- Eligibility explanation engine.
- Permission model and field-level visibility.
- Compensation configuration and display rules.
- Saved-search and notification implementation.
- Stale/offline result handling.
- Accessibility QA for filters and dynamic result updates.
- Internationalization, currency, timezone, and distance-unit formatting.
- Audit logging for protected actions.

## 6. Explicit Non-Authorization

This approval does not authorize:

- React.
- Frontend implementation.
- Backend implementation.
- APIs.
- Database models.
- Matching implementation.
- Notification implementation.
- Eligibility engine.
- Payment or payroll logic.
- Production data.
- Deployment.

## 7. Next Gate

Page 024 - Shift Details is unblocked as the next controlled gate.

Page 024 has not been created.
