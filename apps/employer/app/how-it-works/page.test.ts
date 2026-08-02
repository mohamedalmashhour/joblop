import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  aiAssistance,
  employerJourney,
  lifecyclePhases,
  trustLayer,
  workerJourney
} from "./howItWorksContent";

const pageSource = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");

describe("Page 003 how it works content", () => {
  it("keeps worker and employer journeys separate", () => {
    expect(workerJourney).toContain("Set availability");
    expect(workerJourney).toContain("See earnings records");
    expect(employerJourney).toContain("Approve timesheet");
    expect(employerJourney).toContain("Receive billing records");
  });

  it("organizes the lifecycle into before, during, and after shift phases", () => {
    expect(lifecyclePhases.map((phase) => phase.title)).toEqual([
      "Before the shift",
      "During the shift",
      "After the shift"
    ]);
  });

  it("separates worker, employer, and platform responsibilities in every phase", () => {
    for (const phase of lifecyclePhases) {
      expect(Object.keys(phase.responsibilities)).toEqual(["Employer", "Worker", "Platform"]);
      expect(phase.statuses.length).toBeGreaterThan(0);
    }
  });

  it("keeps AI advisory and excludes automatic operational authority", () => {
    expect(aiAssistance.join(" ")).toContain("AI cannot hire, assign, dispatch");
    expect(aiAssistance.join(" ")).toContain("approve timesheets");
  });

  it("preserves the public trust layer without country-specific claims", () => {
    const copy = [...aiAssistance, ...trustLayer, ...workerJourney, ...employerJourney].join(" ");
    expect(trustLayer).toContain("Attendance evidence");
    expect(copy).not.toMatch(/Canada|Syria|HIPAA|PIPEDA|guaranteed dispatch/i);
  });

  it("scopes responsibility heading ids to their lifecycle phase", () => {
    expect(pageSource).toContain('idPrefix={phase.title.toLowerCase().replaceAll(" ", "-")}');
    expect(pageSource).toContain("`${idPrefix}-${owner.toLowerCase()}-responsibilities`");
    expect(pageSource).not.toContain('aria-labelledby={`${owner}-responsibilities`}');
  });
});
