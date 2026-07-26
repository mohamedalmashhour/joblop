# Page 001 - Landing Page Wireframe Revision 1

Status: Revision 1 complete, awaiting approval
Architecture baseline: Resident Job Architecture Phase 1 v1.0
UX baseline: Resident Job UX Foundation
Original wireframe: `PAGE_001_LANDING_PAGE_LOW_FIDELITY_WIREFRAME.md`
Product review: `reviews/page-001-landing-page/PAGE_001_LANDING_PAGE_PRODUCT_DESIGN_REVIEW.md`
Implementation: Not authorized

## Summary Of Changes

Revision 1 incorporates the approved Product Design Review conditions only.

Changes made in this wireframe revision:

- Strengthened Trust and Compliance into six visible placeholders:
  - Verified Healthcare Workers
  - Credential Verification
  - Background Checks
  - Compliance Monitoring
  - Attendance Verification
  - Quality Assurance
- Added a dedicated Worker Value Proposition section.
- Split "How It Works" into two independent journeys:
  - For Workers
  - For Employers
- Reframed AI as three separate steps:
  - AI Recommendations
  - Human Review
  - Final Decision
- Confirmed country-neutral language.
- Kept testimonials as placeholders only.

No architecture changes were introduced.

## Updated Section Hierarchy

1. Header
2. Hero and Quick Staffing Need Panel
3. Staffing Categories
4. Worker Value Proposition
5. How It Works - Worker Journey
6. How It Works - Employer Journey
7. AI Recommendation / Human Review / Final Decision
8. Trust and Compliance
9. Testimonials Placeholder
10. FAQ Preview
11. Footer

## Updated Desktop Flow

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ HEADER                                                                       │
│ Resident Job       How it works  Worker  Employer  Pricing  FAQ  Sign in     │
│                                                    [Become worker] [Request] │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────┬───────────────────────────────────────┐
│ HERO                                 │ QUICK STAFFING NEED PANEL             │
│ Enterprise staffing operations        │ Start a staffing request              │
│ for senior living and healthcare      │ [Kitchen] [Care / Nurse]              │
│                                      │ [Helper]  [Maintenance]               │
│ Verified workers. Urgent coverage.   │ Location: [ City / region ]           │
│ AI-assisted matching. Human approval.│ Timing: [Today] [Emergency] [Recurring]│
│                                      │ [Start request]                       │
│ [Request staff] [Become a worker]    │ Note: Starts human review, not dispatch│
└──────────────────────────────────────┴───────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ STAFFING CATEGORIES                                                          │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐              │
│ │ Kitchen     │ │ Care/Nurse  │ │ Helper      │ │ Maintenance │              │
│ │ Chef, aide  │ │ Nurse, PSW  │ │ Dining, HK  │ │ Repairs     │              │
│ └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘              │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ WORKER VALUE PROPOSITION                                                     │
│ ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐   │
│ │ Flexible   │ │ Fast shift │ │Transparent │ │ Verified   │ │ Mobile     │   │
│ │ scheduling │ │ matching   │ │ earnings   │ │ employers  │ │ first      │   │
│ └────────────┘ └────────────┘ └────────────┘ └────────────┘ └────────────┘   │
│ Professional growth: profile, documents, groups, ratings, recurring clients. │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────┬───────────────────────────────────────┐
│ HOW IT WORKS FOR WORKERS             │ HOW IT WORKS FOR EMPLOYERS            │
│ Discover shifts                      │ Request staff                         │
│ → Apply                              │ → AI-assisted matching                │
│ → Get approved                       │ → Review candidates                   │
│ → Work                               │ → Confirm assignment                  │
│ → Get paid                           │ → Track shift                         │
│                                      │ → Approve timesheet                   │
└──────────────────────────────────────┴───────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ AI SUPPORT MODEL                                                             │
│ ┌────────────────────┐ → ┌────────────────────┐ → ┌────────────────────┐     │
│ │ AI Recommendations │   │ Human Review       │   │ Final Decision     │     │
│ │ Evidence chips     │   │ Employer/dispatcher│   │ Recorded approval  │     │
│ └────────────────────┘   └────────────────────┘   └────────────────────┘     │
│ AI does not hire, assign, approve payment, or dispatch automatically.         │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ TRUST AND COMPLIANCE                                                         │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐                            │
│ │ Verified     │ │ Credential   │ │ Background   │                            │
│ │ healthcare   │ │ verification │ │ checks       │                            │
│ │ workers      │ │ status       │ │ status       │                            │
│ └──────────────┘ └──────────────┘ └──────────────┘                            │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐                            │
│ │ Compliance   │ │ Attendance   │ │ Quality      │                            │
│ │ monitoring   │ │ verification │ │ assurance    │                            │
│ └──────────────┘ └──────────────┘ └──────────────┘                            │
│ Note: Trust items show platform controls and review states, not guaranteed    │
│ certifications unless verified by approved policy.                            │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ TESTIMONIALS PLACEHOLDER                                                     │
│ Reserved for approved real testimonials. No fabricated names, companies,     │
│ metrics, or quotes.                                                          │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ FAQ PREVIEW                                                                  │
│ How fast can I request staff? How are workers verified? Who approves payment?│
│ Does AI assign workers? Does the worker see client billing?                  │
│ [View all FAQ]                                                               │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ FOOTER: Contact | Privacy | Terms | Become a Worker | Request Staff          │
│ Language / region selector reserved for future localization.                  │
└──────────────────────────────────────────────────────────────────────────────┘
```

## Updated Mobile Flow

```text
┌──────────────────────────────┐
│ Resident Job        [Menu]   │
└──────────────────────────────┘

