import { describe, expect, it } from "vitest";
import { getDatabaseConnectionString } from "./foundation";

describe("database connection resolution", () => {
  it("never falls back to the localhost validation database in production", () => {
    expect(() =>
      getDatabaseConnectionString({ RWOS_ENV: "production", NODE_ENV: "production" })
    ).toThrow("RWOS_PRODUCTION_DATABASE_URL_REQUIRED");
  });

  it("uses the explicit production database URL", () => {
    expect(
      getDatabaseConnectionString({
        RWOS_ENV: "production",
        NODE_ENV: "production",
        DATABASE_URL: "postgresql://database.example.test/rwos"
      })
    ).toBe("postgresql://database.example.test/rwos");
  });
});
