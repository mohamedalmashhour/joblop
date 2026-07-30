import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./scan-secrets.ts", import.meta.url), "utf8");

describe("secret scan release-surface policy", () => {
  it("scans tracked and non-ignored files without opening ignored local secret stores", () => {
    expect(source).toContain('"ls-files", "--cached", "--others", "--exclude-standard", "-z"');
    expect(source).not.toContain("readdirSync");
    expect(source).not.toContain("statSync");
  });
});
