import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { groupLeads } from "./find-work/groupLeads";
import { appendUnique, nextCursorOf } from "./pagination";
import { blockedReasonKey } from "./jobs/[jobRequestId]/JobDetail";
import { dictionaries } from "./i18n/messages";

const read = (...path: string[]) => readFileSync(join(__dirname, ...path), "utf8");

describe("job page: why a job can't be taken", () => {
  it("maps the API's reasons to plain messages in EN/FR/AR", () => {
    expect(blockedReasonKey("job_started")).toBe("job.blockedStarted");
    expect(blockedReasonKey("below_minimum_wage")).toBe("job.blockedBelowWage");
    expect(blockedReasonKey("missing_certificate:whmis")).toBeNull();
    expect(blockedReasonKey(null)).toBeNull();
    for (const locale of ["en-CA", "fr-CA", "ar"] as const) {
      expect(dictionaries[locale]["job.blockedStarted"], locale).toBeTruthy();
      expect(dictionaries[locale]["job.blockedBelowWage"], locale).toBeTruthy();
    }
  });

  it("shows the reason instead of Accept or Express interest", () => {
    const page = read("jobs", "[jobRequestId]", "JobDetail.tsx");
    expect(page).toContain("{blockedReasonKey(job.claimBlockedReason) ? (");
    expect(page).toContain('t(blockedKey ?? "job.inelDefault")');
  });
});

describe("outside listings without a company are never merged", () => {
  const lead = (title: string, employer: string | null, areaLabel: string, url: string | null) => ({ title, employer, areaLabel, source: "x", url });

  it("keeps 'Cleaner' posts from unknown companies apart, but still groups a named company", () => {
    const groups = groupLeads([
      lead("Cleaner", null, "Laval, QC", "https://a.example/1"),
      lead("Cleaner", null, "Montréal, QC", "https://b.example/2"),
      lead("Cleaner", "", "Longueuil, QC", null),
      lead("Cook", "Bistro A", "Laval, QC", "https://c.example/3"),
      lead("Cook", "Bistro A", "Montréal, QC", "https://c.example/4")
    ]);
    expect(groups.map((g) => g.locations.length)).toEqual([1, 1, 1, 2]);
  });

  it("still collapses an exact repeat of the same posting", () => {
    const groups = groupLeads([lead("Cleaner", null, "Laval, QC", "https://a.example/1"), lead("Cleaner", null, "Laval, QC", "https://a.example/1")]);
    expect(groups).toHaveLength(1);
  });
});

describe("Load more", () => {
  it("reads the API's next-page cursor (offset number or record id)", () => {
    expect(nextCursorOf({ nextCursor: 30 })).toBe("30");
    expect(nextCursorOf({ nextCursor: "a1b2" })).toBe("a1b2");
    expect(nextCursorOf({ nextCursor: null })).toBeNull();
    expect(nextCursorOf(null)).toBeNull();
  });

  it("adds a page after the shown items without repeating any", () => {
    const shown = [{ id: "1" }, { id: "2" }];
    expect(appendUnique(shown, [{ id: "2" }, { id: "3" }], (x) => x.id).map((x) => x.id)).toEqual(["1", "2", "3"]);
  });

  it("is wired on Find work (30), the public board (24) and My schedule (25)", () => {
    const findWork = read("find-work", "FindWork.tsx");
    expect(findWork).toContain('new URLSearchParams({ limit: "30", cursor: jobsCursor })');
    expect(findWork).toContain('t("common.loadMore")');
    const board = read("browse", "PublicJobBoard.tsx");
    expect(board).toContain('params.set("cursor", jobsCursor);');
    expect(board).toContain('tm("common.loadMore")');
    const schedule = read("schedule", "MySchedule.tsx");
    expect(schedule).toContain("/api/attendance?limit=25&cursor=");
    expect(schedule).toContain('t("common.loadMore")');
  });
});
