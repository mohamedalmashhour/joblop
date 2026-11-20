import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { assistantMessageText } from "./StaffAssistantCard";
import { contactDeskText } from "./text";

const card = JSON.stringify({
  type: "assistant_action",
  proposalId: "p1",
  token: "SECRET.TOKEN.VALUE",
  tool: "approve_request",
  card: { subject: "Cook (JR-2026-000123)" },
  expiresAt: "2026-11-10T12:10:00.000Z"
});

describe("Contact desk assistant cards", () => {
  it("has a title for every assistant action in English, French and Arabic", () => {
    const tools = Object.keys(contactDeskText.en.assistant.titles).sort();
    expect(tools).toContain("approve_timesheet");
    for (const locale of ["fr", "ar"] as const) {
      expect(Object.keys(contactDeskText[locale].assistant.titles).sort()).toEqual(tools);
      expect(Object.keys(contactDeskText[locale].assistant).sort()).toEqual(Object.keys(contactDeskText.en.assistant).sort());
    }
  });

  it("shows a card or a result in a conversation as a plain line, never the token or raw JSON", () => {
    const line = assistantMessageText("assistant_action", card, contactDeskText.en.assistant);
    expect(line).toContain("Approve this request for dispatch?");
    expect(line).toContain("JR-2026-000123");
    expect(line).not.toContain("SECRET");
    expect(line).not.toContain("{");
    const result = assistantMessageText("assistant_result", JSON.stringify({ proposalId: "p1", status: "done", text: "Done." }), contactDeskText.fr.assistant);
    expect(result).toBe("Résultat de la carte (done) : Done.");
    expect(assistantMessageText("ai", "Hello", contactDeskText.en.assistant)).toBe("Hello");
  });

  it("uses black text on the gold Confirm button", () => {
    const view = readFileSync(new URL("./StaffAssistantCard.tsx", import.meta.url), "utf8");
    expect(view).toMatch(/confirm: \{ background: "#F8B808", border: "none", borderRadius: 8, color: "#000000"/);
  });
});
