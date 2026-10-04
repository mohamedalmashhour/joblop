import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Resolve paths relative to THIS file, not the working directory, so the test passes whether it is
// run from the repo root or (as under `pnpm -r test`) with the package directory as the CWD.
const packageJsonUrl = new URL("../package.json", import.meta.url);
const sourceDirUrl = new URL("./", import.meta.url);

describe("offer delivery zero-egress boundary", () => {
  it("has no provider dependency or outbound communication implementation", () => {
    const packageJson = JSON.parse(readFileSync(packageJsonUrl, "utf8")) as Record<string, unknown>;
    expect(packageJson.dependencies).toEqual({
      "@rwos/service-auth": "workspace:*"
    });

    const source = readdirSync(sourceDirUrl)
      .filter((name) => name.endsWith(".ts") && !name.endsWith(".test.ts"))
      .map((name) => readFileSync(new URL(name, sourceDirUrl), "utf8"))
      .join("\n");
    expect(source).not.toMatch(
      /\bfetch\s*\(|node:https|node:net|createConnection|smtp|twilio|sendgrid|mailgun|firebase|webhook/i
    );
  });
});
