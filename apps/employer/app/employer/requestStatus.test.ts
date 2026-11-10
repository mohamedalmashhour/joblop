import { describe, expect, it } from "vitest";
import { ar, en, fr, type MessageKey } from "../i18n/messages";
import { isClosedPhase, requestPhase, requestPhaseLabel } from "./requestStatus";

const shift = { startAt: "2026-11-12T15:00:00Z", endAt: "2026-11-12T23:00:00Z" };
const before = new Date("2026-11-10T12:00:00Z");
const during = new Date("2026-11-12T18:00:00Z");
const after = new Date("2026-11-13T01:00:00Z");

describe("requestPhase", () => {
  it("maps each API status to the employer's words", () => {
    expect(requestPhase({ ...shift, status: "draft" }, before)).toBe("draft");
    expect(requestPhase({ ...shift, status: "submitted" }, before)).toBe("review");
    expect(requestPhase({ ...shift, status: "under_review" }, before)).toBe("review");
    expect(requestPhase({ ...shift, status: "published" }, before)).toBe("looking");
    expect(requestPhase({ ...shift, status: "assigned" }, before)).toBe("confirmed");
    expect(requestPhase({ ...shift, status: "completed" }, before)).toBe("done");
    expect(requestPhase({ ...shift, status: "cancelled" }, before)).toBe("cancelled");
  });

  it("never says 'Working now' before the shift starts, even when the attendance window is open", () => {
    expect(requestPhase({ ...shift, status: "in_progress" }, before)).toBe("confirmed");
    expect(requestPhase({ ...shift, status: "in_progress" }, during)).toBe("working");
    expect(requestPhase({ ...shift, status: "assigned" }, during)).toBe("working");
  });

  it("shows a confirmed shift as done once it has ended", () => {
    expect(requestPhase({ ...shift, status: "in_progress" }, after)).toBe("done");
    expect(requestPhase({ ...shift, status: "assigned" }, after)).toBe("done");
  });

  it("treats only cancelled and finished requests as closed", () => {
    expect(isClosedPhase("cancelled")).toBe(true);
    expect(isClosedPhase("done")).toBe(true);
    for (const phase of ["draft", "review", "looking", "confirmed", "working"] as const) {
      expect(isClosedPhase(phase)).toBe(false);
    }
  });
});

describe("requestPhaseLabel", () => {
  const render = (phase: Parameters<typeof requestPhaseLabel>[0], workers: number, messages: Partial<Record<MessageKey, string>> = en) => {
    const label = requestPhaseLabel(phase, workers);
    return (messages[label.key] ?? "").replace("{count}", String(label.vars?.count ?? ""));
  };

  it("uses the agreed plain wording", () => {
    expect(render("draft", 1)).toBe("Draft");
    expect(render("review", 1)).toBe("Waiting for review");
    expect(render("looking", 1)).toBe("Looking for a worker");
    expect(render("looking", 3)).toBe("Looking for workers");
    expect(render("confirmed", 1)).toBe("Confirmed – 1 worker coming");
    expect(render("confirmed", 3)).toBe("Confirmed – 3 workers coming");
    expect(render("working", 1)).toBe("Working now");
    expect(render("done", 1)).toBe("Done");
    expect(render("cancelled", 1)).toBe("Cancelled");
  });

  it("is translated in French and Arabic", () => {
    expect(render("confirmed", 2, fr)).toBe("Confirmée – 2 travailleurs viendront");
    expect(render("review", 1, fr)).toBe("En attente de vérification");
    for (const phase of ["draft", "review", "looking", "confirmed", "working", "done", "cancelled"] as const) {
      expect(render(phase, 2, ar)).not.toBe("");
    }
  });
});
