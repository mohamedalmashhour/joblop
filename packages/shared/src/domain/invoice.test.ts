import { describe, expect, it } from "vitest";

import { assertInvoiceSource, canTransitionInvoice, invoiceStatuses } from "./invoice";

describe("invoice foundation", () => {
  const source = {
    type: "locked_timesheet" as const,
    timesheetId: "synthetic-timesheet-a",
    timesheetVersion: 3,
    organizationId: "tenantA",
    assignmentId: "synthetic-assignment-a",
    attendanceRecordId: "synthetic-attendance-a"
  };

  it("exposes the approved lifecycle without coupling issue to payment", () => {
    expect(invoiceStatuses).toContain("issued");
    expect(invoiceStatuses).toContain("refunded");
    expect(canTransitionInvoice("draft", "issued")).toBe(true);
    expect(canTransitionInvoice("issued", "paid")).toBe(true);
    expect(canTransitionInvoice("issued", "refunded")).toBe(false);
    expect(canTransitionInvoice("voided", "issued")).toBe(false);
  });

  it("accepts an exact locked-timesheet organization source", () => {
    expect(() => assertInvoiceSource(source, "tenantA")).not.toThrow();
  });

  it("denies a cross-organization source", () => {
    expect(() => assertInvoiceSource(source, "tenantB")).toThrow(
      "Invoice source is outside the authorized organization."
    );
  });

  it("rejects a mutable or missing Timesheet version", () => {
    expect(() => assertInvoiceSource({ ...source, timesheetVersion: 0 }, "tenantA")).toThrow(
      "Invoice source requires a valid immutable Timesheet version."
    );
  });
});
