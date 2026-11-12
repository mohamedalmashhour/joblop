import { describe, expect, it } from "vitest";
import { isClosedPhase, requestPhase, requestPhaseLabel } from "./requestStatus";
import { dictionaries } from "../i18n/messages";

// Round 7: a request whose shift is over and that was never filled reads "Ended, not filled",
// not "Looking for workers".
describe("ended, not filled", () => {
  const shift = { startAt: "2026-11-12T13:00:00.000Z", endAt: "2026-11-12T19:00:00.000Z" };
  const before = new Date("2026-11-12T12:00:00.000Z");
  const after = new Date("2026-11-12T20:00:00.000Z");

  it("applies once the shift is over while still looking or in review", () => {
    expect(requestPhase({ ...shift, status: "published" }, before)).toBe("looking");
    expect(requestPhase({ ...shift, status: "published" }, after)).toBe("unfilled");
    expect(requestPhase({ ...shift, status: "submitted" }, after)).toBe("unfilled");
    expect(requestPhase({ ...shift, status: "under_review" }, after)).toBe("unfilled");
    // Filled or finished requests keep their own status.
    expect(requestPhase({ ...shift, status: "assigned" }, after)).toBe("done");
    expect(requestPhase({ ...shift, status: "cancelled" }, after)).toBe("cancelled");
  });

  it("is closed (nothing left to change) and has a label in EN/FR/AR", () => {
    expect(isClosedPhase("unfilled")).toBe(true);
    expect(requestPhaseLabel("unfilled", 2)).toEqual({ key: "status.unfilled" });
    expect(dictionaries["en-CA"]["status.unfilled"]).toBe("Ended, not filled");
    expect(dictionaries["fr-CA"]["status.unfilled"]).toBeTruthy();
    expect(dictionaries.ar["status.unfilled"]).toBeTruthy();
  });
});