┌──────────────────────────────┐
│ Enterprise staffing for      │
│ senior living and healthcare │
│                              │
│ Verified workers. Urgent     │
│ coverage. AI assists.        │
│ Humans approve.              │
│                              │
│ [Request staff]              │
│ [Become a worker]            │
└──────────────────────────────┘

┌──────────────────────────────┐
│ Start a staffing request     │
│ [Kitchen]                    │
│ [Care / Nurse]               │
│ [Helper]                     │
│ [Maintenance]                │
│ [City / region]              │
│ [Today/Emergency/Recurring]  │
│ [Start request]              │
│ Starts review, not dispatch  │
└──────────────────────────────┘

┌──────────────────────────────┐
│ Staffing categories          │
│ Kitchen                      │
│ Care / Nurse                 │
│ Helper                       │
│ Maintenance                  │
└──────────────────────────────┘

┌──────────────────────────────┐
│ For workers                  │
│ Flexible scheduling          │
│ Fast shift matching          │
│ Transparent earnings         │
│ Verified employers           │
│ Mobile-first experience      │
│ Professional growth          │
└──────────────────────────────┘

┌──────────────────────────────┐
│ How it works for workers     │
│ Discover shifts              │
│ → Apply                      │
│ → Get approved               │
│ → Work                       │
│ → Get paid                   │
└──────────────────────────────┘

┌──────────────────────────────┐
│ How it works for employers   │
│ Request staff                │
│ → AI-assisted matching       │
│ → Review candidates          │
│ → Confirm assignment         │
│ → Track shift                │
│ → Approve timesheet          │
└──────────────────────────────┘

┌──────────────────────────────┐
│ AI support model             │
│ AI Recommendations           │
│ ↓                            │
│ Human Review                 │
│ ↓                            │
│ Final Decision               │
│ AI does not auto-dispatch.   │
└──────────────────────────────┘

┌──────────────────────────────┐
│ Trust and compliance         │
│ Verified healthcare workers  │
│ Credential verification      │
│ Background checks            │
│ Compliance monitoring        │
│ Attendance verification      │
│ Quality assurance            │
│ Controls only; no unsupported│
│ certification claims.        │
└──────────────────────────────┘

┌──────────────────────────────┐
│ Testimonials placeholder     │
│ No fake names or quotes      │
└──────────────────────────────┘

┌──────────────────────────────┐
│ FAQ preview                  │
└──────────────────────────────┘

┌──────────────────────────────┐
│ Footer                       │
└──────────────────────────────┘
```

## Updated Section Details

### 1. Trust And Compliance

Trust controls appear as visible placeholders, not unsupported promises.

- Verified Healthcare Workers: worker identity and profile review status.
- Credential Verification: credential upload/review/expiry status.
- Background Checks: status placeholder only; no guarantee unless policy confirms.
- Compliance Monitoring: compliance review queues and alerts.
- Attendance Verification: check-in/check-out and timesheet evidence.
- Quality Assurance: ratings, incident review, and support follow-up.

### 2. Worker Value Proposition

Worker messaging remains factual:

- Flexible scheduling
- Fast shift matching
- Transparent earnings
- Verified employers
- Mobile-first experience
- Professional growth

No claim is made about guaranteed income, guaranteed shifts, instant hiring, or automatic approval.

### 3. Split Journey Model

Worker journey:

Discover shifts → Apply → Get approved → Work → Get paid

Employer journey:

Request staff → AI-assisted matching → Review candidates → Confirm assignment → Track shift →
Approve timesheet

Each journey is visually independent so workers do not read employer billing/approval language as
worker-facing commitments.

### 4. AI Presentation

AI is shown as a support layer:

AI Recommendations → Human Review → Final Decision

Explicit restriction:

AI does not automatically hire, assign staff, approve payment, or dispatch workers.

### 5. Country Neutrality

Revision 1 remains country-neutral:

- No Canada-specific language.
- No Syria-specific language.
- No hardcoded legislation.
- No country-specific branding.
- Localization and region selectors are future/reserved.

### 6. Testimonials

Testimonials remain placeholders only:

- No fabricated names.
- No fabricated companies.
- No fabricated metrics.
- No invented customer quotes.

## State Updates

Empty states:

- Trust controls unavailable: show "Verification details are not available yet. Contact support."
- Testimonials unavailable: show "Proof area reserved for approved real testimonials."

Loading states:

- Trust controls load as skeleton cards.
- Request submission retains disabled duplicate-submission protection.

Error states:

- Trust content unavailable: public copy falls back to general review-process language.
- Request form error preserves form data and gives recovery instructions.

Success states:

- Request staff: "Request received. A human team member will review it before any dispatch action."
- Become worker: "Worker registration started. Check your email to continue."

## Accessibility Notes

- Trust cards must use text labels, not icons alone.
- AI flow arrows must include readable labels for screen readers.
- Worker and employer journeys must be headings with semantic structure.
- Mobile flow should avoid horizontal timelines.
- "No automatic dispatch" must be visible as text.

## Confirmation

- Architecture Freeze v1.0 was not modified.
- UX Foundation was not modified.
- Page 002 was not created.
- No frontend implementation was started.
- No React components were created.
- No backend, database, production data, or deployment work was performed.

## Review Gate

Revision 1 must be reviewed before Page 001 can be locked as Approved Wireframe v1.0.

Review outcomes:

- Approved Wireframe v1.0
- Approved with documented conditions
- Remediation required

