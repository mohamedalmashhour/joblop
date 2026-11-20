import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { ar, en, fr } from "./i18n/messages";
import { FIND_WORK_PATH, cleanFilter, findWorkHref, parseFindWorkTab } from "./findWorkUrl";
import { mapLayout } from "./find-work/mapLayout";
import { resolveKnownPlace } from "@rwos/shared";

// The owner-approved simple design: a stranger understands the service and knows where to click
// within seconds. One question and one search on the home page, three steps, a trust row and a small
// employer link; the jobs live on one Find work page (List / Map / Calendar).
const read = (file: string) => readFileSync(fileURLToPath(new URL(file, import.meta.url)), "utf8");
const landing = read("./LandingPanel.tsx");
const findWork = read("./find-work/FindWork.tsx");
const header = read("./SiteHeader.tsx");

describe("signed-out home page (simple design)", () => {
  it("shows only hero + search, three steps, the trust row and the employer link, in that order", () => {
    const order = [...landing.matchAll(/data-section="([a-z]+)"/g)].map((m) => m[1]);
    expect(order).toEqual(["hero", "howitworks", "trust", "employer"]);
    expect(landing).toContain('t("home.title")');
    expect(landing).toContain('t("home.show")');
    expect(landing).toContain("findWorkHref({ q, city })");
    expect(landing).toContain('t("home.empLink")');
    for (const n of [1, 2, 3]) expect(landing).toContain(`t("home.s${n}")`);
  });

  it("no longer stacks the competing sections (calendar, JobScanner, videos, value cards)", () => {
    for (const gone of ["<PublicJobsCalendar", "<PublicJobSearch", "<HowItWorksMovie", "<VideoCard", "landing-values"]) {
      expect(landing, gone).not.toContain(gone);
    }
  });

  it("the sign-up card only appears when asked for, and returns to the job afterwards", () => {
    expect(landing).toContain("if (accountOpen)");
    expect(landing).toContain("<AuthCard");
    expect(landing).toContain("remember(next)");
    expect(read("./MarketplaceExplorer.tsx")).toContain("readAndClearNext()");
  });

  it("the videos moved to How it works, still language-correct", () => {
    expect(read("./how-it-works/page.tsx")).toContain("<HowItWorksVideos");
    expect(read("./how-it-works/HowItWorksVideos.tsx")).toContain("videoForLocale(HOW_IT_WORKS_VIDEO, locale)");
  });
});

describe("short menu", () => {
  it("signed out: Home · Find work · Sign in, with the language switcher", () => {
    const signedOut = header.slice(header.indexOf("Signed out: just Home"));
    expect(signedOut).toContain('link("/", t("nav.home"))');
    expect(signedOut).toContain('link(FIND_WORK_PATH, t("nav.findWork"))');
    expect(signedOut).toContain('t("nav.signIn")');
    expect(header).toContain("<LanguageSwitcher />");
    expect(header).not.toContain('"Create account")');
  });

  it("the other pages are in the footer", () => {
    const footer = read("./Footer.tsx");
    for (const href of ["/how-it-works", "/about", "/cv-builder", "/about#contact"]) expect(footer).toContain(`href="${href}"`);
  });
});

