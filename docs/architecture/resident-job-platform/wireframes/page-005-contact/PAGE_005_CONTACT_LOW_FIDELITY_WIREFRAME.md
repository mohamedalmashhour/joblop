# Page 005 - Contact Low-Fidelity Wireframe

Status: Initial low-fidelity wireframe created
Page: 005 - Contact
Architecture reference: `docs/architecture/resident-job-platform/pages/PAGE_005_CONTACT.md`
Architecture baseline: Resident Job Architecture Phase 1 v1.0
UX baseline: Resident Job UX Foundation
Implementation: Not authorized
Messaging integration: Not authorized
Support-ticket integration: Not authorized

## A. Purpose

The Contact page helps the correct user reach the correct Resident Job team quickly and safely.

It supports:

- Employers requesting staffing support.
- Workers asking for account or shift help.
- Active shift issues.
- Billing and invoice questions.
- Compliance or document questions.
- General inquiries.
- Sales or enterprise inquiries.

The page must not become an unstructured generic inbox.

## B. Primary User

Primary users:

- Worker.
- Employer.
- Residence manager.
- Scheduler.
- Applicant.
- Visitor.
- Support user reviewing future routed messages.

## C. User Goals

Visitors should be able to:

- Select the correct contact reason.
- Identify themselves without exposing unnecessary sensitive information.
- Classify urgency safely.
- Submit a structured message.
- Understand response expectations without fake guarantees.
- Know that medical or public-safety emergencies must use local emergency services.
- Avoid submitting passwords, full payment-card details, unnecessary health records, or full banking
  details through the public form.

## D. Information Hierarchy

1. Contact introduction and safety notice.
2. Contact reason selector.
3. User-type identification.
4. Urgency classification.
5. Contextual contact form.
6. Attachment rules.
7. Response expectations.
8. Alternative contact channels.
9. Confirmation state.
10. Privacy and safety block.
11. FAQ preview.
12. Footer.

## E. Desktop Wireframe

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ HEADER                                                                       │
│ Resident Job       About   How It Works   Pricing   Contact   Sign In        │
│                                      [Request Staff] [Become a Worker]       │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ CONTACT RESIDENT JOB                                                         │
│                                                                              │
│ Choose the reason for your message so it can be routed safely.                │
│                                                                              │
│ For medical or public-safety emergencies, use local emergency services.       │
│ Do not use this platform for emergency medical or public-safety situations.   │
│                                                                              │
│ [Request Staffing] [Worker Support] [Active Shift Issue]                     │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────┬───────────────────────────────────────┐
│ CONTACT FORM                         │ CONTEXTUAL SUPPORT PANEL              │
│                                      │                                       │
│ Step 1 - Contact reason              │ Response expectations                  │
│ [Request staffing]                   │ Standard inquiries: configurable       │
│ [Existing shift issue]               │ Active shift issues: configurable      │
│ [Worker support]                     │ Billing inquiries: configurable        │
│ [Employer account support]           │ Sales inquiries: configurable          │
│ [Billing or invoice]                 │                                       │
│ [Documents or compliance]            │ Response times may vary by request     │
│ [Technical issue]                    │ type, time, and service availability.  │
│ [Sales or enterprise]                │                                       │
│ [Privacy request]                    │ Alternative channels                   │
│ [Other]                              │ [Secure in-app messaging placeholder]  │
│                                      │ [Phone support placeholder]            │
│ Step 2 - User type                   │ [Email support placeholder]            │
│ [Worker] [Employer] [Residence mgr]  │ [Sales contact placeholder]            │
│ [Scheduler] [Applicant] [Visitor]    │ [Help centre placeholder]              │
│ [Other]                              │ [Accessibility accommodation request]  │
│                                      │                                       │
│ Step 3 - Urgency                     │ No invented phone numbers, emails,     │
│ [Standard] [Time-sensitive]          │ office addresses, or hours.            │
│ [Active shift issue]                 │                                       │
│                                      │                                       │
│ Active shift issue path              │                                       │
│ Distinct operational-support notice  │                                       │
│                                      │                                       │
│ Step 4 - Message fields              │                                       │
│ Name                                 │                                       │
│ Email                                │                                       │
│ Phone optional unless operationally  │                                       │
│ required                             │                                       │
│ Organization where relevant          │                                       │
│ Subject                              │                                       │
│ Message                              │                                       │
│ Preferred response method            │                                       │
│ Consent/privacy acknowledgement      │                                       │
│                                      │                                       │
│ Conditional fields                   │                                       │
│ Shift reference                      │                                       │
│ Invoice reference                    │                                       │
│ Worker or employer account reference │                                       │
│ Residence/location                   │                                       │
│ Date and time of issue               │                                       │
│                                      │                                       │
│ [Submit Request]                     │                                       │
└──────────────────────────────────────┴───────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ ATTACHMENT RULES                                                             │
│                                                                              │
│ Accepted file types placeholder | Size limits placeholder                     │
│ Upload state | Failure state | Remove attachment | Successful attachment      │
│                                                                              │
│ Do not upload passwords, complete payment-card details, unnecessary health    │
│ records, full banking details, or unrelated personal information.             │
│                                                                              │
│ Attachments are not instantly reviewed. Malware/security review is a future   │
│ system requirement.                                                          │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ PRIVACY AND SAFETY                                                           │
│                                                                              │
│ Submit only necessary information. Account-specific support may require sign  │
│ in to protect personal information. Contact submissions are logged and routed. │
│ Sensitive matters may be moved to a secure channel.                           │
│                                                                              │
│ AI may classify or route a request, but people handle consequential decisions │
│ and disputes.                                                                │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ CONFIRMATION STATE                                                           │
│ Request received | Case/reference number placeholder | Selected category      │
│ Next expected step | Avoid duplicate requests unless details changed          │
│ Authenticated users may view request status through a secure link placeholder │
│                                                                              │
│ Do not claim the request has been resolved.                                  │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ FAQ PREVIEW                                                                  │
│ How do I request urgent staff? How do I report a problem during a shift?      │
│ Where do I ask about an invoice? How do I update worker documents? Can I      │
│ contact support without an account? How do I make a privacy request?          │
│ [View FAQ]                                                                   │
└──────────────────────────────────────────────────────────────────────────────┘
```

## F. Tablet Adaptation

- Contact form and support panel stack into two full-width sections.
- Contact reason selector remains first.
- Active shift issue stays visually distinct but avoids undefined "emergency" language.
- Attachment rules appear before upload controls.
- Response expectations remain near the submit area.

## G. Mobile Wireframe

```text
┌──────────────────────────────┐
│ HEADER                       │
│ Resident Job        Menu     │
└──────────────────────────────┘

