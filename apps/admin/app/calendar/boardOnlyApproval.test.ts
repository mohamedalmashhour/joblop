import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { dispatchText } from "../dispatches/[dispatchReviewId]/dispatchText";

const read = (...path: string[]) => readFileSync(join(__dirname, ...path), "utf8");

// On the live site an offer never becomes an assignment (ASSIGNMENT_HANDOFF_ENABLED is off and not
// allowed in production), so staff must not be offered "I'll choose the worker myself".
describe("approving a request while the manual worker pick is off", () => {
  const panel = read("PersistedAdminReviewPanel.tsx");

  it("keeps the manual option switched off, with the reason written down", () => {
    expect(panel).toContain("export const MANUAL_WORKER_PICK_AVAILABLE = false;");
    expect(panel).toContain("ASSIGNMENT_HANDOFF_ENABLED");
  });

  it("always approves with openClaim = true", () => {
    expect(panel).toContain("const openClaim = MANUAL_WORKER_PICK_AVAILABLE ? openClaimChoice : true;");
    expect(panel).toContain('...(step === "approve-for-dispatch" ? { openClaim } : {})');
  });

  it("shows the manual radio only when the switch is on, and keeps the code path", () => {
    const gate = panel.indexOf("{MANUAL_WORKER_PICK_AVAILABLE ? (");
    const manual = panel.indexOf("{t.choiceManual}");
    expect(gate).toBeGreaterThan(-1);
    expect(manual).toBeGreaterThan(gate);
    expect(panel).toContain("onChange={() => setOpenClaim(false)}");
  });
});

describe("dispatch page offer area", () => {
  it("tells staff in every language that the worker takes the shift from the job board", () => {
    for (const lang of ["en", "fr", "ar"] as const) {
      const copy = dispatchText[lang];
      expect(copy.boardOnlyTitle.trim(), lang).not.toBe("");
      expect(copy.boardOnlyBody.trim(), lang).not.toBe("");
      expect(copy.createOfferNote.trim(), lang).not.toBe("");
    }
    expect(dispatchText.en.boardOnlyBody).toContain("job board");
    expect(dispatchText.fr.boardOnlyBody).toContain("babillard d’emplois");
    expect(dispatchText.ar.boardOnlyBody).toContain("لوحة الوظائف");
  });

  it("shows the notice next to Create offer and in the offers panel", () => {
    const interested = read("..", "dispatches", "[dispatchReviewId]", "InterestedWorkersPanel.tsx");
    expect(interested).toContain("<BoardOnlyNotice />");
    expect(interested).toContain("{canCreateOffer ? <CreateOfferNote /> : null}");
    expect(read("..", "dispatches", "[dispatchReviewId]", "OfferAssignmentStatusPanel.tsx")).toContain("<BoardOnlyNotice />");
  });
});
