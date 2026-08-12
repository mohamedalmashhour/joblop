// HR-6 Chunk 3 — governance copy for the admin payroll AI review panel.
// Extracted so the advisory / read-only boundary is asserted in tests (mirrors financeContent.ts).
// The panel must present AI output as REVIEW ASSISTANCE, never as authoritative payroll state.

export const aiReviewHeading = "AI review (advisory)";

export const aiReviewDisclaimer =
  "Advisory review assistance only. These findings help a human prioritize review — they are not payroll state and change nothing. AI cannot approve, lock, correct, or pay.";

// What the advisory layer is allowed to do.
export const aiReviewAllowed: readonly string[] = [
  "Explain the deterministic review flags in plain language",
  "Summarize what a reviewer should look at first",
  "Point to the evidence behind each flag",
  "Surface missing or mismatched authoritative inputs for a human to check"
];

// What the advisory layer must never do (asserted in tests as the hard boundary).
export const aiReviewProhibited: readonly string[] = [
  "Approve, reject, lock, or correct a calculation",
  "Change gross, deductions, net, employer cost, or any line",
  "Set or guess a rate, worked time, or jurisdiction",
  "Recalculate or replace the authoritative calculation",
  "Move, pay, or remit money"
];

// The authoritative actions stay with the human reviewer, never the AI panel.
export const humanOnlyActions: readonly string[] = ["Verify / replay", "Approve", "Reject", "Lock", "Request correction"];

export const aiReviewUnavailableText =
  "AI review is unavailable right now — the deterministic flags below are unaffected and payroll is unchanged.";
