import { describe, expect, it } from "vitest";
import { buildApi } from "./app";

describe("api health endpoint", () => {
  it("returns the foundation health payload", async () => {
    const app = buildApi();
    const response = await app.inject({ method: "GET", url: "/health" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      ok: true,
      service: "resident-workforce-os-api",
      foundationOnly: true
    });
  });
});
