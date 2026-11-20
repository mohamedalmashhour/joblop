import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./PaymentStatePanel.tsx", import.meta.url), "utf8");
// Copy lives in the bilingual catalogue (en-CA + fr-CA); the panel references it by key.
const messages = readFileSync(new URL("../../i18n/messages.ts", import.meta.url), "utf8");

function countKey(key: string) {
  return messages.split(`"${key}":`).length - 1;
}

// en-CA (source of truth) + fr-CA (Bill 96 parity) + ar (RTL, en-CA fallback).
const LOCALE_COUNT = 3;

describe("durable employer payment panel", () => {
  it("renders truthful loading, error, empty, and disabled mutation boundaries", () => {
    for (const [key, statement] of [
      ["pay.loading", "Loading payment records"],
      ["pay.loadError", "Payment records could not be loaded"],
      ["pay.none", "No employer payment attempts exist for this organization"],
      ["pay.mutationsDisabled", "Mutations disabled in this view"],
      ["pay.actionUnavailable", "Governed payment action unavailable"]
    ] as const) {
      expect(source).toContain(`t("${key}")`);
      expect(messages).toContain(`"${key}": "${statement}`);
      expect(countKey(key)).toBe(LOCALE_COUNT); // en-CA, fr-CA, ar
    }
    expect(source).toContain('fetch("/api/payments"');
    expect(source).toContain("disabled");
    expect(source).not.toContain("paymentFixture");
  });
});
