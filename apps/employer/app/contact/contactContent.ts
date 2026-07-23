export const contactPaths = [
  {
    title: "Help with an active shift",
    text: "Current shift, late arrival, no-show, replacement, check-in or check-out, or urgent operations issue."
  },
  {
    title: "General contact",
    text: "Staffing, billing, documents, sales, privacy, technical, account, or non-active-shift support."
  }
] as const;

export const activeShiftIssues = [
  "Worker has not arrived",
  "Worker is late",
  "Worker cannot continue shift",
  "Employer cannot receive worker",
  "Shift details are incorrect",
  "Replacement needed",
  "Check-in or check-out problem",
  "Communication failure",
  "Operational safety concern",
  "Other active-shift issue"
] as const;

export const immediateActions = [
  "Contact assigned worker",
  "Contact employer or residence",
  "Request replacement",
  "Report late arrival",
  "Report inability to continue",
  "Open secure support case"
] as const;

export const escalationTimeline = [
  "Submitted",
  "Triage in progress",
  "Assigned to support",
  "Action being coordinated",
  "Resolved or closed"
] as const;

export const generalReasons = [
  "Request staffing",
  "Existing shift issue",
  "Worker support",
  "Employer account support",
  "Billing or invoice",
  "Documents or compliance",
  "Technical issue",
  "Sales or enterprise",
  "Privacy request",
  "Other"
] as const;

export const attachmentWarnings = [
  "Do not upload passwords.",
  "Do not upload complete payment-card details.",
  "Do not upload unnecessary health records.",
  "Do not upload full banking details.",
  "Do not upload unrelated personal information."
] as const;

export const aiSupportBoundary = [
  "AI may classify the issue.",
  "AI may identify urgency.",
  "AI may summarize the case.",
  "AI may flag duplicate reports.",
  "AI must not discipline a worker.",
  "AI must not assign a replacement without authorized confirmation.",
  "AI must not close a dispute or claim the issue is resolved."
] as const;

export const faqPreview = [
  "How do I request urgent staff?",
  "How do I report a problem during a shift?",
  "Where do I ask about an invoice?",
  "How do I make a privacy request?"
] as const;

