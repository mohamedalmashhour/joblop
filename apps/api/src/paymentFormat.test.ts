import { describe, expect, it } from "vitest";
import {
  SHORT_REF_PATTERN,
  cleanPaymentReference,
  createWithShortRef,
  formatCadMinor,
  generatePaymentShortRef,
  parseAmountToMinor
} from "./paymentFormat";
import { formatReceiptNumber, receiptYear } from "./paymentReceipts";

describe("payment helpers", () => {
  it("short references look like JL-7F3K2 and avoid look-alike characters", () => {
    for (let i = 0; i < 200; i += 1) expect(generatePaymentShortRef()).toMatch(SHORT_REF_PATTERN);
    expect(generatePaymentShortRef(() => 0)).toBe("JL-22222");
  });

  it("retries a taken short reference, then gives up", async () => {
    let calls = 0;
    const ref = await createWithShortRef(async (code) => {
      calls += 1;
      if (calls < 3) throw Object.assign(new Error("dup"), { code: "P2002" });
      return code;
    });
    expect(ref).toMatch(SHORT_REF_PATTERN);
    expect(calls).toBe(3);
    await expect(createWithShortRef(async () => { throw new Error("other"); })).rejects.toThrow("other");
  });

  it("writes money like the rest of the site", () => {
    expect(formatCadMinor(5_692)).toBe("$56.92");
    expect(formatCadMinor(123_450)).toBe("$1,234.50");
    expect(formatCadMinor(0)).toBe("$0.00");
  });

  it("reads the amount staff typed", () => {
    expect(parseAmountToMinor("56.92")).toBe(5_692);
    expect(parseAmountToMinor("$56.92")).toBe(5_692);
    expect(parseAmountToMinor("56,92")).toBe(5_692);
    expect(parseAmountToMinor("57")).toBe(5_700);
    expect(parseAmountToMinor("fifty")).toBeNull();
    expect(parseAmountToMinor("-3")).toBeNull();
    expect(cleanPaymentReference("  CA1234 ")).toBe("CA1234");
    expect(cleanPaymentReference("   ")).toBeNull();
    expect(cleanPaymentReference("x".repeat(80))).toHaveLength(64);
  });

  it("numbers receipts per Québec year", () => {
    expect(formatReceiptNumber(2026, 1)).toBe("RCPT-2026-000001");
    expect(receiptYear(new Date("2027-01-01T03:00:00.000Z"))).toBe(2026);
    expect(receiptYear(new Date("2027-01-01T06:00:00.000Z"))).toBe(2027);
  });
});
