import { describe, expect, it } from "vitest";
import { authStyles } from "./authStyles";
import { ar } from "./i18n/messages";

describe("staff sign-in look (design audit S-2, S-4, S-6)", () => {
  it("uses black text on the gold 'Text me a code' button", () => {
    expect(authStyles.primaryButton?.color).toBe("#000000");
  });

  it("leaves at least 6px between a label and its field", () => {
    expect(Number(authStyles.fieldLabel?.gap)).toBeGreaterThanOrEqual(6);
  });

  it("has no stray hyphens in the Arabic secure-area line", () => {
    expect(ar["shell.sessionContext"]).not.toMatch(/-\S|\S-/);
  });
});
