import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { dispatchPanelsText, fillIn, statusWord } from "./dispatchPanelsText";

// Round 8: the dispatch page spoke developer English ("Operational dispatch review", "Persisted
// review state", "Candidate review boundary", "governed offer") and had no French or Arabic.

const PANELS = [
  "PersistedDispatchPanel.tsx",
  "CandidateReviewPanel.tsx",
  "InterestedWorkersPanel.tsx",
  "OfferAssignmentStatusPanel.tsx"
];
const read = (file: string) => readFileSync(new URL(`./${file}`, import.meta.url), "utf8");

/** Every leaf path of a nested copy object, e.g. "detail.stateLabels.draft". */
function leaves(value: unknown, prefix = ""): Record<string, string> {
  if (typeof value === "string") return { [prefix]: value };
  return Object.entries(value as Record<string, unknown>).reduce<Record<string, string>>(
    (all, [key, child]) => ({ ...all, ...leaves(child, prefix ? `${prefix}.${key}` : key) }),
    {}
  );
}

describe("dispatch page staff text", () => {
  const en = leaves(dispatchPanelsText.en);

  for (const locale of ["fr", "ar"] as const) {
    it(`has every English line in ${locale}, with the same {placeholders}`, () => {
      const other = leaves(dispatchPanelsText[locale]);
      expect(Object.keys(other).sort()).toEqual(Object.keys(en).sort());
      for (const [key, text] of Object.entries(en)) {
        expect(other[key]?.trim(), `${locale}:${key}`).toBeTruthy();
        const slots = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
        expect(slots(other[key]!), `${locale}:${key}`).toEqual(slots(text));
      }
    });
  }

  it("uses no developer jargon in any language", () => {
    for (const locale of ["en", "fr", "ar"] as const) {
      for (const [key, text] of Object.entries(leaves(dispatchPanelsText[locale]))) {
        expect(text, `${locale}:${key}`).not.toMatch(/governed|persisted|authoritative|boundary|reconcil|fixture|operational/i);
      }
    }
  });

  it("panels show no hard-coded English sentences or raw codes", () => {
    for (const file of PANELS) {
      const source = read(file);
      for (const phrase of [
        "Operational dispatch review",
        "Persisted review state",
        "Candidate review boundary",
        "Governed offer",
        'replaceAll("_", " ")',
        "message.includes(",
        'timeZone: "UTC"'
      ]) {
        expect(source.includes(phrase), `${file} still has ${phrase}`).toBe(false);
      }
      // The word on its own (the API field name "governedOffer" is fine).
      expect(source, file).not.toMatch(/\x22[^\x22\n]*\bgoverned\b[^\x22\n]*\x22/i);
      expect(source, file).toContain("usePageText(dispatchPanelsText)");
    }
  });

  it("keeps the board-only notice where staff create or send offers", () => {
    expect(read("InterestedWorkersPanel.tsx")).toContain("<BoardOnlyNotice />");
    expect(read("OfferAssignmentStatusPanel.tsx")).toContain("<BoardOnlyNotice />");
  });

  it("fills placeholders and words status codes", () => {
    expect(fillIn("{count} workers · {priority}", { count: 3, priority: "Urgent" })).toBe("3 workers · Urgent");
    expect(fillIn("{missing}", {})).toBe("{missing}");
    expect(statusWord(dispatchPanelsText.fr.offers.statusWords, "worker_acknowledged")).toBe("confirmée par le travailleur");
    expect(statusWord({}, "brand_new_state")).toBe("brand new state");
  });
});
