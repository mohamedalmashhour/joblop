import { describe, expect, it } from "vitest";
import { GET } from "./route";

describe("crm liveness", () => {
  it("returns a safe process-only response", async () => {
    const response = GET();
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      service: "resident-workforce-os-crm",
      check: "liveness"
    });
  });
});
