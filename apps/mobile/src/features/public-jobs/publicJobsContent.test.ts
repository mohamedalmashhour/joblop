import { describe, expect, it } from "vitest";
import {
  DEFAULT_EMPLOYER_ORIGIN,
  brandParts,
  columnsForWidth,
  countLabel,
  employerOrigin,
  formatJobDate,
  formatLeadPay,
  isAdzunaLead,
  isUrgentJob,
  leadSubline
} from "./publicJobsContent";

describe("public job search helpers", () => {
  it("formats lead pay: hourly under $200 or when the period is hour, yearly otherwise", () => {
    expect(formatLeadPay({ salaryMinMinor: null, salaryMaxMinor: null, salaryPeriod: null })).toBeNull();
    expect(formatLeadPay({ salaryMinMinor: 1800, salaryMaxMinor: null, salaryPeriod: null })).toBe("$18/h");
    expect(formatLeadPay({ salaryMinMinor: 1800, salaryMaxMinor: 2150, salaryPeriod: null })).toBe("$21.50/h");
    expect(formatLeadPay({ salaryMinMinor: null, salaryMaxMinor: 5500000, salaryPeriod: "year" })).toBe("$55k/yr");
    expect(formatLeadPay({ salaryMinMinor: null, salaryMaxMinor: 25000, salaryPeriod: "hour" })).toBe("$250/h");
  });

  it("tags urgent and immediate jobs, not normal ones", () => {
    expect(isUrgentJob("normal")).toBe(false);
    expect(isUrgentJob("standard")).toBe(false);
    expect(isUrgentJob("urgent")).toBe(true);
    expect(isUrgentJob("immediate")).toBe(true);
  });

  it("recognises Adzuna leads and builds the employer line", () => {
    expect(isAdzunaLead({ source: "adzuna" })).toBe(true);
    expect(isAdzunaLead({ source: "jobbank" })).toBe(false);
    expect(leadSubline({ employer: "Maple Diner", areaLabel: "Ottawa, ON" })).toBe("Maple Diner · Ottawa, ON");
    expect(leadSubline({ employer: "", areaLabel: "Ottawa, ON" })).toBe("Ottawa, ON");
  });

  it("fills count templates", () => {
    expect(countLabel(1, "1 job found", "{n} jobs found")).toBe("1 job found");
    expect(countLabel(12, "1 job found", "{n} jobs found")).toBe("12 jobs found");
  });

  it("reads the employer origin with a safe fallback", () => {
    expect(employerOrigin(undefined)).toBe(DEFAULT_EMPLOYER_ORIGIN);
    expect(employerOrigin("not a url")).toBe(DEFAULT_EMPLOYER_ORIGIN);
    expect(employerOrigin("http://insecure.example.com")).toBe(DEFAULT_EMPLOYER_ORIGIN);
    expect(employerOrigin("https://employer.joblop.ca/")).toBe("https://employer.joblop.ca");
  });

  it("formats a job date and stays empty for a bad date", () => {
    expect(formatJobDate("bad", "en")).toBe("");
    expect(formatJobDate("2026-11-20T13:00:00.000Z", "en").length).toBeGreaterThan(0);
  });

  it("splits sentences around the brand name for the gold-o styling", () => {
    expect(brandParts("Apply free — Joblop never takes a cut")).toEqual([
      { text: "Apply free — ", brand: false },
      { text: "Joblop", brand: true },
      { text: " never takes a cut", brand: false }
    ]);
    expect(brandParts("وظائف Joblop")).toEqual([
      { text: "وظائف ", brand: false },
      { text: "Joblop", brand: true }
    ]);
    expect(brandParts("No brand here")).toEqual([{ text: "No brand here", brand: false }]);
  });

  it("uses the website grid breakpoints for job-card columns", () => {
    expect(columnsForWidth(375)).toBe(1);
    expect(columnsForWidth(600)).toBe(2);
    expect(columnsForWidth(1200)).toBe(3);
  });
});
