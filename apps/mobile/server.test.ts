import { mkdtempSync, mkdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createWorkerWebServer, parseRange } from "./server.mjs";

const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { force: true, recursive: true });
  }
});

describe("worker web production server", () => {
  it("serves safe health and readiness responses without external calls", async () => {
    const root = createFixture();
    const server = createWorkerWebServer({ root });
    await listen(server);
    const address = server.address();
    expect(address).toBeTypeOf("object");
    const port = typeof address === "object" && address ? address.port : 0;

    const health = await fetch(`http://127.0.0.1:${port}/health`);
    await expect(health.json()).resolves.toEqual({
      ok: true,
      service: "resident-workforce-os-worker-web",
      check: "liveness"
    });
    expectSecurityHeaders(health);
    expect(health.headers.get("strict-transport-security")).toBeNull();
    await expect(
      fetch(`http://127.0.0.1:${port}/ready`).then((response) => response.json())
    ).resolves.toEqual({
      ready: true,
      service: "resident-workforce-os-worker-web",
      check: "readiness"
    });

    await new Promise<void>((resolve, reject) =>
      server.close((error?: Error) => (error ? reject(error) : resolve()))
    );
  });

  it("falls back to the single-page entry and blocks traversal", async () => {
    const root = createFixture();
    const server = createWorkerWebServer({ root });
    await listen(server);
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 0;

    await expect(
      fetch(`http://127.0.0.1:${port}/worker/calendar`).then((response) => response.text())
    ).resolves.toBe("<!doctype html><title>worker</title>");
    expect((await fetch(`http://127.0.0.1:${port}/..%2Fpackage.json`)).status).toBe(400);

    await new Promise<void>((resolve, reject) =>
      server.close((error?: Error) => (error ? reject(error) : resolve()))
    );
  });

  it("rejects source maps, hidden files, unknown assets, and symlink escapes", async () => {
    const root = createFixture();
    const outside = join(root, "..", `${root.split("/").at(-1)}-secret.txt`);
    writeFileSync(join(root, "assets", "app.js.map"), "{}");
    writeFileSync(join(root, ".env"), "not-a-secret-value");
    writeFileSync(join(root, "assets", "payload.bin"), "opaque");
    writeFileSync(outside, "outside");
    symlinkSync(outside, join(root, "assets", "outside.txt"));
    const server = createWorkerWebServer({ root });
    await listen(server);
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 0;

    for (const path of [
      "/assets/app.js.map",
      "/.env",
      "/assets/payload.bin",
      "/assets/outside.txt"
    ]) {
      expect((await fetch(`http://127.0.0.1:${port}${path}`)).status).toBe(404);
    }

    await new Promise<void>((resolve, reject) =>
      server.close((error?: Error) => (error ? reject(error) : resolve()))
    );
    rmSync(outside, { force: true });
  });

  it("adds HSTS only when an explicitly trusted production HTTPS boundary is supplied", async () => {
    const root = createFixture();
    const apiOrigin = "https://worker-api.staging.example.test";
    const server = createWorkerWebServer({ root, productionHttps: true, apiOrigin });
    await listen(server);
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 0;

    const response = await fetch(`http://127.0.0.1:${port}/health`);
    expectSecurityHeaders(response);
    expect(response.headers.get("strict-transport-security")).toBe(
      "max-age=31536000; includeSubDomains"
    );
    expect(response.headers.get("content-security-policy")).toContain(
      `connect-src 'self' ${apiOrigin}`
    );
    expect(response.headers.get("content-security-policy")).toContain(
      "style-src 'self' 'unsafe-inline'"
    );

    await new Promise<void>((resolve, reject) =>
      server.close((error?: Error) => (error ? reject(error) : resolve()))
    );
  });

  it("reads one byte range so browsers can play the bundled landing videos", () => {
    expect(parseRange(undefined, 100)).toBeNull();
    expect(parseRange("bytes=0-", 100)).toEqual({ start: 0, end: 99 });
    expect(parseRange("bytes=0-1", 100)).toEqual({ start: 0, end: 1 });
    expect(parseRange("bytes=10-500", 100)).toEqual({ start: 10, end: 99 });
    expect(parseRange("bytes=-10", 100)).toEqual({ start: 90, end: 99 });
    expect(parseRange("bytes=100-", 100)).toBe("invalid");
    expect(parseRange("bytes=5-2", 100)).toBe("invalid");
    expect(parseRange("bytes=0-1,4-5", 100)).toBe("invalid");
    expect(parseRange("items=0-1", 100)).toBe("invalid");
  });

  it("rejects an unsafe or non-origin worker API value", () => {
    const root = createFixture();
    expect(() => createWorkerWebServer({ root, apiOrigin: "http://api.example.test" })).toThrow(
      "RWOS_WORKER_API_ORIGIN_INVALID"
    );
    expect(() =>
      createWorkerWebServer({ root, apiOrigin: "https://api.example.test/path" })
    ).toThrow("RWOS_WORKER_API_ORIGIN_INVALID");
  });
});

function createFixture() {
  const root = mkdtempSync(join(tmpdir(), "rwos-worker-web-"));
  temporaryDirectories.push(root);
  mkdirSync(join(root, "assets"));
  writeFileSync(join(root, "index.html"), "<!doctype html><title>worker</title>");
  writeFileSync(join(root, "assets", "app.js"), "export {};");
  return root;
}

async function listen(server: ReturnType<typeof createWorkerWebServer>) {
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      server.off("error", reject);
      resolve();
    });
  });
}

function expectSecurityHeaders(response: Response) {
  expect(response.headers.get("content-security-policy")).toContain("frame-ancestors 'none'");
  expect(response.headers.get("permissions-policy")).toBe(
    "camera=(), geolocation=(), microphone=(), payment=()"
  );
  expect(response.headers.get("referrer-policy")).toBe("strict-origin-when-cross-origin");
  expect(response.headers.get("x-content-type-options")).toBe("nosniff");
  expect(response.headers.get("x-frame-options")).toBe("DENY");
}
