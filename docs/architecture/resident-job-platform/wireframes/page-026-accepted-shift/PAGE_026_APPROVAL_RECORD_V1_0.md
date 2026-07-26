# Page 026 - Accepted Shift Approval Record v1.0

Page: 026 - Accepted Shift
Epic: Epic 3 - Worker Portal
Version: Approved Wireframe v1.0
Status: APPROVED WIREFRAME v1.0
Approval date: 2026-07-22
Implementation: Not authorized

## 1. References

- Architecture baseline: Resident Job Architecture Phase 1 v1.0.
- UX Foundation baseline: Resident Job UX Foundation.
- Epic planning baseline: Epic 3 Worker Portal Planning v1.0.
- Frozen architecture page: pages/PAGE_026_ACCEPTED_SHIFT.md.
- Initial wireframe: PAGE_026_ACCEPTED_SHIFT_LOW_FIDELITY_WIREFRAME.md.
- Initial product review: PAGE_026_ACCEPTED_SHIFT_PRODUCT_DESIGN_REVIEW.md.
- Approved revision: PAGE_026_ACCEPTED_SHIFT_WIREFRAME_REVISION_1.md.
- Product review revision: PAGE_026_ACCEPTED_SHIFT_PRODUCT_DESIGN_REVIEW_REVISION_1.md.
- Worker compliance reference: WORKER_COMPLIANCE_RELATIONSHIP_MAP.md.
- Mid-epic architecture review: EPIC_3_MID_ARCHITECTURE_REVIEW.md.

## 2. Approved Scope

Page 026 defines the authenticated worker Accepted Shift experience.

Approved capabilities at wireframe level:

- Show accepted or confirmed commitment status.
- Explain the commitment lifecycle.
- Preserve the boundary between accepted commitment and attendance.
- Display accepted shift summary.
- Display material-change governance and acknowledgement status.
- Provide worker preparation checklist.
- Show check-in readiness without performing check-in.
- Display worker compensation summary without employer billing or platform margin.
- Clarify expected hours, approved hours, payroll, and payment boundaries.
- Provide cancellation, inability-to-attend, emergency, and support paths.
- Show employer change or cancellation impacts.
- Reinforce worker safety and scope-of-work boundaries.
- Preserve worker, employer-visible, and platform-only privacy boundaries.
- Keep AI assistance advisory and non-operative.

## 3. Approval Basis

The approved revision satisfies all documented owner conditions:

- Accepted commitment is clearly separated from arrival, check-in, worked shift, approved hours,
  payroll, and payment.
- Material changes require visible acknowledgement where appropriate.
- Worker preparation is complete and operationally useful.
- Compensation remains truthful and worker-facing only.
- Cancellation remains governed and is not immediate by default.
- Worker safety boundaries are clear.
- Privacy is preserved.
- AI cannot alter commitments, waive requirements, negotiate pay, edit hours, check in, or cancel.
- No governance, operational, privacy, or safety risk remains at wireframe level.

## 4. Explicit Boundaries

Accepted Shift does not:

- Check the worker in.
- Check the worker out.
- Create attendance.
- Edit hours.
- Approve hours.
- Approve timesheets.
- Submit payroll.
- Complete payment.
- Guarantee final compensation.
- Cancel shifts automatically.
- Approve cancellation automatically.
- Negotiate pay.
- Expose employer billing.
- Expose platform margin.
- Expose resident information.
- Expose confidential employer notes.
- Expose internal operational comments.
- Expose private staffing information.
- Provide professional, clinical, legal, or regulated-work instructions.

## 5. Launch / Implementation Conditions

These are future implementation or launch-governance conditions, not wireframe defects:

- Commitment state machine implementation.
- Material-change acknowledgement workflow.
- Check-in readiness and blocker logic.
- Worker preparation checklist persistence.
- Location and travel visibility controls.
- Cancellation and inability-to-attend workflow rules.
- Employer change/cancellation notification rules.
- Support escalation routing.
- Field-level privacy and visibility controls.
- Compensation-state integration.
- AI explanation guardrails.
- Accessibility QA for mobile status, acknowledgement, and support actions.

## 6. Explicit Non-Authorization

This approval does not authorize:

- React.
- Frontend implementation.
- Backend implementation.
- APIs.
- Database models.
- Attendance implementation.
- GPS check-in implementation.
- GPS check-out implementation.
- Payroll implementation.
- Payment implementation.
- AI action execution.
- Production data.
- Deployment.

## 7. Next Gate

Page 027 - GPS Check In is unblocked as the next controlled gate.

Page 027 has not been created.
