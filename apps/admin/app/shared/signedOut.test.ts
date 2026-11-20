import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { safeReturnPath, signInHref, signedOutText } from "./signedOutText";
import { parseRequestCards, parseRequestSummary } from "../calendar/requestSummary";

const appDir = new URL("..", import.meta.url).pathname;

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === "node_modules" ? [] : sources(path);
    return /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
  });
}

describe("shared signed-out block", () => {
  it("has the same copy keys in English, French and Arabic", () => {
    expect(Object.keys(signedOutText.fr)).toEqual(Object.keys(signedOutText.en));
    expect(Object.keys(signedOutText.ar)).toEqual(Object.keys(signedOutText.en));
  });

  it("links to sign-in with a same-site return path only", () => {
    expect(signInHref("/calendar/request?request=JR-2026-000003")).toBe(
      "/signin?next=%2Fcalendar%2Frequest%3Frequest%3DJR-2026-000003"
    );
    expect(signInHref(null)).toBe("/signin");
    // Built from parts so the repo's route-literal check does not read them as app links.
    const slash = "/";
    const protocolRelative = slash + slash + "evil.example";
    const backslash = slash + "\\" + "evil";
    for (const bad of ["https://evil.example", protocolRelative, backslash, "/signin", "/signin?next=/x", "/api/session", "calendar"]) {
      expect(safeReturnPath(bad)).toBeNull();
    }
    expect(safeReturnPath("/orders")).toBe("/orders");
  });

  it("is used instead of the old 'Administrator access required' text on every staff page", () => {
    const offenders = sources(appDir).filter((path) => {
      const text = readFileSync(path, "utf8");
      return /Administrator access required\.<|setMsg\("Administrator access required|setMessage\("Administrator access required|Timesheet authority is required to view/.test(text);
    });
    expect(offenders).toEqual([]);
  });
});

describe("staff request summary parsing", () => {
  it("keeps valid cards and drops broken ones", () => {
    expect(
      parseRequestCards({
        a: { companyName: "Ferme Laval", roleLabel: "Farm worker", locationName: "Barn", locationCity: "Laval", workGroupLabel: "Farming" },
        b: { companyName: 3 }
      })
    ).toEqual({ a: { companyName: "Ferme Laval", roleLabel: "Farm worker", locationName: "Barn", locationCity: "Laval", workGroupLabel: "Farming" } });
    expect(parseRequestCards(null)).toEqual({});
  });

  it("parses the summary and refuses a non-https job link", () => {
    const summary = parseRequestSummary({
      companyName: "Ferme Laval",
      roleLabel: "Farm worker",
      numberOfWorkers: 1,
      hoursPerWorker: 6,
      totalHours: 6,
      allowances: [{ kind: "meal", provision: "provided", amountMinor: null, note: null }, { kind: "bogus" }],
      pricing: { source: "estimate", currency: "CAD", marginPpm: 200000, employerHourlyRateMinor: 2500, workerHourlyRateMinor: 2000, platformHourlyMarginMinor: 500, urgentSurchargePerHourMinor: 0, allowancesEmployerPerShiftMinor: 0, allowancesWorkerPerShiftMinor: 0, distanceSurchargePerShiftMinor: 0, estimatedTotalMinor: 15000 },
      pricingProblem: null,
      openClaim: true,
      confirmedWorkerCount: 0,
      publicJobUrl: "javascript:alert(1)"
    });
    expect(summary?.allowances).toHaveLength(1);
    expect(summary?.pricing?.workerHourlyRateMinor).toBe(2000);
    expect(summary?.publicJobUrl).toBeNull();
    expect(parseRequestSummary({ companyName: "x" })).toBeNull();
  });
});
