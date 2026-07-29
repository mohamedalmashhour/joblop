import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("offer delivery zero-egress boundary", () => {
  it("has no provider dependency or outbound communication implementation", () => {
    const packageJson = JSON.parse(
      readFileSync("apps/offer-delivery/package.json", "utf8")
    ) as Record<string, unknown>;
    expect(packageJson.dependencies).toEqual({
      "@rwos/service-auth": "workspace:*"
    });

    const source = readdirSync("apps/offer-delivery/src")
      .filter((name) => name.endsWith(".ts") && !name.endsWith(".test.ts"))
      .map((name) => readFileSync(`apps/offer-delivery/src/${name}`, "utf8"))
      .join("\n");
    expect(source).not.toMatch(
      /\bfetch\s*\(|node:https|node:net|createConnection|smtp|twilio|sendgrid|mailgun|firebase|webhook/i
    );
  });
});
