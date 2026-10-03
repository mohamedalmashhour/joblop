import { describe, expect, it } from "vitest";
import {
  EMPLOYER_ORDER_LINE_MAX,
  isValidOrderLineQuantity,
  rollupEmployerOrderStatus,
  validateEmployerOrderLines
} from "./employerOrder";

const line = (over: Record<string, unknown> = {}) => ({ workGroup: "kitchen", roleDefinition: "chef", numberOfWorkers: 2, title: "Evening chef", ...over });

describe("employer order (pure)", () => {
  it("validates line quantity bounds", () => {
    expect(isValidOrderLineQuantity(1)).toBe(true);
    expect(isValidOrderLineQuantity(50)).toBe(true);
    expect(isValidOrderLineQuantity(0)).toBe(false);
    expect(isValidOrderLineQuantity(51)).toBe(false);
    expect(isValidOrderLineQuantity(2.5)).toBe(false);
  });

  it("accepts a valid set of lines and trims them", () => {
    const r = validateEmployerOrderLines([line(), line({ roleDefinition: "dishwasher", numberOfWorkers: 3, title: "  Dish pit  " })]);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.lines).toHaveLength(2);
      expect(r.lines[1]?.title).toBe("Dish pit");
    }
  });

  it("rejects empty, oversized, and malformed line sets", () => {
    expect(validateEmployerOrderLines([])).toEqual({ ok: false, reason: "no_lines" });
    expect(validateEmployerOrderLines("x")).toEqual({ ok: false, reason: "no_lines" });
    expect(validateEmployerOrderLines(Array.from({ length: EMPLOYER_ORDER_LINE_MAX + 1 }, () => line()))).toEqual({ ok: false, reason: "too_many_lines" });
    expect(validateEmployerOrderLines([line({ numberOfWorkers: 0 })])).toEqual({ ok: false, reason: "invalid_line" });
    expect(validateEmployerOrderLines([line({ title: "no" })])).toEqual({ ok: false, reason: "invalid_line" });
    expect(validateEmployerOrderLines([line({ roleDefinition: "" })])).toEqual({ ok: false, reason: "invalid_line" });
  });

  it("rolls up order status from children", () => {
    expect(rollupEmployerOrderStatus([])).toBe("draft");
    expect(rollupEmployerOrderStatus(["approved_for_dispatch", "approved_for_dispatch"])).toBe("approved");
    expect(rollupEmployerOrderStatus(["approved_for_dispatch", "submitted"])).toBe("partially_approved");
    expect(rollupEmployerOrderStatus(["submitted", "admin_review"])).toBe("admin_review");
    expect(rollupEmployerOrderStatus(["information_required", "submitted"])).toBe("admin_review");
    expect(rollupEmployerOrderStatus(["submitted", "submitted"])).toBe("submitted");
    expect(rollupEmployerOrderStatus(["draft"])).toBe("draft");
    expect(rollupEmployerOrderStatus(["cancelled", "cancelled"])).toBe("cancelled");
    expect(rollupEmployerOrderStatus(["expired", "cancelled"])).toBe("expired");
    // terminal children set aside while any is active
    expect(rollupEmployerOrderStatus(["approved_for_dispatch", "cancelled"])).toBe("approved");
  });
});
