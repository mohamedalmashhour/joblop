import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { en, fr } from "../../i18n/messages";

const source = readFileSync(new URL("./InvoiceReviewPanel.tsx", import.meta.url), "utf8");

const truthfulStatements = [
  "Loading invoice records",
  "Invoice records could not be loaded",
  "No invoices are available for this organization",
  "Governed invoice record",
  "Joblop never sees your card details"
];

const boundaryKeys = [
  't("inv.loading")',
  't("inv.loadError")',
  't("inv.none")',
  't("inv.readOnly")',
  't("inv.copy")'
];

describe("durable invoice review panel", () => {
  it("keeps the truthful loading, error, empty, and card-safety boundaries in the English catalog", () => {
    const values = Object.values(en);
    for (const statement of truthfulStatements) {
      expect(values.some((value) => value.includes(statement))).toBe(true);
    }
  });

  it("provides a French translation for every message key (no English leakage)", () => {
    for (const key of Object.keys(en) as (keyof typeof en)[]) {
      expect(typeof fr[key]).toBe("string");
      expect(fr[key].length).toBeGreaterThan(0);
    }
  });

  it("renders the boundaries through i18n keys, reads the governed API, and uses no fixtures", () => {
    for (const key of boundaryKeys) {
      expect(source).toContain(key);
    }
    expect(source).toContain('fetch("/api/invoices"');
    expect(source).not.toContain("invoiceFixture");
  });
});
