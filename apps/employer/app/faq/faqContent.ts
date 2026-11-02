export type ReviewStatus = "Draft" | "Under Review" | "Approved" | "Archived";

export type AnswerGovernance = {
  readonly owner: "Product" | "Operations" | "Finance" | "Support" | "Compliance" | "Security";
  readonly reviewStatus: ReviewStatus;
  readonly version: "Version 1.x";
  readonly lastReviewed: "Pending";
  readonly applicability: string;
  readonly sourceOfTruth:
    | "Approved Business Rule"
    | "Product Policy"
    | "Financial UX Standard"
    | "Security Standard"
    | "Operations Standard"
    | "Architecture Reference";
  readonly escalationPath:
    | "Contact Support"
    | "Active-Shift Support"
    | "Billing Support"
    | "Privacy Request"
    | "Compliance Review";
};

export const faqCategories = [
  "Getting Started",
  "Worker Accounts",
  "Employer And Residence Accounts",
  "Shifts And Scheduling",
  "Check-In, Check-Out, And Timesheets",
  "Pricing, Billing, And Invoices",
  "Worker Earnings And Payments",
  "Documents And Compliance",
  "Safety And Active-Shift Support",
  "Privacy And Security",
  "AI And Automated Assistance"
] as const;

export const faqAnswers = [
  {
    category: "Shifts And Scheduling",
    question: "What happens if a worker is late or absent?",
    summary: "Use Active-Shift Support for current shift issues such as late arrival, no-show, or replacement support.",
    detail:
      "Joblop can route the issue, capture shift context, and prepare a support case. Replacement availability is not guaranteed. A person or authorized employer confirms final assignment decisions.",
    action: "Open Active-Shift Support",
    governance: {
      owner: "Support",
      reviewStatus: "Approved",
      version: "Version 1.x",
      lastReviewed: "Pending",
      applicability: "Workers / Employers / General",
      sourceOfTruth: "Operations Standard",
      escalationPath: "Active-Shift Support"
    }
  },
  {
    category: "Pricing, Billing, And Invoices",
    question: "Is an estimate the same as a final invoice?",
    summary: "No. An estimate is a planning view and is not a guaranteed final invoice.",
    detail:
      "Final billing depends on verified work, employer timesheet review, approved adjustments, and applicable pricing rules.",
    action: "Review Pricing",
    governance: {
      owner: "Finance",
      reviewStatus: "Approved",
      version: "Version 1.x",
      lastReviewed: "Pending",
      applicability: "Employers / General",
      sourceOfTruth: "Financial UX Standard",
      escalationPath: "Billing Support"
    }
  },
  {
    category: "AI And Automated Assistance",
    question: "Does AI assign workers?",
    summary: "No. AI may recommend or summarize, but human review controls final decisions.",
    detail:
      "AI cannot publish staffing decisions, assign workers automatically, waive qualifications, approve timesheets, or make financial decisions.",
    action: "Learn How It Works",
    governance: {
      owner: "Product",
      reviewStatus: "Approved",
      version: "Version 1.x",
      lastReviewed: "Pending",
      applicability: "General",
      sourceOfTruth: "Product Policy",
      escalationPath: "Contact Support"
    }
  }
] as const satisfies readonly {
  readonly category: string;
  readonly question: string;
  readonly summary: string;
  readonly detail: string;
  readonly action: string;
  readonly governance: AnswerGovernance;
}[];

export const aiFaqRules = [
  "AI may recommend an existing approved FAQ.",
  "AI may identify stale content.",
  "AI may suggest an answer for human review.",
  "AI must not publish FAQ content automatically.",
  "AI must not overwrite approved content.",
  "AI must not remove governance metadata.",
  "AI must not invent policy."
] as const;

export const sensitiveSearchWarning = [
  "Do not include passwords.",
  "Do not include full card numbers.",
  "Do not include banking credentials.",
  "Do not include unnecessary health records."
] as const;
