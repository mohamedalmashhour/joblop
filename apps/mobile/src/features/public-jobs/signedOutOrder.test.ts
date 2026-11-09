import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { SIGNED_OUT_SECTIONS } from "@rwos/shared";
import { translate } from "../../i18n/strings";
import { WEB_COPY } from "../../i18n/webCopy";
import { LANDING_VIDEO_FILES, SIGNED_OUT_SECTION_TEST_IDS, isOnScreen, nextDemoStage, shouldVideoPlay } from "./publicLandingContent";

// The owner's order for a signed-out person opening the app, the same as the website's front page:
// the Joblop logo, hero and hero video, "How Joblop works" (real video, then the four steps), the
// open-jobs calendar, JobScanner, then sign-up.
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

  it("starts with the Joblop logo, the hero buttons and the hero video, then How Joblop works", () => {
    const landing = screen.slice(screen.indexOf('testID="public-section-landing"'), screen.indexOf("<PublicHowItWorks"));
    expect(landing).toContain("source={joblopLogo}");
    expect(screen).toContain('from "../../../assets/joblop-logo.png"');
    // Logo, then the account buttons, then the hero video, all before How Joblop works.
    const logo = landing.indexOf("source={joblopLogo}");
    const buttons = landing.indexOf("public-jobs-create-account");
    const video = landing.indexOf("<VideoCard");
    expect(logo).toBeGreaterThanOrEqual(0);
    expect(buttons).toBeGreaterThan(logo);
    expect(video).toBeGreaterThan(buttons);
    expect(landing).toContain("source={readyVideo}");
    expect(screen).toContain('from "../../../assets/media/workers-ready.mp4"');
  });

  it("How Joblop works shows the real video first, then the four steps; it never delays the calendar", () => {
    const how = children["<PublicHowItWorks"]!;
    expect(how).not.toMatch(/transport|fetch\(/);
    expect(how).toContain('from "../../../assets/media/how-joblop-works.mp4"');
    expect(how.indexOf("<VideoCard")).toBeGreaterThan(0);
    expect(how.indexOf("<VideoCard")).toBeLessThan(how.indexOf("steps.map("));
    expect(children["<PublicJobsCalendar"]).toContain("listPublicCalendarJobs(");
  });

  it("the videos are bundled in the app (no network) and played with expo-video", () => {
    const pkg = JSON.parse(readFileSync(join(__dirname, "../../../package.json"), "utf8")) as { dependencies: Record<string, string> };
    expect(pkg.dependencies["expo-video"]).toMatch(/^~57\./);
    const media = join(__dirname, "../../../assets/media");
    for (const files of Object.values(LANDING_VIDEO_FILES)) {
      for (const file of [files.video, files.poster]) {
        const bundled = readFileSync(join(media, file));
        const website = readFileSync(join(__dirname, "../../../../worker/public/media", file));
        expect(bundled.equals(website), file).toBe(true);
      }
    }
    const card = read("VideoCard.tsx");
    expect(card).toContain('from "expo-video"');
    expect(card).not.toMatch(/https?:\/\//);
    expect(card).toContain("p.loop = true");
    expect(card).toContain("p.muted = true");
    expect(card).toContain("isReduceMotionEnabled");
    expect(card).toContain("AppState");
    expect(card).toContain("nativeControls={false}");
    expect(card).toContain("fullscreenOptions={{ enable: false }}");
  });

  it("the video buttons use the website's words in EN / FR / AR", () => {
    for (const key of ["land.videoSoundOn", "land.videoSoundOff", "land.videoPlay", "land.videoReadyLabel", "land.videoHowLabel"]) {
      expect(WEB_COPY[key], key).toBeDefined();
      for (const locale of ["en", "fr", "ar"] as const) expect(translate(locale, key)).toBe(WEB_COPY[key]![locale]);
    }
  });

  it("a video plays only when wanted, on screen and in the foreground", () => {
    expect(shouldVideoPlay({ wantsPlay: true, onScreen: true, appActive: true })).toBe(true);
    expect(shouldVideoPlay({ wantsPlay: false, onScreen: true, appActive: true })).toBe(false);
    expect(shouldVideoPlay({ wantsPlay: true, onScreen: false, appActive: true })).toBe(false);
    expect(shouldVideoPlay({ wantsPlay: true, onScreen: true, appActive: false })).toBe(false);
    expect(isOnScreen(100, 400, 800)).toBe(true);
    expect(isOnScreen(-399, 400, 800)).toBe(true);
    expect(isOnScreen(-400, 400, 800)).toBe(false);
    expect(isOnScreen(800, 400, 800)).toBe(false);
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

  it("the JobScanner demo loops", () => {
    expect(nextDemoStage(3)).toBe(0);
    expect(nextDemoStage(1)).toBe(2);
  });
});
