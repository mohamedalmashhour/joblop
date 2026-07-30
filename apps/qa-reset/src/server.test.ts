import { afterEach, describe, expect, it } from "vitest";
import { startQaResetFailClosedServer } from "./failClosedServer";

let server: ReturnType<typeof startQaResetFailClosedServer> | undefined;

afterEach(
  () =>
    new Promise<void>((resolve) => {
      if (!server?.listening) {
        resolve();
        return;
      }
      server.close(() => resolve());
    })
);

describe("QA reset fail-closed packaged surface", () => {
  it("serves only liveness while PostgreSQL composition is unavailable", async () => {
    server = startQaResetFailClosedServer(0);
    await new Promise<void>((resolve) => server!.once("listening", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("QA_RESET_TEST_ADDRESS_REQUIRED");
    const origin = `http://127.0.0.1:${address.port}`;

    const health = await fetch(`${origin}/health`);
    expect(health.status).toBe(200);
    expect(await health.json()).toEqual({ status: "alive" });

    for (const path of ["/ready", "/reset", "/unknown"]) {
      const response = await fetch(`${origin}${path}`);
      expect(response.status).toBe(503);
      expect(await response.json()).toEqual({ status: "unavailable" });
    }
  });
});
