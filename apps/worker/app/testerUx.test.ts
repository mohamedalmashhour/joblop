import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { ar, en, fr } from "./i18n/messages";
import { HERO_VIDEO, HOW_IT_WORKS_VIDEO, videoForLocale } from "./landingVideos";
import { outsideApplyUrl, outsideSiteName } from "./jobSource";
import { ariaCurrent, isActivePath } from "./navActive";
import { nearestDayWithJobs } from "./calendarDays";
import { accountHref, revealFormStart } from "./authScroll";

// Fixes from the outside tester's visit to joblop.com.
const src = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

describe("1-2. sign-up opens at the start of the form, below the sticky header", () => {
  it("scrolls the form's top under the header and focuses its first field without a second scroll", () => {
    const calls: string[] = [];
    const focus = vi.fn();
    revealFormStart({
      scrollIntoView: (o) => calls.push(`scroll:${o?.block}`),
      querySelector: () => ({ focus })
    });
    expect(calls).toEqual(["scroll:start"]);
    expect(focus).toHaveBeenCalledWith({ preventScroll: true });
    expect(() => revealFormStart(null)).not.toThrow();
  });

  it("header links open the right tab from any page", () => {
    expect(accountHref("signup")).toBe("/?tab=signup#auth-card");
    expect(accountHref("signin")).toBe("/?tab=signin#auth-card");
    const header = src("./SiteHeader.tsx");
    expect(header).toContain('accountHref("signup")');
    expect(header).not.toContain('href="/#auth-card"');
  });

  it("the landing no longer centres the card (which hid its top under the header)", () => {
    const landing = src("./LandingPanel.tsx");
    expect(landing).not.toContain('block: "center"');
    expect(landing).toContain("revealFormStart(cardRef.current");
  });

  it("CSS keeps anchors, the form and its fields below the header", () => {
    const css = src("./globals.css");
    expect(css).toContain("--header-h: 60px");
    expect(css).toContain("scroll-padding-top: calc(var(--header-h) + 12px)");
    expect(css).toMatch(/\.auth-form input[^{]*\{ scroll-margin-top: calc\(var\(--header-h\) \+ 12px\)/);
    expect(src("./VerifyEmail.tsx")).toContain("verify-message");
  });
});

describe("3. jobs calendar shows which days have jobs", () => {
  it("finds the nearest day with jobs (later day wins a tie)", () => {
    const days = ["2026-11-03", "2026-11-12", "2026-12-01"];
    expect(nearestDayWithJobs(days, "2026-11-10")).toBe("2026-11-12");
    expect(nearestDayWithJobs(days, "2026-11-01")).toBe("2026-11-03");
    expect(nearestDayWithJobs(["2026-11-08", "2026-11-12"], "2026-11-10")).toBe("2026-11-12");
    expect(nearestDayWithJobs(days, "2026-12-20")).toBe("2026-12-01");
    expect(nearestDayWithJobs([], "2026-11-10")).toBeNull();
    expect(nearestDayWithJobs(["2026-11-10"], "2026-11-10")).toBeNull();
  });

  it("marks days with a gold dot and offers the nearest day on an empty day", () => {
    const cal = src("./PublicJobsCalendar.tsx");
    expect(cal).toContain('className="pcal-dot"');
    expect(cal).toContain('tr("cal.noJobsDay")');
    expect(cal).toContain('tr("cal.nearestDay"');
    const mine = src("./jobs-calendar/JobsCalendar.tsx");
    expect(mine).toContain("nearestDayWithJobs(jobDays, selected)");
  });
});

describe("4. Joblop jobs vs outside sites", () => {
  it("names the outside site and only links to web addresses", () => {
    expect(outsideSiteName("adzuna", "https://www.adzuna.ca/x")).toBe("Adzuna");
    expect(outsideSiteName("talent", null)).toBe("Talent.com");
    expect(outsideSiteName("other", "https://www.jobs.example.com/1")).toBe("jobs.example.com");
    expect(outsideSiteName(null, null)).toBeNull();
    expect(outsideApplyUrl("javascript:alert(1)")).toBeNull();
    expect(outsideApplyUrl("https://example.com/a")).toBe("https://example.com/a");
  });

  it("badges every list, the map, the calendars and the job pages", () => {
    for (const file of ["./PublicJobSearch.tsx", "./PublicJobsCalendar.tsx", "./MarketplaceExplorer.tsx", "./browse/PublicJobBoard.tsx", "./job/[jobCode]/PublicJobDetail.tsx", "./jobs/[jobRequestId]/JobDetail.tsx", "./jobs-calendar/JobsCalendar.tsx"]) {
      expect(src(file), file).toContain("<JoblopJobBadge");
    }
    for (const file of ["./PublicJobSearch.tsx", "./browse/PublicJobBoard.tsx", "./job-scanner/JobScannerFeed.tsx"]) {
      expect(src(file), file).toContain("<OutsideSiteBadge");
      expect(src(file), file).toContain("<OutsideApplyLink");
    }
    expect(src("./MarketplaceExplorer.tsx")).toContain('t("src.mapAllJoblop")');
    const link = src("./JobSourceBadge.tsx");
    expect(link).toContain('target="_blank"');
    expect(link).toContain('rel="noopener noreferrer"');
    expect(src("./browse/PublicJobBoard.tsx")).not.toContain("t.leadsApply}");
  });
});

describe("5. current page in the menu", () => {
  it("matches the current page only", () => {
    expect(isActivePath("/cv-builder", "/cv-builder")).toBe(true);
    expect(isActivePath("/jobs/abc", "/jobs")).toBe(true);
    expect(isActivePath("/jobs-calendar", "/jobs")).toBe(false);
    expect(isActivePath("/browse", "/")).toBe(false);
    expect(isActivePath("/", "/")).toBe(true);
    expect(isActivePath("/browse", "/browse#contact")).toBe(false);
    expect(isActivePath("/x", "https://employer.example.com")).toBe(false);
    expect(ariaCurrent("/pay", "/pay")).toBe("page");
    expect(ariaCurrent("/pay", "/offers")).toBeUndefined();
  });

  it("the header sets aria-current and the CSS styles it", () => {
    expect(src("./SiteHeader.tsx")).toContain("aria-current={ariaCurrent(pathname, href)}");
    expect(src("./globals.css")).toContain('.topbar-nav > a[aria-current="page"]');
  });
});

describe("6. landing videos follow the chosen language", () => {
  it("never shows the French clip in English or Arabic", () => {
    expect(videoForLocale(HERO_VIDEO, "fr-CA")?.src).toBe("/media/workers-ready.mp4");
    expect(videoForLocale(HERO_VIDEO, "en-CA")).toBeNull();
    expect(videoForLocale(HERO_VIDEO, "ar")).toBeNull();
    for (const locale of ["en-CA", "fr-CA", "ar"]) {
      expect(videoForLocale(HOW_IT_WORKS_VIDEO, locale)?.src).toBe("/media/how-joblop-works.mp4");
    }
    expect(src("./LandingPanel.tsx")).not.toContain('"/media/workers-ready.mp4"');
  });
});

describe("new words in EN/FR/AR", () => {
  it("every new key is written in all three languages", () => {
    const keys = [
      "src.joblopBadge", "src.applyHere", "src.outsideBadge", "src.applyOn", "src.theirSite", "src.newTab", "src.mapAllJoblop",
      "cal.legendJobs", "cal.noJobsDay", "cal.nearestDay", "cal.noJobsSoon"
    ] as const;
    for (const dict of [en, fr, ar]) for (const key of keys) expect(dict[key], key).toBeTruthy();
    expect(en["src.applyOn"]).toContain("{site}");
    expect(fr["src.applyOn"]).toContain("{site}");
    expect(ar["src.applyOn"]).toContain("{site}");
    expect(en["cal.nearestDay"]).toContain("{day}");
  });
});
