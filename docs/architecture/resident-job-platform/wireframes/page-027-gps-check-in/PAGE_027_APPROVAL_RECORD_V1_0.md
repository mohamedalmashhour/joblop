# Page 027 - GPS Check In Approval Record v1.0

Page: 027 - GPS Check In
Epic: Epic 3 - Worker Portal
Version: Approved Wireframe v1.0
Status: APPROVED WIREFRAME v1.0
Approval date: 2026-07-22
Implementation: Not authorized

## 1. References

- Architecture baseline: Resident Job Architecture Phase 1 v1.0.
- UX Foundation baseline: Resident Job UX Foundation.
- Epic planning baseline: Epic 3 Worker Portal Planning v1.0.
- Frozen architecture page: pages/PAGE_027_GPS_CHECK_IN.md.
- Initial wireframe: PAGE_027_GPS_CHECK_IN_LOW_FIDELITY_WIREFRAME.md.
- Initial product review: PAGE_027_GPS_CHECK_IN_PRODUCT_DESIGN_REVIEW.md.
- Approved revision: PAGE_027_GPS_CHECK_IN_WIREFRAME_REVISION_1.md.
- Product review revision: PAGE_027_GPS_CHECK_IN_PRODUCT_DESIGN_REVIEW_REVISION_1.md.
- Mid-epic architecture review: EPIC_3_MID_ARCHITECTURE_REVIEW.md.

## 2. Approved Scope

Page 027 defines the authenticated worker GPS Check In experience.

Approved capabilities at wireframe level:

- Confirm the correct accepted assignment before check-in.
- Explain check-in availability and configurable windows.
- Request informed, event-specific location permission.
- Preserve device/location, proximity, and attendance/check-in state separation.
- Present fair geofence/proximity results.
- Handle low accuracy and device/permission issues with neutral next actions.
- Provide governed fallback check-in paths.
- Represent QR/code concepts safely without implementation design.
- Preserve offline truthfulness and prevent premature recorded status.
- Handle duplicate, cross-device, stale, wrong-shift, cancelled, and changed-shift states.
- Protect workers from unacknowledged material shift changes.
- Stage employer visibility.
- Limit platform/support access through role-based, auditable, purpose-bound visibility.
- Minimize exact location exposure.
- Provide safety guidance and support paths.
- Keep AI explanatory and non-operative.

## 3. Approval Basis

The approved revision satisfies all documented owner conditions:

- Device, proximity, and attendance/check-in states remain independent.
- Consent is explicit and not bundled.
- Continuous tracking is not implied.
- Outside-geofence is not treated as misconduct.
- Fallback check-in is governed and auditable.
- Offline states do not claim premature success.
- Exact location is minimized.
- Material changes protect the worker.
- Employer access is limited.
- AI cannot infer fraud or approve attendance.
- Page 027 does not absorb hours, payroll, or payment.
- No privacy, fairness, safety, or operational risk remains at wireframe level.

## 4. Explicit Boundaries

GPS Check In does not:

- Track the worker continuously.
- Request location on page load without worker action.
- Check the worker in automatically.
- Decide whether the worker was present.
- Infer fraud.
- Penalize workers.
- Approve or reject attendance.
- Edit hours.
- Approve hours.
- Calculate payroll.
- Create payment.
- Mark the shift complete.
- Expose exact coordinates to employers by default.
- Expose continuous location.
- Expose device details broadly.
- Expose private worker explanations.
- Expose support notes or internal risk signals to employers.
- Design token algorithms, GPS integration, geofence logic, or attendance implementation.

## 5. Launch / Implementation Conditions

These are future implementation or launch-governance conditions, not wireframe defects:

- Device/location state implementation.
- Proximity state implementation.
- Attendance/check-in state implementation.
- Location permission implementation.
- Geofence or proximity configuration.
- Fallback method configuration.
- QR/code security implementation.
- Offline/pending submission handling.
- Duplicate and cross-device conflict handling.
- Material-change acknowledgement enforcement.
- Employer visibility controls.
- Platform/support access controls.
- Location retention policy implementation.
- Accessibility QA for permission, status, fallback, and confirmation flows.
- AI explanation guardrails.

## 6. Explicit Non-Authorization

This approval does not authorize:

- React.
- Frontend implementation.
- Backend implementation.
- APIs.
- Database models.
- GPS integration.
- Geofence implementation.
- Attendance implementation.
- Check-out implementation.
- Timesheet implementation.
- Payroll implementation.
- Payment implementation.
- AI action execution.
- Production data.
- Deployment.

## 7. Next Gate

Page 028 - GPS Check Out is unblocked as the next controlled gate.

Page 028 has not been created.
