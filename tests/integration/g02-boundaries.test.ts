import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function walk(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    const stat = statSync(path);

    if (stat.isDirectory()) {
      if (["node_modules", "dist", ".next"].includes(entry)) return [];
      return walk(path);
    }

    return path.endsWith(".ts") || path.endsWith(".tsx") ? [path] : [];
  });
}

describe("RWO-G02 boundaries", () => {
  it("keeps application screens behind repository interfaces instead of direct mock data", () => {
    const files = walk(join(root, "apps", "mobile", "src", "features", "applications"));
    const visualFiles = files.filter((file) => file.endsWith("ApplicationsScreens.tsx"));
    const violations = visualFiles.filter((file) =>
      readFileSync(file, "utf8").includes("data/mock")
    );

    expect(violations).toEqual([]);
  });

  it("keeps G02 out of attendance, timesheet, payroll and payment implementation", () => {
    const files = walk(join(root, "apps", "mobile", "src")).concat(
      walk(join(root, "packages", "shared", "src"))
    );
    const forbiddenTerms = [
      "timesheet",
      "punchIn",
      "punchOut",
      "payroll",
      "paymentAuthorization",
      "stripe",
      "mastercardCapture"
    ];
    const violations = files.flatMap((file) => {
      const text = readFileSync(file, "utf8");
      return forbiddenTerms.filter((term) => text.includes(term)).map((term) => `${file}:${term}`);
    });

    expect(violations).toEqual([]);
  });

  it("keeps worker-facing mobile code free of client billing and platform margin terms", () => {
    const files = walk(join(root, "apps", "mobile", "src"));
    const forbiddenTerms = [
      "clientBillingRate",
      "clientCharge",
      "platformMargin",
      "grossPlatformMargin",
      "commercialHourlyRate"
    ];
    const violations = files.flatMap((file) => {
      const text = readFileSync(file, "utf8");
      return forbiddenTerms.filter((term) => text.includes(term)).map((term) => `${file}:${term}`);
    });

    expect(violations).toEqual([]);
  });
});
