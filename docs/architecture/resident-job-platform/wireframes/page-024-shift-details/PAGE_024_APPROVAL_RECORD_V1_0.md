# Page 024 - Shift Details Approval Record v1.0

Page: 024 - Shift Details
Epic: Epic 3 - Worker Portal
Version: Approved Wireframe v1.0
Status: APPROVED WIREFRAME v1.0
Approval date: 2026-07-22
Implementation: Not authorized

## 1. References

- Architecture baseline: Resident Job Architecture Phase 1 v1.0.
- UX Foundation baseline: Resident Job UX Foundation.
- Epic planning baseline: Epic 3 Worker Portal Planning v1.0.
- Frozen architecture page: pages/PAGE_024_SHIFT_DETAILS.md.
- Initial wireframe: PAGE_024_SHIFT_DETAILS_LOW_FIDELITY_WIREFRAME.md.
- Initial product review: PAGE_024_SHIFT_DETAILS_PRODUCT_DESIGN_REVIEW.md.
- Approved revision: PAGE_024_SHIFT_DETAILS_WIREFRAME_REVISION_1.md.
- Product review revision: PAGE_024_SHIFT_DETAILS_PRODUCT_DESIGN_REVIEW_REVISION_1.md.
- Worker compliance reference: WORKER_COMPLIANCE_RELATIONSHIP_MAP.md.
- Mid-epic architecture review: EPIC_3_MID_ARCHITECTURE_REVIEW.md.

## 2. Approved Scope

Page 024 defines the authenticated worker Shift Details experience.

Approved capabilities at wireframe level:

- Present the authoritative worker-facing shift record before application.
- Label confirmed, estimated, pending, and unavailable shift information.
- Show shift status, last material update, and material change history.
- Explain viewing, applying, selection, assignment, acceptance, work, and payment states.
- Present worker-facing compensation without exposing employer billing or platform margin.
- Distinguish urgent/same-day worker pay, client charge, travel compensation, and reimbursement.
- Summarize duties and scope of work without exposing resident or medical information.
- Review shift requirements and worker-known status without making legal conclusions.
- Preserve role and safety boundaries.
- Show approved workplace, travel, and location information.
- Use Page 022 as the authoritative availability source.
- Support informed application confirmation without bundled or preselected consent.
- Separate application withdrawal, shift cancellation, accepted-assignment cancellation, and no-show
  concepts.
- Summarize only approved shift policies.
- Show truthful employer/residence information without fabricated trust claims.
- Preserve worker privacy and platform-only information.
- Keep AI subordinate to the structured shift record.

## 3. Approval Basis

The approved revision satisfies all documented owner conditions:

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

## 4. Explicit Boundaries

Shift Details does not:

- Submit an application automatically.
- Assign a worker.
- Accept an assignment.
- Guarantee employment.
- Guarantee eligibility.
- Guarantee selection.
- Guarantee final pay.
- Negotiate compensation.
- Verify credentials.
- Authorize regulated practice.
- Provide clinical instructions.
- Modify availability.
- Own attendance.
- Own timesheets.
- Own payroll.
- Expose employer billing.
- Expose platform margin.
- Expose private resident information.
- Expose confidential facility details before the approved stage.

## 5. Launch / Implementation Conditions

These are future implementation or launch-governance conditions, not wireframe defects:

- Shift-detail data model and API implementation.
- Material-change detection and audit logging.
- Field-level visibility and staged address/instruction disclosure.
- Compensation configuration and display rules.
- Requirement-status and eligibility explanation engine.
- Availability conflict integration with Page 022.
- Application handoff to Page 025.
- Offline/stale state handling.
- Accessibility QA for material-change alerts, confirmations, and compensation labels.
- Internationalization for currency, date/time, timezone, language, and distance units.

## 6. Explicit Non-Authorization

This approval does not authorize:

- React.
- Frontend implementation.
- Backend implementation.
- APIs.
- Database models.
- Shift application implementation.
- Assignment implementation.
- Attendance implementation.
- Payroll implementation.
- Production data.
- Deployment.

## 7. Next Gate

Page 025 - Apply is unblocked as the next controlled gate.

Page 025 has not been created.
