import { describe, expect, it } from "vitest";
import { showPayrollTestBadge } from "./testBadge";

describe("payroll test badge", () => {
  it("is hidden on the production tier", () => {
    expect(showPayrollTestBadge("production")).toBe(false);
  });
  it("is hidden in a release build with no tier (Render)", () => {
    expect(showPayrollTestBadge(undefined, "production")).toBe(false);
  });
  it("shows on local and staging", () => {
    expect(showPayrollTestBadge(undefined, "development")).toBe(true);
    expect(showPayrollTestBadge("staging")).toBe(true);
  });
});
