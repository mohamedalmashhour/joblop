export const trustMechanisms = [
  {
    title: "Verified worker onboarding",
    text: "Workers move through controlled onboarding before they can participate in governed staffing workflows."
  },
  {
    title: "Credential verification workflow",
    text: "Credential information is routed through review states instead of being treated as automatically approved."
  },
  {
    title: "Background check process",
    text: "Background-check status is represented where available and applicable, without implying universal availability."
  },
  {
    title: "Attendance verification",
    text: "Shift records distinguish scheduled time, attendance evidence, review, and approved outcomes."
  },
  {
    title: "Secure document handling",
    text: "Sensitive documents belong in controlled workflows with limited visibility and review boundaries."
  },
  {
    title: "Human oversight",
    text: "AI-assisted matching supports review. It does not replace authorized human decisions."
  },
  {
    title: "Operational transparency",
    text: "Requests, approvals, attendance, communication, and financial handoffs are designed to stay traceable."
  },
  {
    title: "Auditability",
    text: "Important actions are designed to preserve who acted, what changed, when it happened, and why."
  }
] as const;

export const operatingPhilosophy = [
  "Verify first",
  "Match carefully",
  "Human approval",
  "Track work",
  "Preserve records",
  "Separate billing from compensation"
] as const;

export const servedOrganizations = [
  "Senior residences",
  "Healthcare facilities",
  "Retirement homes",
  "Clinics",
  "Long-term care organizations",
  "Staffing agencies"
] as const;

export const platformCapabilities = [
  "Worker intake",
  "Client request intake",
  "Group-based staffing categories",
  "AI-assisted matching",
  "Human approval",
  "Attendance tracking",
  "Billing and worker-pay separation",
  "Documentation and audit trail"
] as const;

export const trustStatements = [
  {
    audience: "Employers",
    text: "Employers receive clearer request, approval, attendance, communication, and billing records."
  },
  {
    audience: "Workers",
    text: "Workers are matched according to role, profile, availability, and approved employer needs."
  }
] as const;

export const aiBoundary = [
  "AI can prepare recommendations.",
  "AI can identify missing information.",
  "AI cannot dispatch workers automatically.",
  "AI cannot approve compliance decisions.",
  "AI cannot approve pay or final operational decisions."
] as const;

