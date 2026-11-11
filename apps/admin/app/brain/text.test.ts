import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { brainText } from "./text";

const SWITCHES = [
  "resend_failed_message",
  "remind_worker_check_in",
  "remind_employer_timesheet",
  "offer_employer_bonus",
  "auto_approve_request",
  "auto_approve_timesheet",
  "daily_summary_email",
  // Brain phase 2: the assistant in Contact Joblop.
  "assistant",
  "assistant.worker",
  "assistant.employer",
  "assistant.staff",
  "assistant.worker.claim_job",
  "assistant.worker.cancel_shift",
  "assistant.worker.confirm_shift",
  "assistant.employer.create_draft",
  "assistant.employer.submit_draft",
  "assistant.employer.confirm_timesheet",
  "assistant.employer.duplicate_request",
  "assistant.staff.brain_do_it",
  "assistant.staff.approve_request",
  "assistant.staff.approve_timesheet"
];
const RULES = ["assistant", "job_unfilled_soon", "worker_not_checked_in", "delivery_failed", "request_waiting_review", "timesheet_unconfirmed", "timesheet_ready", "invoice_overdue", "job_missing_info"];

describe("Brain page", () => {
  it("has the same copy keys in English, French and Arabic, with a plain label for every switch and rule", () => {
    const keys = Object.keys(brainText.en).sort();
    for (const locale of ["fr", "ar"] as const) expect(Object.keys(brainText[locale]).sort()).toEqual(keys);
    for (const locale of ["en", "fr", "ar"] as const) {
      for (const key of SWITCHES) expect(brainText[locale].switchNames[key], `${locale}:${key}`).toBeTruthy();
      for (const key of RULES) expect(brainText[locale].ruleNames[key], `${locale}:${key}`).toBeTruthy();
    }
  });

  it("shows the shared staff sign-in block when signed out, and uses black text on gold buttons", () => {
    const panel = readFileSync(new URL("./BrainPanel.tsx", import.meta.url), "utf8");
    expect(panel).toContain("<SignedOut compact />");
    expect(panel).toMatch(/goldButton: \{ background: GOLD, color: "#000000"/);
  });
});
