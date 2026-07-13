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

describe("RWO-G01 boundaries", () => {
  it("keeps visual shift components from importing mock data directly", () => {
    const featureFiles = walk(join(root, "apps", "mobile", "src", "features", "shifts"));
    const visualFiles = featureFiles.filter((file) =>
      ["AvailableShiftsScreen.tsx", "ShiftCard.tsx", "ShiftDetailsScreen.tsx"].some((name) =>
        file.endsWith(name)
      )
    );

    const violations = visualFiles.filter((file) =>
      readFileSync(file, "utf8").includes("data/mock")
    );

    expect(violations).toEqual([]);
  });

  it("keeps worker-facing mobile code free of client billing and platform margin terms", () => {
    const mobileFiles = walk(join(root, "apps", "mobile", "src"));
    const forbiddenTerms = [
      "clientBillingRate",
      "platformMargin",
      "grossPlatformMargin",
      "commercialHourlyRate"
    ];
    const violations = mobileFiles.flatMap((file) => {
      const text = readFileSync(file, "utf8");
      return forbiddenTerms.filter((term) => text.includes(term)).map((term) => `${file}:${term}`);
    });

    expect(violations).toEqual([]);
  });
});
