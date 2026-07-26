import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { createMoneyAmount, currencies } from "./money";

const moneySource = readFileSync(new URL("./money.ts", import.meta.url), "utf8");

describe("CAD helper boundary before shared Money Engine contract", () => {
  it("keeps the legacy helper intentionally small and CAD-only", () => {
    expect(currencies).toEqual(["CAD"]);
    expect(createMoneyAmount(5000)).toEqual({ amountMinor: 5000, currency: "CAD" });
  });

  it("does not expand into Money Engine authority before the contract kit", () => {
    for (const prohibitedCapability of [
      "round",
      "precision",
      "allocate",
      "split",
      "settlement",
      "reversal",
      "payout",
      "payment",
      "escrow",
      "heldFunds",
      "idempotency",
      "jurisdiction",
      "withholding",
      "deduction"
    ]) {
      expect(moneySource).not.toMatch(new RegExp(prohibitedCapability, "i"));
    }
  });
});
