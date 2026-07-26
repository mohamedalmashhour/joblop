# Page 005 - Contact Wireframe Revision 1

Status: Controlled Revision 1 complete
Page: 005 - Contact
Architecture reference: `docs/architecture/resident-job-platform/pages/PAGE_005_CONTACT.md`
Architecture baseline: Resident Job Architecture Phase 1 v1.0
UX baseline: Resident Job UX Foundation
Implementation: Not authorized
Messaging integration: Not authorized
Support-ticket integration: Not authorized

## Revision Scope

Revision 1 is strictly limited to making Active-Shift Support operationally distinct from the
general contact form.

No redesign, architecture change, navigation change, messaging integration, support-ticket
integration, backend work, database work, deployment, or production data work is introduced.

## Summary Of Changes

Revision 1 adds a dedicated Active-Shift Support path that is no longer treated as only another
general contact-reason option.

Changed:

- Added a prominent "Help with an active shift" entry point near the top of the page.
- Added a safety boundary before the active-shift form.
- Added operational active-shift issue categories.
- Added signed-in and signed-out context-capture rules.
- Added an immediate action panel.
- Added a case escalation timeline.
- Added replacement-support guardrails.
- Added duplicate/conflict handling.
- Added secure communication placeholders.
- Added privacy, access, and AI boundaries specific to active-shift support.
- Updated mobile behavior so Active-Shift Support appears near the top with large touch targets.
- Updated desktop behavior with a dedicated active-shift support panel.

Unchanged:

- General contact-routing model.
- Public navigation.
- Architecture Freeze v1.0.
- UX Foundation.
- Country-neutral posture.
- No fabricated phone numbers, emails, hours, response promises, or operational scale.

## A. Purpose

The Contact page routes general inquiries and operational shift issues to the correct support path
without becoming a generic inbox.

The page supports two clearly separated routes:

1. Active-Shift Support for operational issues happening around a current or imminent shift.
2. General Contact for staffing, worker support, employer support, billing, documents, technical,
   sales, privacy, or other non-active-shift inquiries.

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

- Quickly choose Active-Shift Support when a current shift needs operational help.
- Use General Contact for non-active-shift requests.
- Identify themselves without exposing unnecessary sensitive information.
- Submit enough shift context for safe support triage.
- Understand that Resident Job handles staffing and operational shift issues, not medical or
  public-safety emergencies.
- Avoid submitting passwords, full payment-card details, unnecessary health records, or full banking
  details through the public form.

## D. Information Hierarchy

