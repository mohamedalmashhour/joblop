# Page 031 - Payments Product Design Review

Status: Product review complete
Page: 031 - Payments
Epic: Epic 3 - Worker Portal
Reviewed artifact: PAGE_031_PAYMENTS_LOW_FIDELITY_WIREFRAME.md
Implementation: Not authorized

## 1. Executive Summary

The Page 031 Payments wireframe creates a careful worker-facing payment-status and
payment-destination experience. It protects the most important boundaries: sent versus settled,
payment versus earnings, payment versus payroll, and safe masked destination information versus
sensitive banking data.

The page is strong, but it should not be approved yet. Payment destination changes are high-risk,
and the current wireframe needs a stronger dedicated visual pattern for pending destination changes
and unauthorized-change cancellation before approval.

Recommendation:

```text
APPROVE WITH CONDITIONS
```

## 2. Strengths

- Payment readiness, processing, settlement, and worker action states are independent.
- "Payment sent does not mean funds received" is clearly stated.
- Payment destination displays only safe masked information.
- Destination changes are treated as high-risk and governed.
- Page 031 does not calculate earnings, payroll, deductions, tax, or invoices.
- Relationship to Page 030 Earnings is clear.
- Employer billing, platform margin, client rate, and employer credit terms are excluded.
- Returned and reversed payments preserve original payment history.
- AI cannot issue payments, change destinations, fabricate settlement, or access full banking data.
- International readiness avoids hardcoded banking formats, rails, settlement timing, currency, or jurisdiction rules.

## 3. Weaknesses

### 3.1 Pending Destination Change Needs a Stronger Visual Pattern

The wireframe includes pending-change state and cancellation where permitted, but this needs a
dedicated worker-facing card because payment-destination changes are high-risk.

Risk:
Workers may not notice that a destination change is pending before it affects future payments.

### 3.2 Unauthorized Change Path Needs More Prominence

The wireframe mentions cancellation and support escalation, but the cancellation/report path should
be visually prioritized whenever a pending destination change exists.

Risk:
If a worker sees an unfamiliar destination change, the next action must be obvious and immediate.

### 3.3 "Paid" Terminology Should Be Avoided Until Evidence Model Is Defined

The wireframe already warns against vague "Paid" usage, but the review should require avoiding the
word entirely in Page 031 until future payment evidence rules define it.

Risk:
Paid may be interpreted as scheduled, sent, settled, or irreversible.

## 4. Risk Review

| Risk | Severity | Review |
| --- | --- | --- |
| Payment sent appears settled | Critical | Controlled in text; needs strong visual status treatment. |
| Earnings approval appears to trigger guaranteed payment | Critical | Avoided. |
| Full banking details exposed | Critical | Avoided. |
| Destination changes occur silently | Critical | Mostly avoided; pending-change pattern needs strengthening. |
| Account-takeover protections absent | Critical | Conceptual controls included; unauthorized-change path needs more prominence. |
| Original payment history overwritten | Critical | Avoided. |
| Employer billing exposed | Critical | Avoided. |
| Staff access unaudited | High | Auditability required. |
| AI alters payment records or destination | Critical | Avoided. |
| Multiple currencies improperly combined | High | Avoided. |

## 5. Required Improvements

Before Page 031 becomes Approved Wireframe v1.0, revise the wireframe to address:

1. **Pending Destination Change Card**
   - Add a dedicated card showing current destination, proposed destination summary, submitted time,
     verification state, effective date, cancellation/report action, and audit reference.

2. **Unauthorized Change Emergency Path**
   - Add a prominent action for "I do not recognize this change" that routes to support or security
     review without exposing internal fraud scoring or promising instant resolution.

3. **Avoid Generic "Paid" Label**
   - Replace any Page 031 user-facing reliance on "Paid" with explicit states:
     Scheduled, Sent, Settlement pending, Settled, Failed, Returned, Reversed, On hold, or
     Status unavailable.

These are controlled UX and safety clarifications and do not require architecture changes.

## 6. Scorecard

| Category | Score |
| --- | ---: |
| Financial lifecycle separation | 9.7 |
| Readiness, processing, and settlement states | 9.6 |
| Payment-summary truthfulness | 9.5 |
| Destination masking | 9.8 |
| Destination-change governance | 9.2 |
| Account-takeover protection | 9.1 |
| Holds | 9.6 |
| Failures | 9.6 |
| Returns and reversals | 9.7 |
| Timing clarity | 9.7 |
| Relationship to Earnings | 9.8 |
| Relationship to payroll | 9.8 |
| Employer-billing separation | 9.9 |
| Dispute boundary | 9.5 |
| Privacy | 9.8 |
| Staff auditability | 9.6 |
| AI governance | 9.9 |
| Mobile usability | 9.4 |
| Accessibility | 9.6 |
| International readiness | 9.8 |
| Consistency with Pages 016-030 | 9.8 |
| Readiness for future statements, disputes, and payout integration | 9.5 |
| Overall score | 9.6 |

## 7. Governance Review

| Requirement | Result |
| --- | --- |
| Frozen title remains Payments | Pass |
| Architecture Freeze unchanged | Pass |
| Epic 3 Planning unchanged | Pass |
| Pages 016-030 unchanged | Pass |
| Attendance Boundary Review unchanged | Pass |
| No Page 032 files created | Pass |
| No implementation started | Pass |
| No React/frontend/backend/API/database work | Pass |
| No payroll implementation created | Pass |
| No tax implementation created | Pass |
| No invoicing implementation created | Pass |
| No banking integration created | Pass |
| No payment-provider integration created | Pass |
| No notification implementation created | Pass |
| Unrelated app changes untouched | Pass |

## 8. Recommendation

```text
APPROVE WITH CONDITIONS
```

The page is structurally ready and respects payment safety boundaries. The three documented
clarifications should be resolved before creating the Page 031 approval record.

## 9. Final Review Status

```text
Page 031 - Payments
Wireframe: COMPLETE
Product Review: COMPLETE
Approval Record: NOT CREATED
Owner Review: REQUIRED

Page 032 - Ratings
BLOCKED
```
