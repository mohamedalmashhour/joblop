import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { SIGNED_OUT_SECTIONS } from "@rwos/shared";
import { translate } from "../../i18n/strings";
import { HOW_IT_WORKS_STEP_MS, SIGNED_OUT_SECTION_TEST_IDS, nextDemoStage, nextHowItWorksStep } from "./publicLandingContent";

// The owner's order for a signed-out person opening the app, the same as the website's front page:
// the Joblop logo and hero, "How Joblop works", the open-jobs calendar, JobScanner, then sign-up.
const read = (path: string) => readFileSync(join(__dirname, path), "utf8");
const screen = read("PublicJobsScreen.tsx");
const children: Record<string, string> = {
  "<PublicHowItWorks": read("PublicHowItWorks.tsx"),
  "<PublicJobsCalendar": read("PublicJobsCalendar.tsx")
};

/** The section testIDs in the order the screen draws them, with the child components expanded in place. */
function drawnOrder(): string[] {
  let expanded = screen;
  for (const [tag, source] of Object.entries(children)) {
    const id = /testID="(public-section-[a-z]+)"/.exec(source)?.[1];
    expanded = expanded.replace(tag, `testID="${id}" ${tag}`);
  }
  return [...expanded.matchAll(/testID="(public-section-[a-z]+)"/g)].map((m) => m[1]!);
}

describe("signed-out first screen order (app)", () => {
  it("draws SIGNED_OUT_SECTIONS top to bottom, once each", () => {
    expect(SIGNED_OUT_SECTION_TEST_IDS).toEqual(SIGNED_OUT_SECTIONS.map((s) => `public-section-${s}`));
    expect(drawnOrder()).toEqual([...SIGNED_OUT_SECTION_TEST_IDS]);
  });

  it("starts with the Joblop logo, then the How Joblop works animation", () => {
    const landing = screen.slice(screen.indexOf('testID="public-section-landing"'), screen.indexOf("<PublicHowItWorks"));
    expect(landing).toContain("source={joblopLogo}");
    expect(screen).toContain('from "../../../assets/joblop-logo.png"');
  });

  it("the animation never delays the calendar: it fetches nothing and the calendar loads by itself", () => {
    const how = children["<PublicHowItWorks"]!;
    expect(how).not.toMatch(/transport|fetch\(/);
    expect(how).toContain("Animated");
    expect(how).toContain("copy.pause");
    expect(how).toContain("copy.replay");
    expect(children["<PublicJobsCalendar"]).toContain("listPublicCalendarJobs(");
    // No video package was added (no new store build needed).
    const pkg = readFileSync(join(__dirname, "../../../package.json"), "utf8");
    expect(pkg).not.toMatch(/expo-av|expo-video|react-native-video/);
  });

  it("the JobScanner section holds the search and the demo; sign-up is one tap away at the top and bottom", () => {
    const scanner = screen.slice(screen.indexOf('testID="public-section-jobscanner"'), screen.indexOf('testID="public-section-signup"'));
    expect(scanner).toContain("public-jobs-search");
    expect(scanner).toContain("<JobScannerDemo");
    expect(screen.slice(screen.indexOf('testID="public-section-landing"'), screen.indexOf("<PublicHowItWorks"))).toContain("onCreateAccount");
    expect(screen.slice(screen.indexOf('testID="public-section-signup"'))).toContain("onCreateAccount");
  });

  it("the calendar shows the empty line and never an address or employer", () => {
    const calendar = children["<PublicJobsCalendar"]!;
    expect(calendar).toContain("t.empty");
    expect(calendar).not.toMatch(/employerName|addressLine|postalCode/);
  });

  it("the navigator opens a signed-out person on this screen", () => {
    const nav = readFileSync(join(__dirname, "../../navigation/WorkerNavigator.tsx"), "utf8");
    const guest = nav.slice(nav.indexOf("if (!authenticated) {"));
    expect(guest).toContain("<PublicJobsScreen");
  });

  it("the steps use the website's words in EN / FR / AR", () => {
    const web = readFileSync(join(__dirname, "../../../../worker/app/i18n/messages.ts"), "utf8");
    for (const n of [1, 2, 3, 4]) {
      for (const key of [`land.step${n}Title`, `land.step${n}Body`]) {
        for (const locale of ["en", "fr", "ar"] as const) expect(web, `${locale} ${key}`).toContain(JSON.stringify(translate(locale, key)).slice(1, -1));
      }
    }
  });

  it("the animations loop", () => {
    expect(nextHowItWorksStep(3, 4)).toBe(0);
    expect(nextHowItWorksStep(1, 4)).toBe(2);
    expect(nextDemoStage(3)).toBe(0);
    expect(HOW_IT_WORKS_STEP_MS).toBeGreaterThan(1000);
  });
});
