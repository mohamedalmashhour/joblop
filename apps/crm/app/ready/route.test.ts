import { describe, expect, it } from "vitest";
import { createReadinessResponse } from "./readiness";

describe("crm readiness", () => {
  it("validates configuration without contacting the API", async () => {
    const response = createReadinessResponse({
      INTERNAL_API_ORIGIN: "https://api.example.test",
      NODE_ENV: "production",
      RWOS_ENV: "production"
    });
    expect(response.status).toBe(200);
    expect((await response.json()).ready).toBe(true);
  });

  it("fails closed for missing production API configuration", async () => {
    const response = createReadinessResponse({
      NODE_ENV: "production",
      RWOS_ENV: "production"
    });
    expect(response.status).toBe(503);
    expect((await response.json()).ready).toBe(false);
  });
});
