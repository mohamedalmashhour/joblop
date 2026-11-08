import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  EMPLOYER_PLAN_TRIAL_DAYS,
  IMMEDIATE_CLIENT_SURCHARGE_PPM,
  URGENT_CLIENT_SURCHARGE_PPM,
  URGENT_HOURLY_PREMIUM_MINOR
} from "@rwos/shared";
import { pricingCopy } from "./pricingContent";

const locales = ["en-CA", "fr-CA", "ar"] as const;
const allText = (locale: (typeof locales)[number]) => JSON.stringify(pricingCopy[locale]);
const pageSource = readFileSync(join(__dirname, "publicPageStyles.tsx"), "utf8");

describe("public /pricing", () => {
  it("has the same shape in English, French and Arabic", () => {
    const shape = (v: unknown): unknown =>
      Array.isArray(v) ? v.map(shape) : v && typeof v === "object" ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, shape(x)])) : typeof v;
    for (const locale of locales) expect(shape(pricingCopy[locale])).toEqual(shape(pricingCopy["en-CA"]));
  });

  it("states the real prices and rules", () => {
    const en = allText("en-CA");
    expect(en).toContain("at least 6 hours");
    expect(en).toContain("C$49 / month + taxes");
    expect(en).toContain("C$149 / month + taxes");
    expect(en).toContain("C$99 per job listing per month + taxes");
    expect(en).toContain("first 2 weeks are free");
    expect(en).toContain("50% off");
    expect(en).toContain("GST (5%) and QST (9.975%)");
    expect(en).toContain("Interac e-transfer");
    expect(en).toContain("Card payments are coming soon.");
    expect(en).toContain("canceling stops the next month");
    expect(en).toContain(`${EMPLOYER_PLAN_TRIAL_DAYS}-day free trial`);
  });

  it("shows the urgent fees the code charges", () => {
    const en = allText("en-CA");
    expect(en).toContain(`${URGENT_CLIENT_SURCHARGE_PPM / 10_000}% of your hourly rate`);
    expect(en).toContain(`${IMMEDIATE_CLIENT_SURCHARGE_PPM / 10_000}% of your hourly rate`);
    expect(en).toContain(`C$${(URGENT_HOURLY_PREMIUM_MINOR / 100).toFixed(2)} more per billed hour`);
    // The page never says who receives that amount or anything about the worker's pay.
    expect(en).not.toMatch(/worker's pay/i);
  });

  it("never reveals Joblop's share or the worker's rate, and drops the old placeholder text", () => {
    for (const locale of locales) {
      const text = allText(locale);
      expect(text).not.toMatch(/margin|marge|commission|share of|hourly share|part horaire|حصة|هامش|عمولة|20 ?%/i);
      expect(text).not.toMatch(/placeholder|universal|tariff|authorization|settlement|payment integration|Stripe|4242/i);
    }
    expect(pageSource).toContain("<LanguageSwitcher");
  });
});
