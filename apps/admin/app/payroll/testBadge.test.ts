import { describe, expect, it } from "vitest";
import { showPayrollTestBadge } from "./testBadge";

describe("payroll test badge", () => {
  it("is hidden on the production tier", () => {
    expect(showPayrollTestBadge("production")).toBe(false);
  });
  it("shows on local and staging", () => {
    expect(showPayrollTestBadge(undefined)).toBe(true);
    expect(showPayrollTestBadge("staging")).toBe(true);
  });
});
