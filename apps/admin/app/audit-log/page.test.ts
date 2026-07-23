import { describe, expect, it } from "vitest";
import {
  aiAllowed,
  aiProhibited,
  auditEvents,
  page072BoundaryStatements,
  protectedActions,
  statusPanels
} from "./auditLogContent";

describe("Page 072 Audit Log governance content", () => {
  it("preserves the approved audit log boundary statements", () => {
    expect(page072BoundaryStatements).toEqual([
      "Audit display != Audit mutation",
      "Correction != Overwrite",
      "Export request != Unrestricted evidence access",
      "Audit event != Final misconduct finding",
      "Visibility != Authority",
      "Permission != Completed approval",
      "Summary != Source of truth",
      "AI suggestion != Human decision"
    ]);
  });

  it("keeps audit summaries masked and separate from authoritative source records", () => {
    expect(auditEvents.every((event) => event.actor.includes("Masked"))).toBe(true);
    expect(auditEvents.some((event) => event.resource.includes("reference"))).toBe(true);
    expect(auditEvents.some((event) => event.retention.includes("Retention"))).toBe(true);
    expect(auditEvents.some((event) => event.privacy.includes("secrets"))).toBe(true);
  });

  it("uses governed handoffs instead of audit mutation, replay, restore, or workflow execution", () => {
    expect(protectedActions).toContain("Open source workflow reference");
    expect(protectedActions).toContain("Request governed evidence export");
    expect(protectedActions).toContain("Open retention policy reference");
    expect(aiProhibited).toContain("Alter audit history");
    expect(aiProhibited).toContain("Delete audit events");
    expect(aiProhibited).toContain("Replay actions");
    expect(aiProhibited).toContain("Modify authoritative records");
  });

  it("allows AI only to explain visible audit summaries and route to owner workflows", () => {
    expect(aiAllowed).toEqual([
      "Summarize audit activity",
      "Explain audit categories",
      "Identify missing information",
      "Draft human-reviewed audit summaries",
      "Suggest navigation to owner workflows"
    ]);
  });

  it("includes all required truthful audit and retention states", () => {
    expect(statusPanels.map((panel) => panel.title)).toEqual([
      "Loading state",
      "Empty state",
      "Stale data",
      "Partial history",
      "Access denied",
      "Restricted records",
      "Service error",
      "Unavailable source",
      "Retention expired",
      "Audit unavailable"
    ]);
  });
});
