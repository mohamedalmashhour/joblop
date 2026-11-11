import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { en, fr, ar } from "../i18n/messages";
import { cardDetail, cardState, cardWhen, parseAssistantAction, parseAssistantResult } from "./assistantCards";

const now = new Date("2026-11-10T12:00:00Z");
const actionBody = (over: Record<string, unknown> = {}) =>
  JSON.stringify({
    type: "assistant_action",
    proposalId: "p1",
    token: "SECRET.TOKEN",
    tool: "claim_open_job",
    card: { subject: "Kitchen helper", startAt: "2026-11-12T13:00:00.000Z", endAt: "2026-11-12T19:00:00.000Z", timezone: "America/Toronto", place: "Laval, QC" },
    expiresAt: "2026-11-10T12:10:00.000Z",
    ...over
  });
const result = (status: string, proposalId = "p1") => ({
  authorKind: "assistant_result",
  body: JSON.stringify({ type: "assistant_result", proposalId, status, text: "Done." })
});

describe("assistant action cards", () => {
  it("reads a card and ignores anything that is not one", () => {
    const action = parseAssistantAction(actionBody());
    expect(action?.tool).toBe("claim_open_job");
    expect(action?.card.place).toBe("Laval, QC");
    expect(parseAssistantAction("not json")).toBeNull();
    expect(parseAssistantAction(JSON.stringify({ proposalId: "p1" }))).toBeNull();
    expect(parseAssistantResult(result("done").body)).toEqual({ proposalId: "p1", status: "done", text: "Done." });
  });

  it("is pending until a result for the same card arrives, then shows that result", () => {
    const action = parseAssistantAction(actionBody())!;
    expect(cardState(action, [], now)).toBe("pending");
    expect(cardState(action, [result("done", "other")], now)).toBe("pending");
    expect(cardState(action, [result("done")], now)).toBe("done");
    expect(cardState(action, [result("cancelled")], now)).toBe("cancelled");
    expect(cardState(action, [result("failed")], now)).toBe("failed");
  });

  it("expires at expiresAt (no buttons after that)", () => {
    const action = parseAssistantAction(actionBody())!;
    expect(cardState(action, [], new Date("2026-11-10T12:10:00Z"))).toBe("expired");
    expect(cardState(parseAssistantAction(actionBody({ expiresAt: "" }))!, [], now)).toBe("expired");
  });

  it("formats the time in the card's time zone and reads detail items", () => {
    const when = cardWhen(parseAssistantAction(actionBody())!.card, "en-CA");
    expect(when).toMatch(/8:00/);
    expect(when).toMatch(/2:00/);
    expect(cardDetail("workers:3")).toEqual({ kind: "workers", value: "3" });
    expect(cardDetail("Cook")).toEqual({ kind: "text", value: "Cook" });
  });

  it("never shows the token and has every card word in English, French and Arabic", () => {
    const view = readFileSync(new URL("./AssistantActionCard.tsx", import.meta.url), "utf8");
    expect(view).not.toMatch(/\.token\b/);
    expect(view).toMatch(/background: "#F8B808", border: "none", borderRadius: 8, color: "#000000"/);
    const keys = Object.keys(en).filter((k) => k.startsWith("assistant."));
    expect(keys.length).toBeGreaterThan(10);
    for (const key of keys) {
      expect(fr[key as keyof typeof fr], `fr:${key}`).toBeTruthy();
      expect(ar[key as keyof typeof ar], `ar:${key}`).toBeTruthy();
    }
  });

  it("is the same helper in the worker, employer and staff apps", () => {
    const worker = readFileSync(new URL("./assistantCards.ts", import.meta.url), "utf8");
    for (const path of ["../../../employer/app/employer/contact-joblop/assistantCards.ts", "../../../admin/app/contact-desk/assistantCards.ts"]) {
      expect(readFileSync(new URL(path, import.meta.url), "utf8"), path).toBe(worker);
    }
  });
});