1. Contact introduction and safety notice.
2. Prominent Active-Shift Support entry point.
3. General Contact route.
4. Active-Shift Support panel when selected.
5. General contact form when selected.
6. Attachment rules.
7. Response expectations.
8. Alternative channel placeholders.
9. Confirmation and case-status states.
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
│ Choose the right support path so your request can be routed safely.           │
│                                                                              │
│ Resident Job handles staffing and operational shift issues. Medical           │
│ emergencies, threats to immediate safety, or public-safety emergencies must   │
│ be directed to local emergency services.                                      │
│                                                                              │
│ ┌──────────────────────────────┐  ┌───────────────────────────────────────┐  │
│ │ HELP WITH AN ACTIVE SHIFT    │  │ GENERAL CONTACT                       │  │
│ │ Current shift, late arrival, │  │ Staffing, billing, documents, sales,  │  │
│ │ no-show, replacement, check- │  │ privacy, technical, or account help.  │  │
│ │ in/out, or urgent operations │  │ [Use General Contact]                 │  │
│ │ issue.                       │  └───────────────────────────────────────┘  │
│ │ [Start Active-Shift Support] │                                             │
│ └──────────────────────────────┘                                             │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────┬───────────────────────────────────────┐
│ ACTIVE-SHIFT SUPPORT                 │ ACTIVE CASE PANEL                     │
│ Distinct operational support path    │                                       │
│                                      │ Shift summary                         │
│ Safety boundary                      │ Shift reference: prefilled if safe    │
│ Staffing or shift operations only.   │ Role: Worker / Employer / Residence   │
│ Medical/public-safety issues use     │ Location: visible only if authorized  │
│ local emergency services.            │ Scheduled time: prefilled if safe     │
│                                      │ Current status: placeholder           │
│ Issue category                       │                                       │
│ [Worker has not arrived]             │ Immediate action panel                │
│ [Worker is late]                     │ [Contact assigned worker]             │
│ [Worker cannot continue shift]       │ [Contact employer or residence]       │
│ [Employer cannot receive worker]     │ [Request replacement]                 │
│ [Shift details are incorrect]        │ [Report late arrival]                 │
│ [Replacement needed]                 │ [Report inability to continue]        │
│ [Check-in/check-out problem]         │ [Open secure support case]            │
│ [Communication failure]              │                                       │
│ [Operational safety concern]         │ These actions route or prepare a      │
│ [Other active-shift issue]           │ case. They do not promise automatic   │
│                                      │ resolution.                           │
│ Context capture                      │                                       │
│ Signed-in users: prefill shift       │ Case escalation timeline              │
│ reference, role, residence/location, │ Submitted                             │
│ scheduled start/end, and current     │ -> Triage in progress                 │
│ status where safely available.       │ -> Assigned to support                │
│                                      │ -> Action being coordinated           │
│ Signed-out users: ask only the       │ -> Resolved or closed                 │
│ minimum needed to identify the       │                                       │
│ shift.                               │ Do not claim replacement found until  │
│                                      │ confirmed. No fabricated response     │
│ Message                              │ times.                                │
│ What is happening now?               │                                       │
│ What action is needed?               │ Duplicate/conflict handling           │
│ Best callback or update method       │ If an active case already exists,     │
│                                      │ show authorized reference and direct  │
│ [Submit Active-Shift Case]           │ user to update the current case.      │
└──────────────────────────────────────┴───────────────────────────────────────┘

┌──────────────────────────────────────┬───────────────────────────────────────┐
│ GENERAL CONTACT FORM                 │ CONTEXTUAL SUPPORT PANEL              │
│                                      │                                       │
│ Contact reason                       │ Response expectations                  │
│ [Request staffing]                   │ Standard inquiries: configurable       │
│ [Existing shift issue]               │ Time-sensitive inquiries: configurable │
│ [Worker support]                     │ Billing inquiries: configurable        │
│ [Employer account support]           │ Sales inquiries: configurable          │
│ [Billing or invoice]                 │                                       │
│ [Documents or compliance]            │ Response times may vary by request     │
│ [Technical issue]                    │ type, time, and service availability.  │
│ [Sales or enterprise]                │                                       │
│ [Privacy request]                    │ Alternative channel placeholders       │
│ [Other]                              │ [Secure in-app messaging placeholder]  │
│                                      │ [Phone support placeholder]            │
│ User type                            │ [Email support placeholder]            │
│ [Worker] [Employer] [Residence mgr]  │ [Sales contact placeholder]            │
│ [Scheduler] [Applicant] [Visitor]    │ [Help centre placeholder]              │
│ [Other]                              │ [Accessibility accommodation request]  │
│                                      │                                       │
│ Urgency                              │ No invented phone numbers, emails,     │
│ [Standard] [Time-sensitive]          │ office addresses, or hours.            │
│                                      │                                       │
│ Message fields                       │                                       │
│ Name                                 │                                       │
│ Email                                │                                       │
│ Phone optional unless operationally  │                                       │
│ required                             │                                       │
│ Organization where relevant          │                                       │
│ Subject                              │                                       │
│ Message                              │                                       │
│ Preferred response method            │                                       │
│ Consent/privacy acknowledgement      │                                       │
│ Conditional refs as needed           │                                       │
│                                      │                                       │
│ [Submit Request]                     │                                       │
└──────────────────────────────────────┴───────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ REPLACEMENT SUPPORT GUARDRAILS                                               │
│                                                                              │
│ Availability is not guaranteed. Matching may be AI-assisted, but a person or  │
│ authorized employer confirms the final assignment. The original shift remains │
│ unresolved until a replacement is confirmed.                                  │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ SECURE COMMUNICATION PLACEHOLDERS                                             │
│                                                                              │
│ In-app case messages | Support updates | Worker/employer contact actions      │
│ Notification preferences                                                      │
│                                                                              │
│ No phone numbers, emails, operating hours, or service-level guarantees are     │
│ invented in this wireframe.                                                   │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ ATTACHMENT RULES                                                             │
│                                                                              │
│ Accepted file types placeholder | Size limits placeholder                     │
│ Upload state | Failure state | Remove attachment | Successful attachment      │
│                                                                              │
│ Do not upload passwords, complete payment-card details, unnecessary health    │
│ records, full banking details, or unrelated personal information. Sensitive   │
│ attachments move through a secure channel.                                    │
│                                                                              │
│ Attachments are not instantly reviewed. Malware/security review is a future   │
│ system requirement.                                                          │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ PRIVACY, ACCESS, AND AI BOUNDARIES                                            │
│                                                                              │
│ Only authorized users can view shift-specific information. Unauthenticated     │
│ users receive limited confirmation details. Case references do not expose      │
│ private data. All access and updates are auditable.                           │
│                                                                              │
│ AI may classify the issue, identify urgency, detect a likely no-show or       │
│ conflict, suggest replacement candidates, summarize the case, and flag         │
│ duplicate reports.                                                           │
│                                                                              │
│ AI must not discipline a worker, declare a worker absent without review,       │
│ assign a replacement without authorized confirmation, close a dispute, expose  │
│ private worker or employer information, or claim the issue is resolved.        │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ CONFIRMATION STATE                                                           │
│ Request received | Case/reference number placeholder | Selected category      │
│ Next expected step | Existing case warning when authorized                     │
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

