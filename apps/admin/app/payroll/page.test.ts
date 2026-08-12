import { describe, expect, it } from "vitest";
import {
  aiReviewAllowed,
  aiReviewDisclaimer,
  aiReviewHeading,
  aiReviewProhibited,
  aiReviewUnavailableText,
  humanOnlyActions
} from "./payrollContent";

// HR-6 Chunk 3 — the admin AI review panel must present findings as ADVISORY assistance,
// never as authoritative payroll state. These assertions lock that governance boundary.
describe("payroll admin AI review panel governance copy", () => {
  it("labels itself advisory and disclaims any authority", () => {
    expect(aiReviewHeading.toLowerCase()).toContain("advisory");
    const d = aiReviewDisclaimer.toLowerCase();
    expect(d).toContain("advisory");
    expect(d).toContain("not payroll state");
    expect(d).toContain("cannot approve, lock, correct, or pay");
  });

  it("enumerates only read/explain capabilities as allowed", () => {
    expect(aiReviewAllowed.length).toBeGreaterThan(0);
    const joined = aiReviewAllowed.join(" ").toLowerCase();
    for (const verb of ["approve", "lock", "correct", "pay", "recalculate", "change"]) {
      expect(joined).not.toContain(verb);
    }
  });

  it("explicitly prohibits every authoritative / money action", () => {
    const joined = aiReviewProhibited.join(" ").toLowerCase();
    for (const must of ["approve", "lock", "correct", "recalculate", "money"]) {
      expect(joined).toContain(must);
    }
  });

  it("keeps authoritative actions with the human reviewer, not the AI", () => {
    for (const a of ["Approve", "Reject", "Lock", "Request correction"]) {
      expect(humanOnlyActions).toContain(a);
    }
  });

  it("degrades to a safe unavailable message that reassures payroll is unchanged", () => {
    const u = aiReviewUnavailableText.toLowerCase();
    expect(u).toContain("unavailable");
    expect(u).toContain("payroll is unchanged");
  });
});
