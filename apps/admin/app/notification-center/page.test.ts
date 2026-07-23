import { describe, expect, it } from "vitest";
import {
  aiAllowed,
  aiProhibited,
  notificationRecords,
  page074BoundaryStatements,
  protectedActions,
  statusPanels
} from "./notificationCenterContent";

describe("Page 074 Notification Center governance content", () => {
  it("preserves the approved notification center boundary statements", () => {
    expect(page074BoundaryStatements).toEqual([
      "Notification != State change",
      "Delivery failed != Workflow failed",
      "Template approved != Legal approval",
      "Preference visible != Consent override",
      "Visibility != Authority",
      "Permission != Completed approval",
      "Summary != Source of truth",
      "AI suggestion != Human decision"
    ]);
  });

  it("keeps notification summaries masked and separate from authoritative workflow state", () => {
    expect(notificationRecords.some((record) => record.boundary.includes("Delivered !="))).toBe(
      true
    );
    expect(notificationRecords.some((record) => record.boundary.includes("Workflow failed"))).toBe(
      true
    );
    expect(notificationRecords.some((record) => record.boundary.includes("Legal approval"))).toBe(
      true
    );
    expect(
      notificationRecords.every(
        (record) => record.privacy.includes("masked") || record.privacy.includes("hidden")
      )
    ).toBe(true);
  });

  it("uses governed handoffs instead of sending, retrying, acknowledging, or mutating notifications", () => {
    expect(protectedActions).toContain("Open notification source reference");
    expect(protectedActions).toContain("Request template governance review");
    expect(protectedActions).toContain("Open delivery audit reference");
    expect(aiProhibited).toContain("Send notifications");
    expect(aiProhibited).toContain("Retry delivery");
    expect(aiProhibited).toContain("Acknowledge notifications");
    expect(aiProhibited).toContain("Edit notification history");
  });

  it("allows AI only to explain visible notifications and route to owner workflows", () => {
    expect(aiAllowed).toEqual([
      "Summarize visible notifications",
      "Explain notification categories",
      "Identify missing information",
      "Draft human-reviewed notification summaries",
      "Suggest navigation to owner workflows"
    ]);
  });

  it("includes every required truthful notification state", () => {
    expect(statusPanels.map((panel) => panel.title)).toEqual([
      "Loading state",
      "Empty state",
      "Stale data",
      "Partial data",
      "Access denied",
      "Restricted state",
      "Unavailable state",
      "Delivery failed",
      "Expired state",
      "Archived state"
    ]);
  });
});