- The two top-level paths stack as large side-by-side cards when space allows.
- Active-Shift Support remains above General Contact.
- Active-shift support panel appears before general contact details after selection.
- Case timeline and immediate action panel stack below the issue category.
- Safety boundary stays close to the active-shift entry point.
- General contact routing remains unchanged.

## G. Mobile Wireframe

```text
┌──────────────────────────────┐
│ HEADER                       │
│ Resident Job        Menu     │
└──────────────────────────────┘

┌──────────────────────────────┐
│ CONTACT RESIDENT JOB         │
│ Choose the right support     │
│ path.                        │
│                              │
│ Medical/public-safety issues │
│ use local emergency services.│
└──────────────────────────────┘

┌──────────────────────────────┐
│ HELP WITH AN ACTIVE SHIFT    │
│ Current shift, no-show, late │
│ arrival, replacement, check- │
│ in/out, or communication     │
│ problem.                     │
│ [Start Active-Shift Support] │
└──────────────────────────────┘

┌──────────────────────────────┐
│ GENERAL CONTACT              │
│ Staffing, billing, documents,│
│ sales, privacy, account, or  │
│ technical support.           │
│ [Use General Contact]        │
└──────────────────────────────┘

┌──────────────────────────────┐
│ ACTIVE-SHIFT SUPPORT         │
│ Safety boundary              │
│ Staffing and operational     │
│ shift issues only.           │
│                              │
│ Issue category               │
│ Worker has not arrived       │
│ Worker is late               │
│ Worker cannot continue       │
│ Employer cannot receive      │
│ Shift details incorrect      │
│ Replacement needed           │
│ Check-in/check-out problem   │
│ Communication failure        │
│ Operational safety concern   │
│ Other active-shift issue     │
└──────────────────────────────┘

┌──────────────────────────────┐
│ SHIFT IDENTIFICATION         │
│ Signed in: prefill safely    │
│ Signed out: minimum fields   │
│ only                         │
│ Shift reference              │
│ Role                         │
│ Residence/location           │
│ Scheduled time               │
│ Current issue                │
│ Best callback/update method  │
└──────────────────────────────┘

┌──────────────────────────────┐
│ WHAT DO YOU NEED NOW?        │
│ Contact assigned worker      │
│ Contact employer/residence   │
│ Request replacement          │
│ Report late arrival          │
│ Report unable to continue    │
│ Open secure support case     │
└──────────────────────────────┘

┌──────────────────────────────┐
│ CASE STATUS                  │
│ Submitted                    │
│ Triage in progress           │
│ Assigned to support          │
│ Action being coordinated     │
│ Resolved or closed           │
│                              │
│ No response-time promise.    │
└──────────────────────────────┘

┌──────────────────────────────┐
│ GENERAL CONTACT FORM         │
│ Contact reason               │
│ User type                    │
│ Standard / Time-sensitive    │
│ Name                         │
│ Email                        │
│ Phone optional unless needed │
│ Organization where relevant  │
│ Subject                      │
│ Message                      │
│ Preferred response method    │
│ Privacy acknowledgement      │
│ [Submit Request]             │
└──────────────────────────────┘

┌──────────────────────────────┐
│ PRIVACY AND ATTACHMENTS      │
│ Do not upload passwords,     │
│ full card, banking, or       │
│ unnecessary health info.     │
│ Sensitive attachments use a  │
│ secure channel.              │
└──────────────────────────────┘
```

