import { describe, expect, it } from "vitest";
import {
  aiProhibited,
  employerRecords,
  page064BoundaryStatements,
  protectedActions,
  statusPanels
} from "./employersContent";

describe("Page 064 Employers governance content", () => {
  it("preserves the approved employer boundary statements", () => {
    expect(page064BoundaryStatements).toEqual([
      "Employer organization != Employer user",
      "Billing relationship != Payment execution",
      "Employer active != Residence approved",
      "Employer approval != Unlimited staffing authority",
      "Visibility != Authority",
      "Permission != Completed approval",
      "Summary != Source of truth",
      "AI suggestion != Human decision"
    ]);
  });

  it("keeps employer summaries separate from residence and payment authority", () => {
    expect(employerRecords.map((employer) => employer.lifecycle)).toContain("Restricted");
    expect(employerRecords.some((employer) => employer.billing.includes("summary"))).toBe(true);
    expect(
      employerRecords.some((employer) =>
        employer.privacy.includes("Sensitive reason not displayed")
      )
    ).toBe(true);
  });

  it("requires governed handoffs instead of direct workflow execution", () => {
    expect(protectedActions).toContain("Open source workflow");
    expect(protectedActions).toContain("Request governed export");
    expect(aiProhibited).toContain("Execute invoices or payments");
    expect(aiProhibited).toContain("Approve residences");
    expect(aiProhibited).toContain("Write authoritative state");
  });

  it("includes empty, denied, stale, and partial states", () => {
    expect(statusPanels.map((panel) => panel.title)).toEqual([
      "Empty state",
      "Stale data",
      "Access denied",
      "Partial data"
    ]);
  });
});
