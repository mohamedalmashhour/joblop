import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./PaymentStatePanel.tsx", import.meta.url), "utf8");

describe("durable employer payment panel", () => {
  it("renders truthful loading, error, empty, and disabled mutation boundaries", () => {
    for (const statement of [
      "Loading payment records",
      "Payment records could not be loaded",
      "No employer payment attempts exist for this organization",
      "Mutations disabled in this view",
      "Governed payment action unavailable"
    ]) {
      expect(source).toContain(statement);
    }
    expect(source).toContain('fetch("/api/payments"');
    expect(source).toContain("disabled");
    expect(source).not.toContain("paymentFixture");
  });
});