## H. Navigation Behavior

- Header navigation remains identical to Pages 001-004.
- Active-Shift Support is a page-level route or panel within Contact, not a separate architecture
  surface.
- General Contact keeps the original contact-reason selector.
- Signed-in users may return to the relevant shift or secure case-status placeholder where
  authorized.
- Signed-out users receive limited confirmation and may be prompted to authenticate for
  account-specific information.

## I. Empty States

- No active shift found: ask for minimum shift-identifying information.
- No authorized shift details visible: explain that sign-in may be required.
- No attachment selected: show attachment guidance without blocking submission.
- No duplicate case found: allow submission.

## J. Loading States

- Loading shift context.
- Checking for existing active case.
- Checking authorization to view shift-specific fields.
- Submitting active-shift case.
- Uploading attachment placeholder.

## K. Error States

- Required shift-identification field missing.
- User is not authorized to view shift details.
- Existing active case already open.
- Attachment type or size not accepted.
- Submission interrupted or offline.
- Support route temporarily unavailable.

## L. Success States

- Active-shift case submitted.
- General contact request submitted.
- Existing active case updated.
- Attachment added or removed.
- Secure communication placeholder opened.

Success states must not claim:

- A replacement has been found.
- A worker has been disciplined.
- A dispute has been closed.
- A case has been resolved.
- A response will arrive within a fabricated time.

## M. Accessibility Considerations

- Active-Shift Support and General Contact use clear headings and accessible labels.
- Touch targets are large enough for urgent mobile use.
- Safety notice is concise and close to the active-shift entry point.
- Long policy text is below the urgent action path.
- Case timeline is readable by screen readers.
- Urgency and state indicators do not rely on color alone.
- Error messages are associated with their fields.
- Focus moves to the next required step after selecting Active-Shift Support.

## N. AI Assistant Placement

AI may:

- Classify the issue.
- Identify urgency.
- Detect likely no-show or conflict.
- Suggest replacement candidates.
- Summarize the case.
- Flag duplicate reports.

AI must not:

- Automatically discipline a worker.
- Declare a worker absent without review.
- Assign a replacement without authorized confirmation.
- Close a dispute.
- Expose private worker or employer information.
- Claim the issue is resolved.

AI language must remain advisory and support-oriented.

## O. Future Expansion Notes

Future enhancements only:

- Authenticated support-ticket workflow.
- Secure in-app active-case messaging.
- Operational support team assignment.
- Configurable response expectations by tenant or service plan.
- Attachment malware scanning.
- Replacement engine integration.
- Real-time shift status updates.

These are not authorized in this wireframe phase.

## Self Validation

- Active-Shift Support is clearly distinct from General Contact.
- Safety boundary is present and country-neutral.
- Operational issue categories are explicit.
- Signed-in and signed-out context capture is privacy-safe.
- Immediate action panel uses routing/action choices, not fake resolutions.
- Escalation timeline avoids fabricated response times.
- Replacement support avoids availability guarantees.
- Duplicate/conflict handling is included.
- Secure communication is represented as placeholders only.
- AI boundaries are explicit.
- Mobile places Active-Shift Support near the top.
- Desktop uses a dedicated active-shift support panel.
- Architecture Freeze v1.0 is unchanged.
- UX Foundation is unchanged.
- General contact routing is unchanged.
- Page 006 remains blocked until approval.
- No implementation work has begun.

