import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("QA reset database dependency boundary", () => {
  it("uses only approved workspace ports and has no direct network/provider implementation", () => {
    const packageJson = JSON.parse(readFileSync("apps/qa-reset/package.json", "utf8")) as Record<
      string,
      unknown
    >;
    expect(packageJson.dependencies).toEqual({
      "@rwos/database": "workspace:*",
      "@rwos/service-auth": "workspace:*"
    });
    const source = readdirSync("apps/qa-reset/src")
      .filter((name) => name.endsWith(".ts") && !name.endsWith(".test.ts"))
      .map((name) => readFileSync(`apps/qa-reset/src/${name}`, "utf8"))
      .join("\n");
    expect(source).not.toMatch(
      /\bfetch\s*\(|node:net|node:https|createConnection|TRUNCATE\s+(?:TABLE\s+)?["a-z]|DROP\s+TABLE/i
    );
    expect(source).not.toContain("MemoryResetRepository(),\n  lock:");
    expect(source).toContain("QA_RESET_POSTGRES_FACTORY_REQUIRED");
  });
});
