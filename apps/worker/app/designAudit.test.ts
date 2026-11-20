import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { dictionaries } from "./i18n/messages";

const read = (path: string) => readFileSync(join(__dirname, path), "utf8");

describe("worker design-audit fixes", () => {
  it("sends /signin to the sign-in tab of the home page card instead of a 404", () => {
    expect(read("signin/page.tsx")).toContain('redirect("/?tab=signin#auth-card")');
    expect(read("LandingPanel.tsx")).toContain('tabParam === "signin"');
  });

  it("keeps black text on gold buttons on /browse (anchors no longer override the button colour)", () => {
    const board = read("browse/PublicJobBoard.tsx");
    expect(board).toContain(":where(.jl) a{color:inherit;text-decoration:none;}");
    expect(board).not.toContain(".jl a{color:inherit");
    expect(board).not.toContain("linear-gradient(90deg,#f8b808,#f0d9a0)");
  });

  it("lines the JobScanner, live-leads and alert boxes up with the page column", () => {
    const board = read("browse/PublicJobBoard.tsx");
    expect(board).toContain("--jl-col-gutter:max(18px,calc((100% - 1084px) / 2));");
    expect(board).not.toContain("margin-left:max(18px,env(safe-area-inset-left));margin-right:max(18px,env(safe-area-inset-right));");
  });

  it("shows readable, translated CV builder text", () => {
    const intro = read("cv-builder/CvPageIntro.tsx");
    expect(intro).not.toContain("#15110b");
    for (const locale of ["en-CA", "fr-CA", "ar"] as const) {
      expect(dictionaries[locale]["cv.pageTitle"]).toBeTruthy();
      expect(dictionaries[locale]["cv.back"]).toBeTruthy();
      expect(dictionaries[locale]["nav.backHome"]).toBeTruthy();
    }
    expect(read("cv-builder/page.tsx")).not.toContain("✕");
  });
});
