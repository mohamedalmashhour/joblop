import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { SIGNED_OUT_SECTIONS } from "@rwos/shared";

// The owner's signed-out order on the worker website's front page: the logo and hero, "How Joblop
// works", the open-jobs calendar, JobScanner (search + demo), then "Create your free account" / "Sign in".
const read = (file: string) => readFileSync(fileURLToPath(new URL(file, import.meta.url)), "utf8");
const landing = read("./LandingPanel.tsx");
const calendar = read("./PublicJobsCalendar.tsx");

/** The data-section names in the order they appear, with the calendar component expanded in place. */
function renderedOrder(): string[] {
  const expanded = landing.replace("<PublicJobsCalendar", 'data-section="calendar" <PublicJobsCalendar');
  return [...expanded.matchAll(/data-section="([a-z]+)"/g)].map((m) => m[1]!);
}

describe("signed-out front page order (website)", () => {
  it("follows SIGNED_OUT_SECTIONS exactly, with nothing repeated", () => {
    expect(renderedOrder()).toEqual([...SIGNED_OUT_SECTIONS]);
    expect(calendar).toContain('data-section="calendar"');
  });

  it("the JobScanner section holds the search and the JobScanner demo; sign-up is one tap from the hero", () => {
    const scanner = landing.slice(landing.indexOf('data-section="jobscanner"'), landing.indexOf('data-section="signup"'));
    expect(scanner).toContain("<PublicJobSearch");
    expect(scanner).toContain("<HowItWorksMovie");
    const hero = landing.slice(landing.indexOf('data-section="landing"'), landing.indexOf('data-section="howitworks"'));
    expect(hero).toContain('openAccount("signup")');
    expect(hero).toContain('openAccount("signin")');
    expect(landing.slice(landing.indexOf('data-section="signup"'))).toContain("<AuthCard");
  });

  it("the calendar opens the public job page and shows no address or employer", () => {
    expect(calendar).toContain("publicJobPath(job.jobCode)");
    expect(calendar).toContain("/api/public/jobs/calendar");
    expect(calendar).not.toMatch(/employerName|addressLine|postalCode/);
    expect(calendar).toContain("t.empty");
  });

  it("the home page no longer renders the demo twice for signed-out visitors", () => {
    expect(read("./page.tsx")).not.toContain("HowItWorksMovie");
  });
});
