import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("QA reset database dependency boundary", () => {
  it("uses only approved workspace ports and has no direct network/provider implementation", () => {
    const packageJson = JSON.parse(
      readFileSync(new URL("../package.json", import.meta.url), "utf8")
    ) as Record<
      string,
      unknown
    >;
    expect(packageJson.dependencies).toEqual({
      "@rwos/database": "workspace:*",
      "@rwos/service-auth": "workspace:*"
    });
    const srcDir = new URL("./", import.meta.url);
    const source = readdirSync(srcDir)
      .filter((name) => name.endsWith(".ts") && !name.endsWith(".test.ts"))
      .map((name) => readFileSync(new URL(name, srcDir), "utf8"))
      .join("\n");
    expect(source).not.toMatch(
      /\bfetch\s*\(|node:net|node:https|createConnection|TRUNCATE\s+(?:TABLE\s+)?["a-z]|DROP\s+TABLE/i
    );
    expect(source).not.toContain("MemoryResetRepository(),\n  lock:");
    expect(source).toContain("QA_RESET_POSTGRES_FACTORY_REQUIRED");
  });
});
