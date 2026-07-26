import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { createContractMoney } from "./moneyEngine";

const domainRoot = new URL("./", import.meta.url);
const repositoryRoot = new URL("../../../../", import.meta.url);
const legacyMoneyPath = new URL("./money.ts", domainRoot);

describe("legacy CAD money.ts retirement", () => {
  it("deletes the legacy CAD-only helper after Money Engine adoption", () => {
    expect(existsSync(legacyMoneyPath)).toBe(false);
  });

  it("migrates all source imports away from the legacy helper", () => {
    const scannedFiles = [
      "packages/shared/src/domain/index.ts",
      "packages/shared/src/domain/shift.ts",
      "packages/shared/src/domain/application.ts",
      "packages/validation/src/domain/shift.ts",
      "packages/validation/src/domain/application.ts",
      "apps/mobile/src/features/shifts/formatters.ts"
    ];

    for (const file of scannedFiles) {
      const source = readFileSync(join(repositoryRoot.pathname, file), "utf8");

      expect(source, `${file} must not import legacy money.ts`).not.toMatch(
        /from\s+["']\.\/money["']|from\s+["']@rwos\/shared\/domain\/money["']/u
      );
    }
  });

  it("preserves legacy CAD amount behavior through the Money Engine", () => {
    expect(createContractMoney({ amountMinor: 5000, currency: "CAD" })).toEqual({
      amountMinor: 5000,
      currency: "CAD"
    });
    expect(() => createContractMoney({ amountMinor: -1, currency: "CAD" })).toThrow(
      "Money Engine amounts must be non-negative integer minor units."
    );
    expect(() => createContractMoney({ amountMinor: 50.25, currency: "CAD" })).toThrow(
      "Money Engine amounts must be non-negative integer minor units."
    );
  });
});
