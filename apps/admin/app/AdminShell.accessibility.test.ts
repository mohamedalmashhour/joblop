import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const shell = readFileSync(new URL("./AdminShell.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("./globals.css", import.meta.url), "utf8");

describe("admin shell accessibility", () => {
  it("moves the keyboard bypass target onto the existing main landmark", () => {
    const legacyWrapperTarget = ["<div", 'id="admin-main-content"'].join(" ");

    expect(shell).toContain('href="#admin-main-content"');
    expect(shell).toContain('querySelector("main")');
    expect(shell).toContain('main.id = "admin-main-content"');
    expect(shell).toContain("main.tabIndex = -1");
    expect(shell).not.toContain(legacyWrapperTarget);
    expect(styles).toContain(".admin-app-shell main");
    expect(styles).toContain(":focus-visible");
  });
});
