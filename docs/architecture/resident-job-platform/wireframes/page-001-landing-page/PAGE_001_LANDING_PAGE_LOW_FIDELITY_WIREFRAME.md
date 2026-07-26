# Page 001 - Landing Page Low-Fidelity Wireframe

Status: Draft complete, awaiting page wireframe approval
Architecture baseline: Resident Job Architecture Phase 1 v1.0
UX baseline: Resident Job UX Foundation
Page spec: `pages/PAGE_001_LANDING_PAGE.md`
Implementation: Not authorized

## A. Purpose

Introduce Resident Job as an operational workforce platform for senior living and healthcare
staffing. The page must help a visitor immediately choose the correct path:

- Request staff
- Become a worker
- Learn how the platform works

## B. Primary User

Primary public users:

- Residence manager needing staff
- Worker exploring registration
- Agency or employer evaluating the platform

## C. User Goals

- Understand what Resident Job does.
- Identify whether the platform serves their need.
- Select Worker or Employer path.
- Understand staffing categories.
- Understand that AI supports matching but humans approve decisions.
- Trust that the platform handles verification, compliance, and records seriously.

## D. Information Hierarchy

1. Platform identity and value proposition
2. Worker and employer CTAs
3. Healthcare staffing groups
4. How the workflow operates
5. AI matching, with human approval
6. Trust, verification, compliance, and audit posture
7. Testimonials placeholder, clearly not fabricated
8. FAQ preview
9. Footer/legal/support links

