# Design Review Checklist

Status: Approved UX review control
Architecture baseline: Resident Job Architecture Phase 1 v1.0
UX baseline: Resident Job UX Foundation
Implementation: Not authorized

Every low-fidelity and future high-fidelity page must pass this checklist before approval.

## 1. Workflow Clarity

- The primary user can understand the page purpose within five seconds.
- The next action is obvious.
- Protected actions are visually separated from informational content.
- Emergency paths highlight urgency without hiding required checks.
- Empty, loading, error, and success states are defined.

## 2. Mobile Usability

- Mobile layout is designed first, not compressed from desktop.
- Primary actions remain reachable.
- Touch targets are at least 44px.
- Forms are broken into short, understandable steps.
- Dense tables are avoided on mobile.

## 3. Accessibility

- WCAG 2.2 AA is the target.
- Text has sufficient contrast.
- Color is not the only status indicator.
- Controls have accessible labels.
- Keyboard/focus behavior is defined for desktop.
- Error messages explain how to recover.

## 4. Healthcare And Staffing Compliance Considerations

- No private worker, client, health, billing, or payroll data appears on public pages.
- Credential and compliance states are clearly labeled.
- Availability is not guaranteed unless supported by approved policy.
- Audit and evidence requirements are visible for protected workflows.

## 5. Permission And Security Consistency

- Page access matches the Permission Matrix.
- Users cannot see controls they are not allowed to use.
- Admin screens do not bypass finance, payroll, compliance, or AI-control gates.
- Sensitive actions require recorded human approval.

## 6. AI Transparency

- AI is labeled as advisory.
- AI recommendations are distinct from human decisions.
- Evidence chips or missing-information notices are present where AI advises.
- AI never appears to dispatch, pay, approve, reject, or publish by itself.

## 7. Performance Considerations

- Page avoids unnecessary heavy media.
- Critical content appears before decorative content.
- Mobile views do not depend on large dashboard grids.
- Loading states protect the user from blank screens.

## 8. Visual Consistency

- Uses the Global Design System.
- Uses consistent spacing, typography, and status colors.
- Uses role and group language consistently.
- Separates worker pay, client billing, and platform margin visually and conceptually.

## Review Outcome

Each page receives one outcome:

- Approved
- Approved with documented conditions
- Remediation required

