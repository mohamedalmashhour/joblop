import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ar, en, fr } from "../../i18n/messages";
import { cardState, parseAssistantAction } from "./assistantCards";

describe("employer assistant action cards", () => {
  it("has a title for each employer action and every card word in English, French and Arabic", () => {
    for (const tool of ["create_draft_request", "submit_draft", "confirm_timesheet", "duplicate_request"]) {
      expect(en[`assistant.title.${tool}` as keyof typeof en], tool).toBeTruthy();
    }
    for (const key of Object.keys(en).filter((k) => k.startsWith("assistant."))) {
      expect(fr[key as keyof typeof fr], `fr:${key}`).toBeTruthy();
      expect(ar[key as keyof typeof ar], `ar:${key}`).toBeTruthy();
    }
  });

  it("keeps Confirm black on gold and never shows the token", () => {
    const view = readFileSync(new URL("./AssistantActionCard.tsx", import.meta.url), "utf8");
    expect(view).toMatch(/confirm: \{ background: "#F8B808", border: "none", borderRadius: 8, color: "#000000"/);
    expect(view).not.toMatch(/\.token\b/);
  });

  it("stops offering Confirm once the card is answered", () => {
    const action = parseAssistantAction(
      JSON.stringify({ proposalId: "p9", token: "t", tool: "submit_draft", card: { subject: "Cook" }, expiresAt: "2999-01-01T00:00:00Z" })
    )!;
    expect(cardState(action, [])).toBe("pending");
    expect(cardState(action, [{ authorKind: "assistant_result", body: JSON.stringify({ proposalId: "p9", status: "cancelled", text: "OK" }) }])).toBe("cancelled");
  });
});