┌──────────────────────────────┐
│ CONTACT RESIDENT JOB         │
│ Choose the reason so your    │
│ message can be routed safely.│
│                              │
│ Medical/public-safety issues │
│ use local emergency services.│
└──────────────────────────────┘

┌──────────────────────────────┐
│ STEP 1: CONTACT REASON       │
│ Request staffing             │
│ Existing shift issue         │
│ Worker support               │
│ Employer account support     │
│ Billing or invoice           │
│ Documents or compliance      │
│ Technical issue              │
│ Sales or enterprise          │
│ Privacy request              │
│ Other                        │
└──────────────────────────────┘

┌──────────────────────────────┐
│ STEP 2: WHO ARE YOU?         │
│ Worker                       │
│ Employer                     │
│ Residence manager            │
│ Scheduler                    │
│ Applicant                    │
│ Visitor                      │
│ Other                        │
└──────────────────────────────┘

┌──────────────────────────────┐
│ STEP 3: URGENCY              │
│ Standard                     │
│ Time-sensitive               │
│ Active shift issue           │
│                              │
│ Active shift issues use a    │
│ distinct operational-support │
│ path.                        │
└──────────────────────────────┘

┌──────────────────────────────┐
│ STEP 4: MESSAGE              │
│ Name                         │
│ Email                        │
│ Phone optional unless needed │
│ Organization where relevant  │
│ Subject                      │
│ Message                      │
│ Preferred response method    │
│ Privacy acknowledgement      │
│ Conditional refs as needed   │
│ [Submit Request]             │
└──────────────────────────────┘

┌──────────────────────────────┐
│ ATTACHMENTS                  │
│ File type limits             │
│ Size limits                  │
│ Upload / failure / remove    │
│ Do not upload passwords,     │
│ full card, banking, or       │
│ unnecessary health info.     │
└──────────────────────────────┘

┌──────────────────────────────┐
│ RESPONSE EXPECTATIONS        │
│ Standard: configurable       │
│ Active shift: configurable   │
│ Billing: configurable        │
│ Sales: configurable          │
│ Times may vary.              │
└──────────────────────────────┘

