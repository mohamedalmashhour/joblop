import { describe, expect, it } from "vitest";

import {
  addMoney,
  allocateMoney,
  createContractMoney,
  moneyEngineCurrencies,
  sumMoney
} from "./moneyEngine";

describe("shared Money Engine contract adoption", () => {
  it("uses one explicit integer-minor-unit money model", () => {
    expect(moneyEngineCurrencies).toContain("CAD");
    expect(moneyEngineCurrencies).toEqual(["CAD", "USD"]);
    expect(createContractMoney({ amountMinor: 5000, currency: "CAD" })).toEqual({
      amountMinor: 5000,
      currency: "CAD"
    });

    expect(() => createContractMoney({ amountMinor: 50.25, currency: "CAD" })).toThrow(
      "Money Engine amounts must be non-negative integer minor units."
    );
    expect(() => createContractMoney({ amountMinor: 5000, currency: "cad" })).toThrow(
      "Money Engine currency is unsupported."
    );
  });

  it("fails mixed-currency arithmetic until callers convert to one currency", () => {
    const cad = createContractMoney({ amountMinor: 5000, currency: "CAD" });
    const usd = createContractMoney({ amountMinor: 1000, currency: "USD" });

    expect(addMoney(cad, createContractMoney({ amountMinor: 2500, currency: "CAD" }))).toEqual({
      amountMinor: 7500,
      currency: "CAD"
    });
    expect(() => addMoney(cad, usd)).toThrow(
      "Money Engine cannot combine mixed currencies. Convert to one currency first."
    );
    expect(() => sumMoney([cad, usd])).toThrow(
      "Money Engine cannot combine mixed currencies. Convert to one currency first."
    );
  });

  it("keeps allocation balanced in integer minor units", () => {
    const total = createContractMoney({ amountMinor: 10001, currency: "CAD" });
    const allocation = allocateMoney(total, [1, 1, 1]);

    expect(allocation).toEqual([
      { amountMinor: 3334, currency: "CAD" },
      { amountMinor: 3334, currency: "CAD" },
      { amountMinor: 3333, currency: "CAD" }
    ]);
    expect(sumMoney(allocation)).toEqual(total);
  });
});
