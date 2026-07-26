# Page 001 - Landing Page Product Design Review

Status: Review complete, awaiting owner decision
Page: Page 001 - Landing Page
Review type: Product Design Review
Architecture baseline: Resident Job Architecture Phase 1 v1.0
UX baseline: Resident Job UX Foundation
Wireframe reviewed: `wireframes/page-001-landing-page/PAGE_001_LANDING_PAGE_LOW_FIDELITY_WIREFRAME.md`
Implementation: Not authorized

## 1. Executive Summary

The Page 001 low-fidelity wireframe is directionally strong and aligned with the approved Resident
Job platform identity. It presents Resident Job as an operational workforce platform rather than a
generic job board, separates worker and employer paths, includes healthcare staffing categories,
and correctly frames AI as advisory.

The strongest aspect is the first-screen structure: value proposition, employer CTA, worker CTA,
and quick staffing need panel are all present. This should help both residence operators and
workers understand the platform quickly.

The main improvement area is trust depth. The wireframe includes trust and compliance sections, but
the landing page should make worker verification, healthcare professionalism, and human approval
feel more substantial before asking the employer to submit a request.

Review outcome recommendation:

Approved with documented conditions.

## 2. Strengths

- The page immediately explains that Resident Job is for senior living and healthcare staffing.
- It clearly separates the two core conversion paths: Request staff and Become a worker.
- The staffing categories are operationally relevant: Kitchen, Care / Nurse, Helper, Maintenance.
- The quick need panel is useful and maps well to employer intent.
- The wireframe avoids fake metrics and fabricated testimonials.
- AI is correctly presented as advisor only.
- The mobile sequence is simple and readable.
- The page avoids country-specific regulation and remains Syria/Canada neutral.
- Public page restrictions are respected: no protected worker, client, payroll, billing, or live dispatch data appears.
- Empty, loading, error, and success states are defined.

## 3. Weaknesses

- The trust section is currently too compact for a healthcare/staffing buyer.
- Worker trust is present but lighter than employer trust; workers need to understand why registering is worth it.
- The testimonial placeholder is safe, but it may consume space before real proof exists.
- The "How it works" timeline is accurate, but it may need a clearer distinction between employer flow and worker flow.
- The hero copy may need sharper business language in the next design pass to communicate urgency and reliability in fewer words.
- The AI section should explicitly show "recommendation + evidence + human approval" as three separate pieces.

## 4. Risks

Critical:

- None identified.

High:

- If trust and verification are not visually strong enough, healthcare/residence buyers may treat the platform like a generic job marketplace.
- If the quick request panel feels too transactional, users may think workers are automatically dispatched.

Medium:

- Worker conversion may be weaker than employer conversion unless the worker value proposition is expanded.
- The landing page may become long on mobile if all sections are expanded equally.
- AI language may be misunderstood if the visual treatment does not clearly separate recommendation from decision.

Low:

- Testimonials placeholder is safe but visually low-value until real testimonials exist.
- FAQ preview may duplicate later How It Works content if not curated carefully.

## 5. Recommended Improvements

High priority:

- Expand the Trust and Compliance section into three clear trust pillars:
  - Verified workers
  - Human approval before dispatch/payment
  - Audit-ready records and privacy
- Add a worker-specific value block before the FAQ:
  - Choose approved work groups
  - Receive matched offers
  - Track calendar and earnings
  - Keep documents and profile ready
- Split "How it works" into two mini-flows:
  - Employer: Request staff -> Review recommendation -> Approve -> Track shift -> Approve timesheet
  - Worker: Register -> Verify profile -> See matching offers -> Accept -> Check in/out -> Track earnings

Medium priority:

- Add a small "No automatic dispatch" note directly beside the AI matching section, not only inside the request panel.
- Replace the testimonial placeholder with "Proof area reserved" or move it lower until real testimonials are approved.
- Make the quick need panel explicitly label the result as "Start request" rather than "Book" or "Dispatch."
- Add localization readiness note in the footer area: language selector can be future/reserved.

Low priority:

- Consider adding a soft "Contact sales" path for agencies or multi-residence groups.
- Consider adding a "for agencies" future expansion note in the desktop layout.

## 6. Priority

Overall priority: High

Reason:

The Landing Page is the first public impression. It is good enough to proceed as a low-fidelity
foundation, but before high-fidelity design the trust, worker value proposition, and AI-human
approval separation should be strengthened.

## Review Criteria Results

Business Review: Pass with conditions

- Answers what Resident Job is: yes.
- Answers who it is for: yes.
- Explains why it is different: yes, but trust depth should increase.
- Explains why a residence should trust it: partial, needs stronger trust pillars.
- Explains why a worker should register: partial, needs clearer worker value block.

UX Review: Pass with conditions

- Visual hierarchy: strong for low-fidelity.
- First impression: strong.
- CTA placement: strong.
- Information overload: acceptable, but mobile length should be managed.
- Scrolling flow: logical.
- Mobile usability: strong.
- Accessibility: strong for low-fidelity.
- Cognitive load: acceptable.

Healthcare Review: Pass with conditions

- Healthcare professionalism: good direction.
- Trust: needs stronger section.
- Staffing reliability: present.
- Urgency capability: present.
- Compliance: present but compact.
- Worker verification: present but should be more visible.
- Generic job board risk: reduced, but not eliminated.

AI Review: Pass with conditions

- AI is assistant/recommendation support: yes.
- AI is not human replacement: yes.
- Needs stronger visual separation of recommendation, evidence, and human approval.

Syria/Canada Neutrality: Pass

- No hardcoded regulations.
- No country-specific assumptions.
- Copy remains generally international.

Conversion Review: Pass with conditions

- Worker registration path: present, needs stronger worker value.
- Employer request path: strong.
- Create account/contact sales path: present or implied, agency/sales path could be clearer.

Missing Opportunities:

- Dedicated worker value block.
- Stronger trust/compliance pillars.
- Employer and worker workflow split.
- Agency/multi-residence CTA as future or secondary path.

## Final Review Recommendation

Approved with documented conditions.

Do not begin Page 002 wireframe until the owner either accepts these conditions or requests
remediation to Page 001 wireframe.

No production code is authorized.

