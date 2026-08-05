import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const shellSource = readFileSync(new URL("./EmployerShell.tsx", import.meta.url), "utf8");
const globalStyles = readFileSync(new URL("../globals.css", import.meta.url), "utf8");

describe("employer shell accessibility", () => {
  it("provides a keyboard bypass to a focusable main landmark", () => {
    expect(shellSource).toContain('href="#employer-main-content"');
    expect(shellSource).toContain('id="employer-main-content"');
    expect(shellSource).toContain("tabIndex={-1}");
  });

  it("keeps keyboard focus visible across employer controls", () => {
    expect(globalStyles).toContain(".employer-skip-link:focus");
    expect(globalStyles).toContain(":focus-visible");
    expect(globalStyles).toContain("outline: 3px solid #ffd44a");
  });

  it("keeps footer links large enough for touch interaction", () => {
    const styleSource = readFileSync(new URL("./employerStyles.ts", import.meta.url), "utf8");

    expect(styleSource).toContain('display: "inline-flex"');
    expect(styleSource).toContain("minHeight: 44");
    expect(globalStyles).toContain("header > a");
    expect(globalStyles).toContain("header nav a");
    expect(globalStyles).toContain("footer > a");
    expect(globalStyles).toContain("footer nav a");
  });

  it("uses a single workflow-navigation column on narrow screens", () => {
    expect(globalStyles).toMatch(
      /\.employer-navigation\s*\{[^}]*grid-template-columns: minmax\(0, 1fr\)/s
    );
  });

  it("provides numbered previous and next navigation across employer workflow pages", () => {
    expect(shellSource).toContain('aria-label="Employer workflow page navigation"');
    expect(shellSource).toContain("aria-label={`Previous page: ${previous.title}`}");
    expect(shellSource).toContain("aria-label={`Next page: ${next.title}`}");
    expect(shellSource).toContain("aria-label={`Page ${index + 1}: ${step.title}`}");
    expect(shellSource).toContain('aria-current={active ? "page" : undefined}');
    expect(shellSource).toContain('rel="prev"');
    expect(shellSource).toContain('rel="next"');
    expect(globalStyles).toContain("min-height: 44px");
    expect(globalStyles).toContain(".employer-page-list");
  });

  it("deduplicates logical handoffs that share one implemented route", () => {
    expect(shellSource).toContain("deduplicateNavigationByRoute");
    expect(shellSource).toContain("uniqueEmployerNavigation");
    expect(shellSource).toContain("unique.set(step.route, step)");
  });

  it("keeps one continuous local journey while connected environments stay route-restricted", () => {
    expect(shellSource).toContain(
      "const navigation = connectedEnvironment ? persistedEmployerNavigation : uniqueEmployerNavigation"
    );
    expect(shellSource).toContain("const connectedEnvironment = production || staging");
  });

  it("shows permanent safety labels in the staging employer workspace", () => {
    expect(shellSource).toContain('process.env.RWOS_ENV === "staging"');
    expect(shellSource).toContain("STAGING");
    expect(shellSource).toContain("SYNTHETIC DATA");
    expect(shellSource).toContain("NO REAL PAYMENT");
    expect(shellSource).toContain("NO PRODUCTION CUSTOMER DATA");
    expect(shellSource).toContain('aria-label="Staging safety status"');
  });
});
