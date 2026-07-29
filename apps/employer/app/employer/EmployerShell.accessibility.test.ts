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

  it("uses a single workflow-navigation column on narrow screens", () => {
    expect(globalStyles).toMatch(
      /\.employer-navigation\s*\{[^}]*grid-template-columns: minmax\(0, 1fr\)/s
    );
  });
});
