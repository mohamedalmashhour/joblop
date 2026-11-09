import { describe, expect, it } from "vitest";
import { workerPayLabel } from "./workerPayLabel";

const copy = { paidByEmployer: "paid directly by the employer", employerPaysDirectly: "Pay set and paid directly by the employer", pending: "Hourly pay: confirmed before you're offered the shift" };

describe("workerPayLabel", () => {
  it("shows the worker's own hourly pay on a short-term job", () => {
    expect(workerPayLabel({ workerRateMinor: 2_500, currency: "CAD" }, "en-CA", copy)).toBe("$25.00/h");
  });

  it("shows a clear line instead of blank or $0 when the pay is not set yet", () => {
    expect(workerPayLabel({ workerRateMinor: null, currency: "CAD" }, "en-CA", copy)).toBe(copy.pending);
    expect(workerPayLabel({ workerRateMinor: 0, currency: "CAD" }, "en-CA", copy)).toBe(copy.pending);
    expect(workerPayLabel({}, "en-CA", copy)).toBe(copy.pending);
  });

  it("shows the employer's pay offer on a long-term job", () => {
    expect(workerPayLabel({ workerRateMinor: null, payOffered: { minMinor: 2_200, maxMinor: null, unit: "hour", currency: "CAD", paidBy: "employer" } }, "en-CA", copy)).toBe(
      "$22/h · paid directly by the employer"
    );
    expect(workerPayLabel({ workerRateMinor: null, payOffered: null }, "en-CA", copy)).toBe(copy.employerPaysDirectly);
  });
});
