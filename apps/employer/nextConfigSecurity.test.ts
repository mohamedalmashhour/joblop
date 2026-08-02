import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const config = readFileSync(new URL("./next.config.mjs", import.meta.url), "utf8");
const middleware = readFileSync(new URL("./middleware.ts", import.meta.url), "utf8");

describe("employer production transport security", () => {
  it("adds HSTS without relying on the post-proxy request protocol", () => {
    expect(config).toContain('process.env.RWOS_ENV === "production"');
    expect(config).toContain('key: "Strict-Transport-Security"');
    expect(config).toContain('value: "max-age=31536000; includeSubDomains"');
    expect(middleware).not.toContain('request.nextUrl.protocol === "https:"');
  });
});
