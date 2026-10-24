import { describe, expect, it } from "vitest";
import {
  dedupeLeads,
  fuzzyLeadKey,
  haversineKm,
  normalizeAdzunaJob,
  normalizeAdzunaJobs,
  rankLeadsForWorker,
  type AdzunaRawJob,
  type ExternalJobLead
} from "./jobScanner";

const rawPSW: AdzunaRawJob = {
  id: 100,
  title: "Personal Support Worker",
  company: { display_name: "Acme Care" },
  location: { display_name: "Laval, Québec", area: ["Canada", "Québec", "Laval"] },
  latitude: 45.57,
  longitude: -73.69,
  salary_min: 40000,
  salary_max: 50000,
  created: "2026-10-20T12:00:00Z",
  redirect_url: "https://www.adzuna.ca/jobs/100",
  contract_time: "full_time",
  category: { label: "Healthcare & Nursing Jobs" },
  description: "Provide care to residents."
};

describe("normalizeAdzunaJob", () => {
  it("maps fields, derives city/province, converts salary to minor annual", () => {
    const lead = normalizeAdzunaJob(rawPSW)!;
    expect(lead).toMatchObject({
      source: "adzuna",
      sourceId: "100",
      title: "Personal Support Worker",
      employer: "Acme Care",
      city: "Laval",
      province: "QC",
      latitude: 45.57,
      longitude: -73.69,
      salaryMinMinor: 4000000,
      salaryMaxMinor: 5000000,
      salaryPeriod: "year",
      contractTime: "full_time",
      url: "https://www.adzuna.ca/jobs/100"
    });
  });
  it("returns null without an id, url, or title", () => {
    expect(normalizeAdzunaJob({ title: "x", redirect_url: "u" })).toBeNull();
    expect(normalizeAdzunaJob({ id: 1, title: "x" })).toBeNull();
    expect(normalizeAdzunaJob({ id: 1, redirect_url: "u" })).toBeNull();
  });
  it("tolerates missing salary/company/area", () => {
    const lead = normalizeAdzunaJob({ id: 2, title: "Cleaner", redirect_url: "u" })!;
    expect(lead.employer).toBeNull();
    expect(lead.province).toBeNull();
    expect(lead.salaryPeriod).toBeNull();
  });
});

describe("dedupeLeads", () => {
  it("drops exact (source,sourceId) duplicates and cross-source fuzzy duplicates", () => {
    const a = normalizeAdzunaJob(rawPSW)!;
    const aDup = normalizeAdzunaJob(rawPSW)!; // same id → exact dup
    const talentSame: ExternalJobLead = { ...a, source: "talent", sourceId: "T-9", url: "https://talent.com/9" };
    const different: ExternalJobLead = { ...a, sourceId: "101", title: "Registered Nurse" };
    const out = dedupeLeads([a, aDup, talentSame, different]);
    // a and aDup collapse; talentSame has same title+employer+city as a → fuzzy dup; different stays.
    expect(out.map((l) => l.title).sort()).toEqual(["Personal Support Worker", "Registered Nurse"]);
  });
  it("fuzzy key ignores case, accents and punctuation", () => {
    const base = normalizeAdzunaJob(rawPSW)!;
    const accented: ExternalJobLead = { ...base, title: "PERSONAL  support-worker", employer: "acme care" };
    expect(fuzzyLeadKey(base)).toBe(fuzzyLeadKey(accented));
  });
});

describe("haversineKm", () => {
  it("computes a sane distance (Montréal↔Laval ≈ a few km)", () => {
    const d = haversineKm(45.50, -73.57, 45.57, -73.69);
    expect(d).toBeGreaterThan(5);
    expect(d).toBeLessThan(20);
  });
});

describe("rankLeadsForWorker", () => {
  const near = normalizeAdzunaJob(rawPSW)!; // Laval, PSW
  const far = normalizeAdzunaJob({
    ...rawPSW,
    id: 200,
    title: "Personal Support Worker",
    location: { display_name: "Québec City, Québec", area: ["Canada", "Québec", "Québec City"] },
    latitude: 46.81,
    longitude: -71.21,
    redirect_url: "https://www.adzuna.ca/jobs/200"
  })!;
  const offRole = normalizeAdzunaJob({ ...rawPSW, id: 300, title: "Software Developer", redirect_url: "https://www.adzuna.ca/jobs/300" })!;

  it("ranks on-role, nearby jobs highest and drops out-of-range ones", () => {
    const ranked = rankLeadsForWorker([far, offRole, near], {
      roleKeywords: ["personal support worker", "psw", "care"],
      latitude: 45.50,
      longitude: -73.57,
      maxDistanceKm: 50
    });
    // far (Québec City, ~230km) is beyond 50km → dropped. near ranks above offRole (title match).
    expect(ranked.map((l) => l.sourceId)).toEqual(["100", "300"]);
    expect(ranked[0]!.titleMatch).toBeGreaterThan(ranked[1]!.titleMatch);
  });
  it("applies the salary floor", () => {
    const ranked = rankLeadsForWorker([near], {
      roleKeywords: ["care"],
      minSalaryMinorPerYear: 6000000 // $60k floor; near maxes at $50k → dropped
    });
    expect(ranked).toHaveLength(0);
  });
  it("gives unknown-distance leads a neutral closeness instead of dropping them", () => {
    const noCoords: ExternalJobLead = { ...near, latitude: null, longitude: null };
    const ranked = rankLeadsForWorker([noCoords], { roleKeywords: ["personal support worker"] });
    expect(ranked).toHaveLength(1);
    expect(ranked[0]!.distanceKm).toBeNull();
  });
});

describe("normalizeAdzunaJobs", () => {
  it("skips invalid entries", () => {
    const leads = normalizeAdzunaJobs([rawPSW, { title: "no id" }, { id: 5, title: "ok", redirect_url: "u" }]);
    expect(leads).toHaveLength(2);
  });
});
