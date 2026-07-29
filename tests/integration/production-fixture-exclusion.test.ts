import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "../..");
const productionEntries = {
  employer: [
    "apps/employer/app/layout.tsx",
    "apps/employer/app/page.tsx",
    "apps/employer/app/about/page.tsx",
    "apps/employer/app/contact/page.tsx",
    "apps/employer/app/faq/page.tsx",
    "apps/employer/app/how-it-works/page.tsx",
    "apps/employer/app/pricing/page.tsx",
    "apps/employer/app/employer/calendar/page.tsx",
    "apps/employer/app/employer/calendar/create/page.tsx",
    "apps/employer/app/employer/calendar/request/page.tsx",
    "apps/employer/app/employer/calendar/request/edit/page.tsx",
    "apps/employer/app/employer/calendar/assignment/page.tsx"
  ],
  admin: [
    "apps/admin/app/layout.tsx",
    "apps/admin/app/calendar/page.tsx",
    "apps/admin/app/calendar/request/page.tsx",
    "apps/admin/app/dispatches/page.tsx",
    "apps/admin/app/dispatches/[dispatchReviewId]/page.tsx"
  ],
  worker: ["apps/mobile/src/ProductionApp.tsx"]
} as const;

const forbiddenModule = /(?:^|\/)(?:App|testFixture|fixtures?|mocks?|mock[^/]*)\.(?:ts|tsx|js)$/i;
const importPattern =
  /(?:import|export)\s+(?:[^"'()]*?\s+from\s+)?["']([^"']+)["']|import\(\s*["']([^"']+)["']\s*\)/g;

describe("production fixture exclusion policy", () => {
  for (const [surface, entries] of Object.entries(productionEntries)) {
    it(`${surface} production entries cannot reach fixture-only modules`, () => {
      const visited = trace(entries);
      expect([...visited].filter((file) => forbiddenModule.test(file))).toEqual([]);
    });
  }

  it("worker bootstrap selects the fixture application only outside production", () => {
    const bootstrap = source("apps/mobile/index.ts");
    expect(bootstrap).toContain(
      'isProductionWorkerBuild() ? import("./src/ProductionApp") : import("./App")'
    );
    expect(source("apps/mobile/src/ProductionApp.tsx")).toContain("allowFixturePreview={false}");
  });
});

function trace(entries: readonly string[]) {
  const pending = [...entries];
  const visited = new Set<string>();
  while (pending.length) {
    const file = pending.pop()!;
    if (visited.has(file)) continue;
    visited.add(file);
    const content = source(file);
    for (const match of content.matchAll(importPattern)) {
      const specifier = match[1] ?? match[2];
      if (!specifier?.startsWith(".")) continue;
      const resolved = resolveImport(file, specifier);
      if (resolved) pending.push(resolved);
    }
  }
  return visited;
}

function resolveImport(importer: string, specifier: string) {
  const base = resolve(root, dirname(importer), specifier);
  for (const candidate of [
    `${base}.ts`,
    `${base}.tsx`,
    `${base}.js`,
    resolve(base, "index.ts"),
    resolve(base, "index.tsx")
  ]) {
    if (existsSync(candidate)) return candidate.slice(root.length + 1);
  }
  return null;
}

function source(file: string) {
  return readFileSync(resolve(root, file), "utf8");
}