┌──────────────────────────────┐
│ PRIVACY AND SAFETY           │
│ Submit only what is needed.  │
│ Account matters may require  │
│ sign-in. AI may classify,    │
│ people decide disputes.      │
└──────────────────────────────┘
```

## H. Navigation Behavior

- Public header remains consistent with Pages 001-004.
- Request Staffing routes to Request Staff or opens the Contact reason preselected.
- Worker Support keeps signed-out access for general help.
- Account-specific support explains that sign-in may be required.
- FAQ preview routes to FAQ.
- Privacy request routes or labels a dedicated privacy request category.
- Mobile menu does not expose authenticated-only pages.

## I. Empty States

If contact content cannot load:

- Show a basic contact form shell.
- Keep the medical/public-safety emergency notice visible.
- Keep the privacy warning visible.
- Do not show invented phone numbers, emails, hours, or addresses.

## J. Loading States

- Header, introduction, contact reason selector, and emergency-services notice render first.
- Conditional fields may load after reason/user type selection.
- Attachment controls show upload progress and loading state.

## K. Error States

Validation errors:

- Required fields are clearly marked.
- Error messages are associated with fields.
- Focus moves to the first invalid field.

Attachment errors:

- Unsupported file type.
- File too large.
- Upload interrupted.
- Remove and retry available.

Submission errors:

- Submission failed.
- Offline or interrupted connection.
- Duplicate-request warning.

## L. Success States

Valid submission confirmation:

- Request received.
- Case/reference number placeholder.
- Selected category.
- Next expected step.
- Warning not to submit duplicate requests unnecessarily.
- Secure request-status link placeholder for authenticated users.

Do not claim the request has been resolved.

## M. Accessibility Considerations

- WCAG 2.2 AA target.
- Keyboard navigation through reason, user type, urgency, fields, attachments, and submit.
- Visible field labels.
- Error association for each invalid field.
- Screen-reader announcements for validation errors, upload state, and submission success.
- Focus management after errors and submission.
- Accessible attachment controls.
- No color-only urgency indicators.
- Readable language and sufficient contrast.

## N. AI Assistant Placement

AI assistant placement:

- Optional behind-the-scenes routing helper notice in the privacy/safety block.
- Optional public helper after the reason selector to suggest likely category.
- Must be labeled advisory.

AI may:

- Classify inquiry type.
- Suggest routing.
- Detect missing fields.
- Identify likely duplicates.
- Summarize a request for support staff.
- Flag active-shift urgency.

AI must not:

- Close complaints automatically.
- Make final billing decisions.
- Decide worker discipline.
- Expose private data.
- Provide clinical advice.
- Represent a human resolution where none occurred.

## O. Future Expansion Notes

Future enhancements:

- Secure in-app messaging.
- Support ticket system.
- Attachment malware scanning.
- Authenticated request status page.
- Phone support integration.
- Support SLA configuration.
- Accessibility accommodation workflow.
- Privacy request workflow.

## Required States

- Empty.
- Valid submission.
- Validation error.
- Attachment error.
- Submission failure.
- Offline or interrupted connection.
- Duplicate-request warning.
- Signed-in context.
- Signed-out context.
- Active-shift escalation state.

## Security And Privacy Review Notes

The design supports:

- Data minimization.
- Spam and abuse controls as future system requirements.
- Rate limiting as a future API requirement.
- Attachment scanning as a future system requirement.
- Authenticated versus unauthenticated handling.
- Safe case-reference handling.
- Audit logging as a future protected workflow requirement.
- Retention rules as a future policy requirement.
- Privacy-request routing.

## Self Validation

Required sections:

- Complete.

Navigation consistency:

- Passed. Uses public navigation and CTA behavior consistent with Pages 001-004.

Mobile-first:

- Passed. Category selection appears before long forms or policy details.

Accessibility:

- Passed at wireframe level.

AI boundaries:

- Passed. AI may classify and route, but people handle consequential decisions and disputes.

Permission consistency:

- Passed. General inquiries do not require an account; account-specific matters explain sign-in may
  be required.

Security and privacy:

- Passed at wireframe level. The form avoids requesting sensitive documents, health information,
  payment-card details, passwords, or full banking details through the general contact form.

Implementation boundary:

- Passed. No production implementation is introduced.

## Review Gate

Page 005 - Contact requires Product Design Review before Page 006 begins.

Valid outcomes:

- Approved.
- Approved with documented conditions.
- Remediation required.

No React, frontend implementation, backend, database, messaging integration, support-ticket
integration, production data, live integrations, or deployment work is authorized.