## E. Desktop Wireframe

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ HEADER                                                                       │
│ Resident Job       How it works  Worker  Employer  Pricing  FAQ  Sign in     │
│                                                    [Become worker] [Request] │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────┬───────────────────────────────────────┐
│ HERO                                 │ QUICK STAFFING NEED PANEL             │
│ Enterprise staffing operations        │ What do you need?                     │
│ for senior living and healthcare      │ [Kitchen] [Care/Nurse] [Helper]       │
│                                      │ [Maintenance]                         │
│ Verified workers. Urgent dispatch.   │ Location: [ City / region ]           │
│ AI-assisted matching. Human approval.│ Timing: [Today] [Emergency] [Recurring]│
│                                      │ [Start request]                       │
│ [Request staff] [Become a worker]    │ Note: Request starts review, not auto │
└──────────────────────────────────────┴───────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ STAFFING CATEGORIES                                                          │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐              │
│ │ Kitchen     │ │ Care/Nurse  │ │ Helper      │ │ Maintenance │              │
│ │ Chef, aide  │ │ Nurse, PSW  │ │ Dining, HK  │ │ Repairs     │              │
│ └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘              │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ HOW IT WORKS                                                                 │
│ Request → AI suggests → Human approves → Worker accepts → Check in/out → Pay │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────┬───────────────────────────────────────┐
│ AI WORKFORCE MATCHING                │ TRUST AND COMPLIANCE                  │
│ Recommendation card example           │ Verified workers                      │
│ Evidence chips: distance, documents, │ Human approval gates                  │
│ worked there before, availability    │ Audit-ready records                   │
│ Label: AI advisor only               │ Worker/client financial separation    │
└──────────────────────────────────────┴───────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ TESTIMONIALS PLACEHOLDER                                                     │
│ Reserved for approved real testimonials. No fabricated claims.               │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ FAQ PREVIEW                                                                  │
│ How fast can I request staff? How are workers verified? Who approves payment?│
│ [View all FAQ]                                                               │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ FOOTER: Contact | Privacy | Terms | Become a Worker | Request Staff          │
└──────────────────────────────────────────────────────────────────────────────┘
```

## F. Tablet Adaptation

```text
┌────────────────────────────────────────────┐
│ HEADER: Logo | Menu | Sign in | Request    │
└────────────────────────────────────────────┘
┌────────────────────────────────────────────┐
│ HERO                                       │
│ Headline + value proposition               │
│ [Request staff] [Become a worker]          │
└────────────────────────────────────────────┘
┌────────────────────────────────────────────┐
│ QUICK NEED PANEL                           │
│ 2-column group buttons                     │
│ Location + timing                          │
└────────────────────────────────────────────┘
┌────────────────────────────────────────────┐
│ STAFFING CATEGORIES: 2x2 cards             │
└────────────────────────────────────────────┘
┌────────────────────────────────────────────┐
│ HOW IT WORKS: stacked timeline             │
└────────────────────────────────────────────┘
┌────────────────────────────────────────────┐
│ AI + TRUST: stacked cards                  │
└────────────────────────────────────────────┘
┌────────────────────────────────────────────┐
│ FAQ + FOOTER                               │
└────────────────────────────────────────────┘
```

## G. Mobile Wireframe

```text
┌──────────────────────────────┐
│ Resident Job        [Menu]   │
└──────────────────────────────┘
┌──────────────────────────────┐
│ Enterprise staffing for      │
│ senior living and healthcare │
│                              │
│ Verified workers. AI assists.│
│ Humans approve.              │
│                              │
│ [Request staff]              │
│ [Become a worker]            │
└──────────────────────────────┘
┌──────────────────────────────┐
│ What do you need?            │
│ [Kitchen]                    │
│ [Care / Nurse]               │
│ [Helper]                     │
│ [Maintenance]                │
│ [City / region]              │
│ [Today/Emergency/Recurring]  │
│ [Start request]              │
│ Small note: not auto-dispatch│
└──────────────────────────────┘
┌──────────────────────────────┐
│ Staffing categories          │
│ Kitchen                      │
│ Care / Nurse                 │
│ Helper                       │
│ Maintenance                  │
└──────────────────────────────┘
┌──────────────────────────────┐
│ How it works                 │
│ 1 Request                    │
│ 2 AI suggests                │
│ 3 Human approves             │
│ 4 Worker accepts             │
│ 5 Check-in/out               │
│ 6 Billing/pay records        │
└──────────────────────────────┘
┌──────────────────────────────┐
│ AI advisor only              │
│ Evidence chips, not decisions│
└──────────────────────────────┘
┌──────────────────────────────┐
│ Trust and compliance         │
│ Verification, audit, privacy │
└──────────────────────────────┘
┌──────────────────────────────┐
│ FAQ preview                  │
└──────────────────────────────┘
┌──────────────────────────────┐
│ Footer                       │
└──────────────────────────────┘
```

## H. Navigation Behavior

- Header logo returns to Landing Page.
- `How it works` links to Page 003.
- `Worker` links to Page 009 - Become a Worker.
- `Employer` and `Request staff` link to Page 010 - Request Staff.
- `Pricing` links to Page 004.
- `FAQ` links to Page 006.
- `Sign in` links to Page 011.
- Quick need panel starts a public lead/request draft, not a confirmed shift.

## I. Empty States

- Staffing categories unavailable: show "Staffing categories are temporarily unavailable. You can still contact us."
- FAQ unavailable: hide FAQ list and show "FAQ is being updated."
- Testimonials unavailable: show reserved placeholder only, no invented testimonials.

## J. Loading States

- Public content loading: skeleton blocks for hero, categories, FAQ.
- Lead form submission loading: button shows "Submitting request..." and disables duplicate submission.
- AI explanatory content loading: show static copy fallback, because AI content is not required to load the page.

## K. Error States

- Lead submission error: "We could not submit your request. Please check your contact information or contact support."
- Invalid email/phone: inline field error with recovery instruction.
- Public content error: show core static message and CTAs.
- Network error: preserve completed form data locally until refresh or retry.

## L. Success States

- Request staff lead success: "Request received. A human team member will review it before any dispatch action."
- Worker interest success: "Worker registration started. Check your email to continue."
- Contact success: "Message received."

## M. Accessibility Considerations

- CTA buttons use text labels, not icons alone.
- Group selector supports keyboard and screen-reader labels.
- Color is not the only signal for urgent or trusted content.
- Minimum target size is 44px.
- Hero copy should be concise and readable at mobile sizes.
- Form errors must be announced and visually linked to fields.

## N. AI Assistant Placement

Placement:

- Optional small AI advisor card below the quick need panel.
- It should not appear as a chatbot taking over the page.

Allowed AI help:

- "Not sure what staff group to choose?"
- "Prepare the information a dispatcher will need."
- "Explain the difference between request, approval, and dispatch."

Forbidden AI behavior:

- No named worker recommendations on public page.
- No promise of availability.
- No autonomous dispatch.
- No binding price quote.

## O. Future Expansion Notes

- Add localized landing pages by region.
- Add SEO pages for Kitchen, Care / Nurse, Helper, Maintenance.
- Add approved case studies and testimonials.
- Add public trust center after compliance copy is approved.
- Add pricing estimator only after commercial policy is approved.

## Design Review Checklist Result

Initial self-check:

- Workflow clarity: Pass for low-fidelity draft
- Mobile usability: Pass for low-fidelity draft
- Accessibility: Pass for low-fidelity draft
- Healthcare compliance considerations: Pass for low-fidelity draft
- Permission/security consistency: Pass for low-fidelity draft
- AI transparency: Pass for low-fidelity draft
- Performance considerations: Pass for low-fidelity draft
- Visual consistency with design system: Pass for low-fidelity draft

## Page Gate

Page 001 wireframe must be reviewed before Page 002 wireframe begins.

Review outcomes:

- Approved
- Approved with documented conditions
- Remediation required

