import { describe, expect, it } from "vitest";
import { rwosProduct } from "@rwos/shared";
import { getDatabaseFoundationStatus, getDatabaseShellStatus } from "@rwos/database";

describe("foundation contract", () => {
  it("keeps the product in foundation mode while enabling the approved database foundation", () => {
    expect(rwosProduct.implementationStatus).toBe("foundation-only");
    expect(getDatabaseShellStatus().businessSchemaAuthorized).toBe(true);
    expect(getDatabaseFoundationStatus()).toMatchObject({
      provider: "postgresql",
      orm: "prisma",
      migrations: "prisma-migrate",
      client: "prisma-client",
      deferredWorkflowEntitiesImplemented: false
    });
  });
});
