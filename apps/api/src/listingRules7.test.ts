import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { isSavedJobAvailable } from "./savedJobAvailability";
import { sortDispatchesBySoonestShift } from "./dispatchListOrder";

// Round 7: listing rules on the API side.
const NOW = new Date("2026-11-09T12:00:00.000Z");
const read = (file: string) => readFileSync(fileURLToPath(new URL(file, import.meta.url)), "utf8");

describe("saved jobs: available only while a worker can still take it", () => {
  const row = (status: string, startAt: string, residence = "active") => ({ status, startAt: new Date(startAt), residence: { status: residence } });
  const open = { placesLeft: 2, listed: true, now: NOW };

  it.each([
    ["approved, upcoming, places left", row("approved_for_dispatch", "2026-11-12T13:00:00.000Z"), open, true],
    ["only submitted (not approved yet)", row("submitted", "2026-11-12T13:00:00.000Z"), open, false],
    ["cancelled", row("cancelled", "2026-11-12T13:00:00.000Z"), open, false],
    ["already started", row("approved_for_dispatch", "2026-11-09T11:00:00.000Z"), open, false],
    ["full (no place left)", row("approved_for_dispatch", "2026-11-12T13:00:00.000Z"), { ...open, placesLeft: 0 }, false],
    ["site closed", row("approved_for_dispatch", "2026-11-12T13:00:00.000Z", "inactive"), open, false],
    ["long-term job no longer listed", row("approved_for_dispatch", "2026-11-12T13:00:00.000Z"), { ...open, listed: false }, false],
    ["job deleted", null, open, false]
  ])("%s", (_name, input, options, expected) => {
    expect(isSavedJobAvailable(input, options)).toBe(expected);
  });

  it("reports places left as openings, from the shared counter", () => {
    const handler = read("./app.ts").slice(read("./app.ts").indexOf('app.get("/marketplace/saved-jobs"'));
    const body = handler.slice(0, handler.indexOf("\n  app.", 10));
    expect(body).toContain("remainingOpenings(prisma!");
    expect(body).toContain("openings: placesLeft");
    expect(body).toContain("isSavedJobAvailable(r, {");
  });
});

describe("signed-in search orders by start time before the cap", () => {
  it("sorts soonest first in the query, before take", () => {
    const app = read("./app.ts");
    const handler = app.slice(app.indexOf('app.post("/marketplace/jobs/search"'));
    const body = handler.slice(0, handler.indexOf("\n  app.", 10));
    const orderAt = body.indexOf('orderBy: [{ startAt: "asc" }, { id: "asc" }]');
    const takeAt = body.indexOf("take: MARKETPLACE_CANDIDATE_CAP");
    expect(orderAt).toBeGreaterThan(-1);
    expect(takeAt).toBeGreaterThan(orderAt);
  });
});

describe("staff dispatch list", () => {
  it("lists the soonest shift first, unknown shifts last", () => {
    const rows = [
      { id: "later", shiftStartAt: "2026-11-20T13:00:00.000Z", createdAt: "2026-11-01T00:00:00.000Z" },
      { id: "unknown", shiftStartAt: null, createdAt: "2026-11-08T00:00:00.000Z" },
      { id: "soon", shiftStartAt: "2026-11-10T13:00:00.000Z", createdAt: "2026-11-02T00:00:00.000Z" }
    ];
    expect(sortDispatchesBySoonestShift(rows).map((r) => r.id)).toEqual(["soon", "later", "unknown"]);
  });

  it("sends each dispatch's shift start, end and time zone", () => {
    const app = read("./app.ts");
    expect(app).toContain("shiftStartAt: source?.startAt ? source.startAt.toISOString() : null,");
    expect(app).toContain("dispatches: sortDispatchesBySoonestShift(");
  });
});
