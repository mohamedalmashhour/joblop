# Page 030 - Earnings Product Design Review

Status: Product review complete
Page: 030 - Earnings
Epic: Epic 3 - Worker Portal
Reviewed artifact: PAGE_030_EARNINGS_LOW_FIDELITY_WIREFRAME.md
Implementation: Not authorized

## 1. Executive Summary

The Page 030 Earnings wireframe establishes a strong worker-facing financial review experience.
It clearly separates estimated, approved, processing, sent, settled, and disputed amounts while
protecting the major boundaries between earnings, payroll, payments, taxes, employer billing, and
platform margin.

The wireframe is operationally sound and consistent with Page 029 Timesheet, but it should not be
approved yet. Because Page 030 deals with money, three clarity improvements should be resolved
before creating an approval record.

Recommendation:

```text
APPROVE WITH CONDITIONS
```

## 2. Strengths

- Financial lifecycle is explicit and prevents "completed shift" from being mistaken as "paid."
- Amount types are separated instead of being collapsed into one generic balance.
- Shift-level traceability links earnings to approved hours without letting workers edit time here.
- Reimbursements, premiums, travel compensation, and adjustments are separate line-item concepts.
- Worker privacy is protected from employer overexposure.
- Employer billing, client rate, platform commission, and internal margin are excluded.
- AI is clearly explanatory and cannot calculate payroll, issue payment, or modify financial records.
- Mobile flow avoids dense payroll tables.
- International readiness avoids hardcoded currency, tax, banking, or jurisdictional assumptions.

## 3. Weaknesses

### 3.1 Payment Sent Versus Settled Needs Stronger Visual Weight

The wireframe states the boundary, but the mobile and desktop structures should make the difference
between "sent" and "settled" impossible to miss.

Risk:
Workers may interpret "payment sent" as funds received.

### 3.2 Estimated Versus Approved Versus Final Needs Repeated Microcopy

The summary includes finality labels, but line-item cards should repeat the estimate/final boundary
near each amount, especially on mobile.

Risk:
Workers may read an estimated or approved gross amount as guaranteed net pay.

### 3.3 Correction Path Needs More Precise Routing

The wireframe provides correction and support entry points, but the review should distinguish which
questions route to Timesheet, payroll support, payment support, or document support.

Risk:
Workers may send every earnings concern into one generic support channel, which can blur ownership.

## 4. Risk Review

| Risk | Severity | Review |
| --- | --- | --- |
| Estimated earnings appear final | High | Mostly controlled, needs repeated line-item microcopy. |
| Payment sent appears settled | High | Controlled in text, needs stronger visual priority. |
| Recorded time appears payable automatically | Critical | Avoided through Page 029 source boundary. |
| Employer billing exposed | Critical | Avoided. |
| Reimbursements merged with wages | High | Avoided. |
| Deductions calculated here | Critical | Avoided. |
| Historical amounts silently overwritten | Critical | Avoided through adjustment audit requirements. |
| Employers see unrelated worker earnings | Critical | Avoided. |
| AI calculates payroll or changes records | Critical | Avoided. |
| Multiple currencies combined without governed model | High | Avoided. |

## 5. Required Improvements

Before Page 030 becomes Approved Wireframe v1.0, revise the wireframe to address:

1. **Payment Status Truth Banner**
   - Add a dedicated visual block near the payment status panel and mobile summary:
     `Payment sent does not mean funds received. Payment settled is the confirmed state.`

2. **Amount Finality Labels on Every Line Item**
   - Every shift-level amount and expanded line item should display:
     `Estimated`, `Pending`, `Approved gross`, `Payroll-calculated`, `Sent`, `Settled`, or
     `Disputed`.
   - Do not rely only on the page-level summary.

3. **Correction Routing Matrix**
   - Add a compact matrix showing where each concern goes:
     incorrect approved hours -> Timesheet correction;
     missing premium -> Earnings/payroll question;
     missing reimbursement -> reimbursement support;
     payment not received -> payment support;
     wrong document -> Documents workflow.

These are controlled UX clarifications and do not require architecture changes.

## 6. Scorecard

| Category | Score |
| --- | ---: |
| Financial lifecycle clarity | 9.6 |
| Estimated versus approved versus paid separation | 9.4 |
| Amount-type clarity | 9.5 |
| Shift-level traceability | 9.7 |
| Hours boundary | 9.8 |
| Rate and premium transparency | 9.5 |
| Reimbursement separation | 9.7 |
| Payroll and deductions boundary | 9.8 |
| Payment-status truthfulness | 9.3 |
| Adjustment auditability | 9.6 |
| Hold and exception clarity | 9.5 |
| Dispute boundary | 9.5 |
| Worker privacy | 9.8 |
| Employer visibility | 9.8 |
| AI governance | 9.9 |
| Mobile usability | 9.3 |
| Accessibility | 9.6 |
| International readiness | 9.8 |
| Operational readiness | 9.5 |
| Consistency with Pages 016-029 | 9.8 |
| Readiness for future payroll, payment, statement, and invoicing pages | 9.6 |
| Overall score | 9.6 |

## 7. Governance Review

| Requirement | Result |
| --- | --- |
| Frozen title remains Earnings | Pass |
| Architecture Freeze unchanged | Pass |
| Epic 3 Planning unchanged | Pass |
| Pages 016-029 unchanged | Pass |
| Attendance Boundary Review unchanged | Pass |
| No Page 031 files created | Pass |
| No implementation started | Pass |
| No React/frontend/backend/API/database work | Pass |
| No payroll implementation created | Pass |
| No tax implementation created | Pass |
| No invoicing implementation created | Pass |
| No banking or payment integration created | Pass |
| Unrelated app changes untouched | Pass |

## 8. Recommendation

```text
APPROVE WITH CONDITIONS
```

The page is structurally strong and preserves the financial boundaries. The three documented
clarifications should be resolved before creating the Page 030 approval record.

## 9. Final Review Status

```text
Page 030 - Earnings
Wireframe: COMPLETE
Product Review: COMPLETE
Approval Record: NOT CREATED
Owner Review: REQUIRED

Page 031 - Payments
BLOCKED
```
