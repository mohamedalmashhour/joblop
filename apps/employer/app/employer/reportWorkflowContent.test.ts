import { describe, expect, it } from "vitest";
import {
  employerReportMetrics,
  getMetricByLabel,
  getReportReadiness,
  reportBoundaries,
  reportDataTruth
} from "./reportWorkflowContent";

describe("Employer reports workflow content", () => {
  it("includes the requested employer report metrics", () => {
    expect(employerReportMetrics.map((metric) => metric.label)).toEqual([
      "Total shifts",
      "Published shifts",
      "Fill rate",
      "Urgent-shift volume",
      "Assignment acceptance rate",
      "Attendance exceptions",
      "No-show count",
      "Approved hours",
      "Overtime",
      "Invoice totals",
      "Payment status",
      "Overdue invoices",
      "Residence usage",
      "Department usage",
      "Role demand"
    ]);
  });

  it("labels every metric with source and governing route", () => {
    const readiness = getReportReadiness();
    expect(readiness.metrics).toBe(15);
    expect(readiness.hasSources).toBe(true);
    expect(readiness.hasGoverningLinks).toBe(true);
    expect(readiness.hasLiveData).toBe(false);
  });

  it("keeps reports separate from source-of-truth workflows", () => {
    expect(reportBoundaries).toContain("Report metric != Source of truth");
    expect(reportBoundaries).toContain("Summary != Operational action");
    expect(reportBoundaries).toContain("Invoice metric != Payment execution");
  });

  it("does not fabricate trends or mutate records", () => {
    expect(reportDataTruth).toContain("No fabricated trends");
    expect(reportDataTruth).toContain("No source-record mutation");
    expect(reportDataTruth).toContain("Partial and stale states visible");
  });

  it("links financial metrics back to governing records", () => {
    expect(getMetricByLabel("Invoice totals")?.route).toBe("/employer/invoices/detail");
    expect(getMetricByLabel("Payment status")?.route).toBe("/employer/payments/authorization");
  });
});
