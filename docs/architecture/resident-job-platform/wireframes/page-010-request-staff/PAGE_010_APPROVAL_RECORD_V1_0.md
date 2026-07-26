# Page 010 - Request Staff Approval Record v1.0

Status: Approved Wireframe v1.0
Page: 010 - Request Staff
Approval date: 2026-07-22
Version: Approved Wireframe v1.0
Architecture version reference: Resident Job Architecture Phase 1 v1.0
UX Foundation version reference: Resident Job UX Foundation
Initial wireframe reference: `docs/architecture/resident-job-platform/wireframes/page-010-request-staff/PAGE_010_REQUEST_STAFF_LOW_FIDELITY_WIREFRAME.md`
Product Review reference: `docs/architecture/resident-job-platform/reviews/page-010-request-staff/PAGE_010_REQUEST_STAFF_PRODUCT_DESIGN_REVIEW.md`
Approved revision reference: `docs/architecture/resident-job-platform/wireframes/page-010-request-staff/PAGE_010_REQUEST_STAFF_WIREFRAME_REVISION_1.md`
Product Review Revision reference: `docs/architecture/resident-job-platform/reviews/page-010-request-staff/PAGE_010_REQUEST_STAFF_PRODUCT_DESIGN_REVIEW_REVISION_1.md`
Implementation: Not authorized

## Final Status

```text
APPROVED WIREFRAME v1.0
```

## Approval Basis

Page 010 is approved because Revision 1 resolved the documented urgent-staffing condition.

The approved wireframe now includes:

- Employer/residence value proposition.
- Who This Is For.
- Roles Available.
- Why Use Resident Job.
- Staffing Request Journey.
- Request Types.
- Public Initial Request Form.
- Authentication Boundary.
- Urgent Staffing.
- Staffing Lifecycle.
- Worker Matching.
- Employer Review.
- Pricing Transparency.
- Attendance and Timesheets.
- Replacement Requests.
- Employer Trust and Safety.
- Employer Responsibilities.
- Confirmation State.
- FAQ Preview.

## Controlled Boundaries

The approved wireframe does not include:

- Full authenticated shift-creation workflow.
- Staffing request integration.
- Matching engine implementation.
- Billing integration.
- Authentication implementation.
- Database work.
- Production data.

## Unsupported Claims Avoided

The approved wireframe avoids:

- Guaranteed worker availability.
- Guaranteed same-day coverage.
- Guaranteed replacement.
- Guaranteed response time.
- Guaranteed quality.
- Guaranteed pricing.
- Hardcoded rates, fees, taxes, commissions, or cancellation charges.
- Hardcoded emergency numbers.
- Unrestricted worker-record access.
- AI final assignment authority.

## Financial UX Boundary

The approved page follows:

```text
Estimate
↓
authorization where applicable
↓
verified attendance
↓
approved timesheet
↓
approved adjustments
↓
final invoice
```

Authorization is not final charge. Estimates are not guarantees. Employer billing and worker
compensation remain separate processes.

## Implementation Boundary

No production implementation has begun.

No React, frontend, backend, database, authentication, staffing request integration, matching
engine, billing integration, deployment, or production data work is authorized by this approval.

## Next Gate

Do not begin Page 011.

The mandatory Epic 1 - Public Website Review must be completed and approved before the
Authentication epic may begin.
