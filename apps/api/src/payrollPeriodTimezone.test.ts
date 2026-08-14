import { describe, expect, it } from "vitest";
import { resolvePayrollPeriodTimezone } from "./payrollPeriodTimezone";

// The countries/canada reference timezone (countries/canada/src/canada.test.ts separately proves
// canadaCountryProfile.timezone === this literal). Used here directly so the api package stays
// decoupled from the country package (no Docker coupling for a test).
const CANADA_TZ: string = "America/Toronto";

describe("resolvePayrollPeriodTimezone — neutral, fail-closed selection", () => {
  it("uses the request's explicit timezone when present (highest precedence)", () => {
    expect(resolvePayrollPeriodTimezone("Asia/Damascus", CANADA_TZ ?? undefined)).toBe("Asia/Damascus");
    expect(resolvePayrollPeriodTimezone("America/Toronto", undefined)).toBe("America/Toronto");
  });

  it("falls back to the INJECTED country timezone (no implicit Canada) — countries/canada preserves America/Toronto", () => {
    expect(resolvePayrollPeriodTimezone(undefined, CANADA_TZ ?? undefined)).toBe("America/Toronto");
    expect(CANADA_TZ).toBe("America/Toronto"); // characterization: reference equals the prior default
  });

  it("returns null (fail-closed) when neither request nor country supplies a timezone", () => {
    expect(resolvePayrollPeriodTimezone(undefined, undefined)).toBeNull();
    // The route rejects a null result with RWOS_PAYROLL_INVALID_INPUT — no country is ever assumed.
  });
});

// DST / date-boundary characterization: prove the resolved timezone string ("America/Toronto" via
// the countries/canada injection) yields the SAME DST behavior the platform relied on. We assert the
// UTC offset on both sides of the 2026 Canadian DST transitions, so any drift in timezone handling
// would fail here.
function torontoOffsetMinutes(isoUtc: string, timeZone: string): number {
  const d = new Date(isoUtc);
  const tzName = new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "shortOffset" })
    .formatToParts(d)
    .find((p) => p.type === "timeZoneName")?.value ?? "";
  const m = /GMT([+-])(\d{1,2})(?::(\d{2}))?/.exec(tzName);
  if (!m) throw new Error(`no offset parsed from ${tzName}`);
  const sign = m[1] === "-" ? -1 : 1;
  return sign * (Number(m[2]) * 60 + Number(m[3] ?? 0));
}

describe("America/Toronto DST characterization (via injected countries/canada timezone)", () => {
  const tz = CANADA_TZ ?? "America/Toronto";

  it("is EST (UTC-5) in winter and EDT (UTC-4) in summer", () => {
    expect(torontoOffsetMinutes("2026-01-15T12:00:00Z", tz)).toBe(-300); // EST
    expect(torontoOffsetMinutes("2026-07-15T12:00:00Z", tz)).toBe(-240); // EDT
  });

  it("crosses the spring-forward boundary (2026-03-08 ~02:00 local) exactly", () => {
    expect(torontoOffsetMinutes("2026-03-08T06:00:00Z", tz)).toBe(-300); // just before → EST
    expect(torontoOffsetMinutes("2026-03-08T07:00:00Z", tz)).toBe(-240); // just after → EDT
  });

  it("crosses the fall-back boundary (2026-11-01 ~02:00 local) exactly", () => {
    expect(torontoOffsetMinutes("2026-11-01T05:00:00Z", tz)).toBe(-240); // just before → EDT
    expect(torontoOffsetMinutes("2026-11-01T06:00:00Z", tz)).toBe(-300); // just after → EST
  });
});
