import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const employerShell = readFileSync("apps/employer/app/employer/EmployerShell.tsx", "utf8");
const employerStyles = readFileSync("apps/employer/app/globals.css", "utf8");
const adminStyles = readFileSync("apps/admin/app/globals.css", "utf8");
const fixtureWorker = readFileSync("apps/mobile/App.tsx", "utf8");
const mobilePrimitives = readFileSync("apps/mobile/src/ui/primitives.tsx", "utf8");
const productionWorker = readFileSync("apps/mobile/src/ProductionApp.tsx", "utf8");
const webAppRoots = ["apps/employer/app", "apps/admin/app"];

function sourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return path.endsWith(".tsx") && !path.endsWith(".test.tsx") ? [path] : [];
  });
}

function hasWrappingLabel(source: string, controlIndex: number) {
  return source.lastIndexOf("<label", controlIndex) > source.lastIndexOf("</label>", controlIndex);
}

// A control with `id="x"` paired with a `<label htmlFor="x">` elsewhere in the file has a
// valid accessible name (the standard React association), even without a wrapping label.
function hasAssociatedLabel(source: string, attributes: string) {
  const id = attributes.match(/\bid\s*=\s*"([^"]+)"/)?.[1];
  if (!id) return false;
  const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`htmlFor\\s*=\\s*"${escaped}"`).test(source);
}

describe("local accessibility contracts", () => {
  it("provides an employer keyboard bypass and visible focus treatment", () => {
    expect(employerShell).toContain('href="#employer-main-content"');
    expect(employerShell).toContain('id="employer-main-content"');
    expect(employerShell).toContain("tabIndex={-1}");
    expect(employerStyles).toContain(".employer-skip-link:focus");
    expect(employerStyles).toContain(":focus-visible");
  });

  it("keeps visible keyboard focus treatment on admin multiline inputs", () => {
    expect(adminStyles).toContain(".admin-app-shell main textarea:focus-visible");
  });

  it("exposes disabled and loading state semantics from shared mobile primitives", () => {
    expect(mobilePrimitives).toContain("accessibilityState={{ disabled }}");
    expect(mobilePrimitives).toContain('accessibilityLiveRegion="polite"');
    expect(mobilePrimitives).toContain('accessibilityRole="progressbar"');
  });

  it("keeps the production worker brand mark decorative", () => {
    expect(productionWorker).toContain("accessibilityElementsHidden");
    expect(productionWorker).toContain('importantForAccessibility="no-hide-descendants"');
  });

  it("exposes the fixture worker navigation as selected tabs", () => {
    expect(fixtureWorker).toContain('accessibilityRole="tablist"');
    expect(fixtureWorker).toContain('accessibilityRole="tab"');
    expect(fixtureWorker).toContain("accessibilityState={{ selected: activeTabId === tab.id }}");
  });

  it("gives static web form controls an accessible name", () => {
    const unnamedControls = webAppRoots.flatMap((root) =>
      sourceFiles(root).flatMap((path) => {
        const source = readFileSync(path, "utf8");
        return [...source.matchAll(/<(input|select|textarea)\b[^>]*>/g)]
          .filter((match) => {
            const attributes = match[0];
            const index = match.index ?? 0;
            return (
              !hasWrappingLabel(source, index) &&
              !hasAssociatedLabel(source, attributes) &&
              !/\baria-label\s*=/.test(attributes) &&
              !/\baria-labelledby\s*=/.test(attributes)
            );
          })
          .map((match) => `${relative(process.cwd(), path)}: ${match[1]}`);
      })
    );

    expect(unnamedControls).toEqual([]);
  });
});
