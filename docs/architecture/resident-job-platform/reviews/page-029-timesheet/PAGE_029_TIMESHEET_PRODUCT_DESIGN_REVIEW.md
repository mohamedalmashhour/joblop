# Page 029 - Timesheet Product Design Review

Status: Product Design Review complete
Epic: Epic 3 - Worker Portal
Page: 029 - Timesheet
Wireframe reviewed: PAGE_029_TIMESHEET_LOW_FIDELITY_WIREFRAME.md
Architecture baseline: Resident Job Architecture Phase 1 v1.0
Epic planning baseline: Epic 3 Worker Portal Planning v1.0
Attendance boundary baseline: EPIC_3_ATTENDANCE_BOUNDARY_REVIEW.md
Implementation: Not authorized

## 1. Executive Summary

Page 029 creates a strong worker Timesheet experience that receives attendance evidence from Pages
027-028 without treating GPS check-in/out as approved hours or payroll-ready truth. The page
distinguishes scheduled time, recorded events, elapsed time, breaks, exceptions, proposed payable
time, approved hours, and future payroll handoff.

The page is strong enough for owner review, but should not be approved automatically. Three
conditions should be clarified before it becomes Approved Wireframe v1.0.

Recommendation:

```text
APPROVE WITH CONDITIONS
```

## 2. Strengths

### 2.1 Lifecycle Separation

The page clearly separates timesheet creation, worker submission, reviewer review, approved hours,
future payroll input, and future payment.

### 2.2 Time-Type Clarity

The wireframe avoids collapsing all time into "total hours" and instead uses a time-source table
with source, editability, and review state.

### 2.3 Authoritative Data Protection

System-recorded GPS/fallback timestamps remain read-only. Worker-provided corrections are routed
through governed correction requests.

### 2.4 Financial Separation

The page follows the Financial UX Standard by keeping time evidence, approved hours, estimated
gross, payroll calculation, net payment, and employer billing separate.

### 2.5 Privacy

The page shows only necessary attendance summaries and avoids exact coordinates, raw GPS
diagnostics, resident data, unrelated worker history, internal fraud signals, and support-only notes.

## 3. Weaknesses

### 3.1 Reviewer Adjustment States Need Stronger Visual Separation

The page includes reviewer adjustment governance, but Revision 1 should make original value,
proposed value, final value, actor, timestamp, reason, and audit trail visually unavoidable when
reviewers change hours or break outcomes.

### 3.2 Payroll Handoff Needs a Stronger Boundary Banner

The page says payroll is future workflow, but Revision 1 should add a dedicated payroll boundary
block near proposed payable time and approved hours to prevent "approved hours" from being mistaken
for payment.

### 3.3 Partial Approval Needs a Mobile-Specific Pattern

Partial approval is documented, but Revision 1 should add a compact mobile display showing approved
portion, disputed portion, reason, worker action, and next review step without hiding disputed time.

## 4. Risk Review

| Risk | Severity | Review finding |
| --- | --- | --- |
| Elapsed time appears as approved paid time | High | Avoided by explicit labels, but should remain prominent. |
| Worker overwrites GPS timestamps | Critical | Avoided. System timestamps are read-only. |
| Employer silently alters worker records | Critical | Avoided conceptually; reviewer adjustment display should be strengthened. |
| Hidden break deductions | High | Avoided. Rule source, amount, review state, and correction path are required. |
| Late checkout implies approved overtime | High | Avoided. Extended time remains pending review. |
| Correction appears immediately approved | High | Avoided. Correction requested is not correction approved. |
| Partial approval hides disputed time | High | Needs stronger mobile pattern. |
| Payroll/invoicing performed here | Critical | Avoided. No payroll, invoice, or payment performed. |
| AI approves hours or alters evidence | Critical | Avoided. AI is explanatory only. |
| Exact location exposed | High | Avoided. Evidence summary is minimized. |

## 5. Required Improvements

Before Page 029 becomes Approved Wireframe v1.0, revise the wireframe to address:

1. **Reviewer Adjustment Audit Block**
   - Add a dedicated block showing original value, proposed value, final value, actor, timestamp,
     reason, and audit trail for any adjustment.

2. **Payroll Boundary Banner**
   - Add a dedicated warning near proposed payable time and approved hours stating that payroll,
     deductions, net payment, employer invoice, and payment are future workflows.

3. **Mobile Partial-Approval Pattern**
   - Add a compact mobile partial-approval display that keeps approved and disputed portions visible
     with reason, worker action, and next review step.

These refinements are controlled UX clarifications and do not require architecture changes.

## 6. Scorecard

| Category | Score |
| --- | ---: |
| Lifecycle separation | 9.7 |
| Time-type clarity | 9.7 |
| Authoritative versus editable fields | 9.7 |
| Timezone handling | 9.6 |
| Break governance | 9.6 |
| Early/late/extended-time neutrality | 9.7 |
| Proposed payable-time boundary | 9.4 |
| Correction workflow | 9.6 |
| Reviewer adjustment governance | 9.2 |
| Partial approval | 9.2 |
| Amendment history | 9.5 |
| Privacy | 9.7 |
| Financial separation | 9.5 |
| Dispute boundary | 9.5 |
| AI governance | 9.8 |
| Offline truthfulness | 9.6 |
| Mobile usability | 9.4 |
| Accessibility | 9.6 |
| International readiness | 9.7 |
| Consistency with Pages 016-028 | 9.8 |
| Readiness for future payroll/invoicing | 9.5 |
| Overall score | 9.6 |

## 7. Governance Review

| Requirement | Result |
| --- | --- |
| Frozen title remains Timesheet | Pass |
| Architecture Freeze unchanged | Pass |
| Epic 3 Planning unchanged | Pass |
| Pages 016-028 unchanged | Pass |
| Attendance boundary review unchanged | Pass |
| No Page 030 files created | Pass |
| No implementation started | Pass |
| No React/frontend/backend/API/database work | Pass |
| No payroll implementation created | Pass |
| No invoicing implementation created | Pass |
| No payment implementation created | Pass |
| Unrelated app changes untouched | Pass |

## 8. Recommendation

```text
APPROVE WITH CONDITIONS
```

The page is structurally ready and respects the attendance/payroll boundary. The three documented
clarifications should be resolved before creating the Page 029 approval record.

## 9. Final Review Status

```text
Page 029 - Timesheet
Wireframe: COMPLETE
Product Review: COMPLETE
Approval Record: NOT CREATED
Owner Review: REQUIRED

Page 030
BLOCKED
```