describe("one Find work page", () => {
  it("list, map and calendar are tabs that share the same filters", () => {
    expect(findWork).toContain('role="tablist"');
    expect(findWork).toContain("<ListTab");
    expect(findWork).toContain("<MapTab");
    expect(findWork).toContain("<PublicJobsCalendar matches={calendarMatches}");
    expect(parseFindWorkTab("map")).toBe("map");
    expect(parseFindWorkTab("nope")).toBe("list");
    expect(findWorkHref({ tab: "calendar", q: " cook ", city: "Laval" })).toBe("/find-work?tab=calendar&q=cook&city=Laval");
    expect(findWorkHref({ tab: "list" })).toBe(FIND_WORK_PATH);
    expect(cleanFilter("x".repeat(100))).toHaveLength(80);
  });

  it("Joblop jobs come first, then jobs on other websites", () => {
    const joblop = findWork.indexOf('t("fw.secJoblop")');
    const other = findWork.indexOf('t("fw.secOther")');
    expect(joblop).toBeGreaterThan(0);
    expect(other).toBeGreaterThan(joblop);
    expect(findWork).toContain("/api/public/jobscanner/leads");
    expect(findWork).toContain("<OutsideApplyLink");
  });

  it("Apply on a Joblop job opens sign-up for a visitor and comes back to the job", () => {
    expect(findWork).toContain("signedIn ? publicJobPath(job.jobCode) : signUpReturningTo(publicJobPath(job.jobCode))");
  });

  it("the map puts one dot per city with jobs, and counts the rest", () => {
    const layout = mapLayout(
      [
        { jobCode: "A", city: "Laval" },
        { jobCode: "B", city: "Laval" },
        { jobCode: "C", city: "Montréal" },
        { jobCode: "D", city: "Nowhere" }
      ],
      resolveKnownPlace("Laval")
    );
    expect(layout.pins.map((p) => [p.place, p.count])).toEqual([["Laval", 2], ["Montréal", 1]]);
    expect(layout.offMap).toBe(1);
    expect(layout.placeOf.get("C")).toBe("Montréal");
    expect(layout.origin.latitude).toBeCloseTo(45.6066);
    expect(layout.radiusKm).toBeGreaterThanOrEqual(10);
  });

  it("old pages go to the right tab", () => {
    expect(read("./browse/page.tsx")).toContain('redirect(findWorkHref({ tab: "list"');
    expect(read("./job-scanner/page.tsx")).toContain('redirect(findWorkHref({ tab: "list"');
    expect(read("./jobs-calendar/page.tsx")).toContain('redirect(findWorkHref({ tab: "calendar" }))');
    expect(read("./about/page.tsx")).toContain("<PublicJobBoard />");
  });
});

describe("new words in EN / FR / AR", () => {
  const keys = [
    "nav.home", "nav.findWork", "nav.signIn",
    "home.title", "home.sub", "home.whatPh", "home.cityPh", "home.show", "home.how",
    "home.s1", "home.s1d", "home.s2", "home.s2d", "home.s3", "home.s3d", "home.t1", "home.t2", "home.t3",
    "home.emp", "home.empLink", "home.accountSub",
    "fw.title", "fw.sub", "fw.tabList", "fw.tabMap", "fw.tabCal", "fw.search", "fw.secJoblop", "fw.secJoblopSub",
    "fw.secOther", "fw.secOtherSub", "fw.apply", "fw.payOnSite", "fw.newTabNote", "fw.noneJoblop", "fw.noneOther",
    "fw.mapNote", "fw.mapOffMap", "fw.mapEmpty", "fw.mapPick",
    "foot.howItWorks", "foot.about", "foot.cv", "foot.employers", "foot.contact"
  ] as const;

  it("every key exists in all three languages", () => {
    for (const dict of [en, fr, ar]) for (const key of keys) expect(dict[key], key).toBeTruthy();
  });

  it("uses the mockup's words", () => {
    expect(en["home.title"]).toBe("Find paid work near you, this week.");
    expect(en["home.sub"]).toBe("Short shifts and steady jobs in Québec. Free for workers.");
    expect(en["home.show"]).toBe("Show jobs");
    expect(en["home.empLink"]).toBe("Hire on Joblop →");
    expect(ar["home.title"]).toBe("اعثر على عمل مدفوع قريب منك هذا الأسبوع.");
    expect(ar["home.show"]).toBe("اعرض الوظائف");
    expect(ar["fw.secOther"]).toBe("وظائف على مواقع أخرى");
    expect(fr["home.title"]).toBe("Trouvez du travail payé près de chez vous, cette semaine.");
    expect(fr["home.show"]).toBe("Voir les emplois");
  });

  it("the French and Arabic words are really translated", () => {
    for (const key of ["home.title", "home.show", "fw.secJoblop", "fw.apply", "nav.findWork"] as const) {
      expect(fr[key], key).not.toBe(en[key]);
      expect(ar[key], key).not.toBe(en[key]);
    }
  });
});
