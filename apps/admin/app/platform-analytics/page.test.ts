import { describe, expect, it } from "vitest";
import {
  aiAllowed,
  aiProhibited,
  analyticsRecords,
  page075BoundaryStatements,
  protectedActions,
  statusPanels
} from "./platformAnalyticsContent";

describe("Page 075 Platform Analytics governance content", () => {
  it("preserves the approved platform analytics boundary statements", () => {
    expect(page075BoundaryStatements).toEqual([
      "Analytics != Source record",
      "Trend != Decision",
      "Forecast != Commitment",
      "Aggregate != Individual performance finding",
      "Visibility != Authority",
      "Permission != Completed approval",
      "Summary != Source of truth",
      "AI suggestion != Human decision"
    ]);
  });

  it("keeps analytics as aggregate summaries instead of source records or individual findings", () => {
    expect(analyticsRecords.some((record) => record.boundary.includes("Source record"))).toBe(true);
    expect(
      analyticsRecords.some((record) => record.boundary.includes("Performance judgement"))
    ).toBe(true);
    expect(
      analyticsRecords.some((record) => record.boundary.includes("Individual performance finding"))
    ).toBe(true);
    expect(
      analyticsRecords.every(
        (record) =>
          record.kpiSummary.includes("summary") || record.kpiSummary.includes("unavailable")
      )
    ).toBe(true);
  });

  it("keeps privacy exclusions and blocks restricted raw analytics data", () => {
    expect(
      analyticsRecords.every(
        (record) => record.privacy.includes("hidden") || record.privacy.includes("No protected")
      )
    ).toBe(true);
    expect(
      analyticsRecords.some((record) => record.privacy.includes("raw operational records"))
    ).toBe(true);
    expect(
      analyticsRecords.some((record) => record.privacy.includes("protected-class analysis"))
    ).toBe(true);
  });

  it("uses governed handoffs instead of source editing, workflow execution, or analytics automation", () => {
    expect(protectedActions).toContain("Open metric definition reference");
    expect(protectedActions).toContain("Request data quality review");
    expect(protectedActions).toContain("Request governed analytics export");
    expect(aiProhibited).toContain("Execute workflows");
    expect(aiProhibited).toContain("Generate reports automatically");
    expect(aiProhibited).toContain("Change operational state");
  });

  it("allows AI only to explain aggregate trends and draft human-reviewed summaries", () => {
    expect(aiAllowed).toEqual([
      "Summarize trends",
      "Explain KPIs",
      "Identify missing data",
      "Compare periods",
      "Draft analytical summaries",
      "Suggest navigation to owner workflows"
    ]);
  });

  it("includes every required truthful analytics state", () => {
    expect(statusPanels.map((panel) => panel.title)).toEqual([
      "Loading state",
      "Empty state",
      "Stale data",
      "Partial data",
      "Unavailable state",
      "Restricted state",
      "Access denied",
      "Service error",
      "Comparison unavailable",
      "Insufficient data"
    ]);
  });
});
