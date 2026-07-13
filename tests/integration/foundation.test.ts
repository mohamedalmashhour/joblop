import { describe, expect, it } from "vitest";
import { rwosProduct } from "@rwos/shared";
import { getDatabaseShellStatus } from "@rwos/database";

describe("foundation contract", () => {
  it("keeps the repository in foundation-only mode", () => {
    expect(rwosProduct.implementationStatus).toBe("foundation-only");
    expect(getDatabaseShellStatus().businessSchemaAuthorized).toBe(false);
  });
});
