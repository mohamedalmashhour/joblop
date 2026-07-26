# Page 001 - Landing Page

Status: Draft complete, awaiting approval
Section: Public Website
Users: Guest, Worker, Employer, Residence Manager, Agency operator
Implementation: Not authorized

## 1. Purpose

The Landing Page introduces Resident Job as an operational workforce platform for senior
residences, healthcare facilities, retirement homes, clinics, and long-term care organizations.

Its job is to make the platform identity clear in the first five seconds:

- This is not a generic job board.
- It fills urgent staffing shortages.
- It verifies workers before dispatch.
- It supports scheduling, attendance, billing, worker pay, documents, and compliance.
- AI recommends matches, but humans approve dispatch and business actions.

## 2. Users

Primary users:

- Guest researching the platform
- Worker exploring registration
- Employer or residence manager needing staff
- Agency operator evaluating whether the platform can manage multiple clients

Secondary users:

- Scheduler
- Recruiter
- Finance stakeholder
- Support stakeholder
- Administrator

## 3. UI Layout

Recommended public layout:

1. Header
   - Resident Job logo/name
   - Navigation: How it works, Worker, Employer, Pricing, FAQ, Sign in
   - Primary CTA: Request staff
   - Secondary CTA: Become a worker

2. Hero
   - Headline: Enterprise staffing operations for senior living and healthcare
   - Subheadline: Verified workers, urgent dispatch, scheduling, billing, worker pay, and AI-assisted matching
   - CTA pair: Request staff / Join as worker
   - Trust line: Demo or live status clearly labeled depending on environment

3. Search / Need Panel
   - Role group selector: Kitchen, Care / Nurse, Helper, Maintenance
   - Location
   - Timing: today, tomorrow, recurring, emergency
   - CTA: Start request

4. Staffing Categories
   - Kitchen: chef, kitchen aide, dishwasher
   - Care / Nurse: nurse, PSW, care aide
   - Helper: dining, housekeeping, floor support
   - Maintenance: repairs, facility support

5. How Operations Work
   - Client request
   - AI match recommendation
   - Dispatcher or client approval
   - Worker accepts
   - Calendar updated
   - Check-in / check-out
   - Timesheet, billing, pay

6. Why Choose Us
   - Verified workers
   - Emergency staffing workflow
   - Commercial separation between client billing and worker pay
   - Human approval gates
   - Audit trail

7. AI Matching
   - Evidence chips: distance, availability, credentials, worked there before, group skills
   - Explain that AI is advisory

8. Testimonials / Proof
   - Placeholder only until real approved testimonials exist
   - No fabricated production claims

9. FAQ Preview
   - How fast can a worker be dispatched?
   - How are workers verified?
   - Who approves payment?
   - Does the worker see client billing?
   - Can agencies manage multiple residences?

10. Footer
    - Contact
    - Privacy
    - Terms
    - Worker registration
    - Employer request

## 4. Components

Required components:

- Public header
- Primary CTA button
- Secondary CTA button
- Role group selector
- Search / staffing request teaser
- Category cards
- Workflow timeline
- AI recommendation explanation card
- Trust / compliance notice
- FAQ preview
- Footer

Optional components:

- Language selector
- Region selector
- Emergency staffing banner
- Public availability estimate
- Partner logos, only after approval

## 5. Business Rules

- The page may invite a staffing request but must not imply that a worker is assigned automatically.
- Any request that could create a contractual, payment, or dispatch obligation must move through a later authenticated approval flow.
- Public page data must be clearly identified as public, demo, estimated, or live.
- No worker pay, client billing, or platform margin should be mixed together in public copy.
- No protected healthcare, client, or worker data may appear on the public page.
- Emergency language must be truthful: the platform can assist urgent dispatch, but availability is not guaranteed unless a later service-level contract exists.

## 6. Data Model

Potential public data entities:

- PublicPageContent
- StaffingCategory
- PublicFAQ
- PublicCTAEvent
- LeadCaptureDraft
- RegionAvailabilitySummary
- ComplianceNotice

No worker, client, payroll, billing, or live dispatch records should be exposed directly on this page.

## 7. APIs

Potential API requirements:

- `GET /public/content/landing`
- `GET /public/staffing-categories`
- `GET /public/faqs?scope=landing`
- `POST /leads/request-staff-draft`
- `POST /leads/worker-interest`
- `POST /analytics/public-event`

API requirements:

- Rate limiting
- Bot protection for lead submission
- Input validation
- No secret or internal operational data in responses
- Public responses must be cache-safe

## 8. Permissions

Public read:

- Landing content
- Staffing categories
- Public FAQ

Public submit:

- Lead draft
- Worker interest
- Contact request

Restricted:

- Shift marketplace data
- Worker profiles
- Employer profiles
- Billing
- Payroll
- Compliance documents
- AI dispatch results

## 9. Validation

Client-side validation:

- Email format
- Phone format where required
- Required role group
- Required city/region when submitting lead
- Emergency request must require contact information

Server-side validation:

- Duplicate lead detection
- Spam detection
- Rate limiting
- Required consent for communications
- Safe text handling

Design validation:

- CTA visible above fold on mobile and desktop
- Role groups readable on small screens
- Touch targets at least 44px
- Copy does not imply automatic AI dispatch
- Demo data clearly labeled if present

## 10. AI Features

Allowed on this page:

- Explain the platform
- Recommend which intake path to start based on public user choices
- Detect missing request information in a draft lead
- Suggest questions the residence should prepare before requesting staff

Not allowed on this page:

- Dispatch workers
- Recommend named workers
- Quote final price
- Approve payment
- Confirm availability
- Make compliance decisions
- Store sensitive worker or client data without authenticated consent

AI posture:

AI assistant may guide, explain, and suggest. It does not decide or commit the business.

## 11. Mobile Design

Mobile priorities:

1. Hero message
2. Request staff / Become worker CTAs
3. Group selector
4. Emergency staffing explanation
5. How it works
6. FAQ

Mobile behavior:

- Sticky bottom CTA may be used.
- Group cards should stack vertically or two per row.
- Forms should be split into short steps.
- Text must not overflow.
- Avoid dense dashboards on public mobile landing.

## 12. Desktop Design

Desktop priorities:

1. Executive positioning
2. Two-sided CTA: worker and employer
3. Category grid
4. Workflow timeline
5. AI advisory explanation
6. Trust and compliance posture

Desktop behavior:

- Hero can include an operations-style preview, but it must be labeled if synthetic.
- Role selector may appear beside the hero or immediately below it.
- Navigation should keep employer and worker paths distinct.

## 13. Future Expansion

Future additions:

- Region-specific landing pages
- Agency landing page
- Healthcare facility landing page
- Senior residence landing page
- Public pricing calculator with clear estimate labels
- Multi-language content
- SEO pages for Kitchen, Care, Helper, Maintenance
- Approved testimonials and case studies
- Public knowledge center

Future dependencies:

- Approved brand system
- Approved pricing policy
- Verified legal/compliance copy
- Approved AI language policy
- Approved data honesty policy

## Page Gate

This page should be reviewed before Page 002 begins.

Review outcomes:

- Approved
- Approved with conditions
- Remediation required

