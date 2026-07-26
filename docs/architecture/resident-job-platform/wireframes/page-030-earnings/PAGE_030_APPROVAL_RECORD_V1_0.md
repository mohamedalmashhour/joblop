# Page 030 - Earnings Approval Record v1.0

Page: 030 - Earnings
Epic: Epic 3 - Worker Portal
Version: Approved Wireframe v1.0
Status: APPROVED WIREFRAME v1.0
Approval date: 2026-07-22
Implementation: Not authorized

## 1. References

- Architecture baseline: Resident Job Architecture Phase 1 v1.0.
- UX Foundation baseline: Resident Job UX Foundation.
- Epic planning baseline: Epic 3 Worker Portal Planning v1.0.
- Attendance boundary baseline: EPIC_3_ATTENDANCE_BOUNDARY_REVIEW.md.
- Frozen architecture page: pages/PAGE_030_EARNINGS.md.
- Initial wireframe: PAGE_030_EARNINGS_LOW_FIDELITY_WIREFRAME.md.
- Initial product review: PAGE_030_EARNINGS_PRODUCT_DESIGN_REVIEW.md.
- Approved revision: PAGE_030_EARNINGS_WIREFRAME_REVISION_1.md.
- Product review revision: PAGE_030_EARNINGS_PRODUCT_DESIGN_REVIEW_REVISION_1.md.

## 2. Approved Scope

Page 030 defines the authenticated worker Earnings experience.

Approved capabilities at wireframe level:

- Review worker earnings-related records.
- Understand estimated, approved, payroll-calculated, sent, settled, returned, and disputed amounts.
- Trace amounts to shift-level records.
- See line-item premiums, travel compensation, reimbursements, and adjustments.
- View payment status truthfully without executing payment.
- See masked payment-method summary only.
- Route earnings, payroll, payment, document, and timesheet questions to the correct workflow.
- Preserve worker privacy and employer visibility boundaries.
- Receive AI explanations without AI financial authority.

## 3. Approval Basis

The approved revision satisfies all documented conditions:

- Attendance, earnings, payroll, and payment states remain independent.
- Estimated amounts cannot appear final.
- Payment sent cannot appear settled.
- Shift-level traceability is clear.
- Gross, deductions, and net remain separate.
- Adjustments preserve history.
- Multiple currencies are not improperly combined.
- Employer access is restricted.
- Page 030 does not duplicate Page 031.
- AI cannot calculate, modify, approve, or pay.
- No financial, privacy, governance, or operational risk remains at wireframe level.

## 4. Explicit Boundaries

Earnings does not:

- Calculate payroll.
- Calculate tax.
- Calculate deductions.
- Issue payment.
- Schedule payment.
- Settle payment.
- Generate employer invoices.
- Expose employer billing.
- Expose platform margin.
- Expose client rate.
- Edit approved hours.
- Duplicate Page 029 Timesheet correction logic.
- Duplicate Page 031 Payments workflow.
- Provide personalized tax advice.
- Combine multiple currencies without an approved model.
- Allow AI to change rates, approve adjustments, calculate payroll, issue payments, or modify records.

## 5. Launch / Implementation Conditions

These are future implementation or launch-governance conditions, not wireframe defects:

- Earnings state-machine implementation.
- Payroll provider integration.
- Payment provider integration.
- Financial access controls.
- Staff-access audit controls.
- Earnings line-item reconciliation.
- Multiple-currency configuration.
- Statement/document availability integration.
- Payment settlement and reversal policy review.
- Tax and deduction legal/financial review.
- Page 031 Payments design and approval.
- Accessibility QA for amount/status pairings and mobile line-item expansion.

## 6. Explicit Non-Authorization

This approval does not authorize:

- React.
- Frontend implementation.
- Backend implementation.
- APIs.
- Database models.
- Payroll implementation.
- Tax implementation.
- Invoicing implementation.
- Banking integration.
- Payment implementation.
- Employer billing implementation.
- AI action execution.
- Production data.
- Deployment.

## 7. Next Gate

```text
Page 031 - Payments
UNBLOCKED as next controlled gate
NOT CREATED
```

Page 031 may begin only through the established controlled wireframe governance lifecycle.
