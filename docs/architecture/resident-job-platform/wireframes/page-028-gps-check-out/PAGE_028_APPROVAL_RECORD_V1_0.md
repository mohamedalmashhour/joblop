# Page 028 - GPS Check Out Approval Record v1.0

Page: 028 - GPS Check Out
Epic: Epic 3 - Worker Portal
Version: Approved Wireframe v1.0
Status: APPROVED WIREFRAME v1.0
Approval date: 2026-07-22
Implementation: Not authorized

## 1. References

- Architecture baseline: Resident Job Architecture Phase 1 v1.0.
- UX Foundation baseline: Resident Job UX Foundation.
- Epic planning baseline: Epic 3 Worker Portal Planning v1.0.
- Frozen architecture page: pages/PAGE_028_GPS_CHECK_OUT.md.
- Initial wireframe: PAGE_028_GPS_CHECK_OUT_LOW_FIDELITY_WIREFRAME.md.
- Initial product review: PAGE_028_GPS_CHECK_OUT_PRODUCT_DESIGN_REVIEW.md.
- Approved revision: PAGE_028_GPS_CHECK_OUT_WIREFRAME_REVISION_1.md.
- Product review revision: PAGE_028_GPS_CHECK_OUT_PRODUCT_DESIGN_REVIEW_REVISION_1.md.
- Mid-epic architecture review: EPIC_3_MID_ARCHITECTURE_REVIEW.md.

## 2. Approved Scope

Page 028 defines the authenticated worker GPS Check Out experience.

Approved capabilities at wireframe level:

- End an active shift through a worker-initiated checkout event.
- Confirm departure.
- Present GPS/privacy explanation consistent with Page 027.
- Submit checkout or route checkout to review.
- Show checkout recorded or review-required status truthfully.
- Provide governed fallback checkout concepts.
- Report checkout problems.
- Handle duplicate, offline, stale, already-checked-out, and no-active-check-in states.
- Provide a safe no-active-check-in correction path.
- Separate late checkout, stay-late requests, extra time, overtime, payroll, and payment.
- Preserve worker safety and support paths.
- Keep AI explanatory and non-operative.

## 3. Approval Basis

The approved revision satisfies all documented conditions:

- Checkout lifecycle is clear.
- GPS privacy remains consistent with Page 027.
- Fallback checkout remains governed.
- Attendance and payroll are separated.
- Late checkout or employer stay-late request does not automatically approve overtime, extra hours,
  payroll, or payment.
- No active check-in found has a governed correction path.
- Checkout cannot fabricate or backfill a missing check-in automatically.
- Worker safety boundaries are clear.
- AI cannot approve attendance, edit hours, create payroll, infer fraud, fabricate checkout, or alter
  timestamps.
- No operational, privacy, safety, or financial UX risk remains at wireframe level.

## 4. Explicit Boundaries

GPS Check Out does not:

- Approve attendance.
- Approve worked hours.
- Approve overtime.
- Calculate payroll.
- Finalize payment.
- Create payment.
- Continuously track worker location.
- Infer misconduct from GPS alone.
- Fabricate checkout.
- Alter timestamps.
- Fabricate or backfill a missing check-in.
- Expose unnecessary location information.
- Expose exact coordinates to employers by default.
- Expose private worker explanations to employers.
- Replace future timesheet review.
- Replace future attendance review.

## 5. Launch / Implementation Conditions

These are future implementation or launch-governance conditions, not wireframe defects:

- Checkout state machine implementation.
- GPS/privacy permission implementation.
- Checkout fallback configuration.
- Offline checkout handling.
- Duplicate and cross-device conflict handling.
- No-active-check-in correction workflow.
- Stay-late / extra-time review workflow.
- Attendance review implementation.
- Timesheet integration.
- Hours approval implementation.
- Payroll integration.
- Employer visibility controls.
- Platform/support access controls.
- AI explanation guardrails.
- Accessibility QA for checkout, fallback, and correction states.

## 6. Explicit Non-Authorization

This approval does not authorize:

- React.
- Frontend implementation.
- Backend implementation.
- APIs.
- Database models.
- GPS implementation.
- Geofence implementation.
- Attendance implementation.
- Hours implementation.
- Timesheet implementation.
- Payroll implementation.
- Payment implementation.
- AI action execution.
- Production data.
- Deployment.

## 7. Next Gate

Page 029 - Timesheet is unblocked as the next controlled gate.

Page 029 has not been created.
