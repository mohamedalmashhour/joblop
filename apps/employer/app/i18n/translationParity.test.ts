import { describe, expect, it } from "vitest";
import { dictionaries, en } from "./messages";
import { aboutCopy } from "../about/aboutContent";
import { contactCopy } from "../contact/contactContent";
import { faqCopy } from "../faq/faqContent";
import { howItWorksCopy } from "../how-it-works/howItWorksContent";
import { getLandingContent } from "../landingContent";
import { pricingCopy } from "../pricing/pricingContent";
import { staffingText } from "../employer/calendar/assignment/staffingText";
import { contactText } from "../employer/contact-joblop/contactText";
import { contractText } from "../employer/contract/contractText";
import { setupText, siteStatusLabels, sitesText } from "../employer/onboarding/onboardingText";
import { pageHeaders } from "../employer/pageHeaderText";
import {
  assignmentStatusLabels,
  assignmentsText,
  attendanceStatusLabels,
  attendanceText,
  calendarStateText,
  reviewStatusLabels,
  timesheetStatusLabels,
  timesheetsText
} from "../employer/recordListText";

// Employer Arabic is typed as Partial, and the per-page tables are separate objects, so a missing or
// untranslated line would quietly show English. These checks make every language complete.

const placeholders = (text: string) => (text.match(/\{\w+\}/g) ?? []).sort();

/** Lines that are the same in every language on purpose (an example address, brand names, tax codes). */
const SAME_ON_PURPOSE = new Set(["auth.emailPlaceholder"]);

describe("employer dictionary", () => {
  const keys = Object.keys(en) as (keyof typeof en)[];

  it("has every English key in French and Arabic", () => {
    for (const locale of ["fr-CA", "ar"] as const) {
      const dict = dictionaries[locale];
      expect(keys.filter((key) => !dict[key]), locale).toEqual([]);
    }
  });

  it("keeps every {placeholder} (a singular line may say 'one' in words instead of {count})", () => {
    for (const locale of ["fr-CA", "ar"] as const) {
      const dict = dictionaries[locale];
      for (const key of keys) {
        const line = dict[key];
        if (!line) continue;
        const expected = placeholders(en[key]).filter((p) => !(p === "{count}" && !line.includes("{count}")));
        expect(placeholders(line), `${locale} ${key}`).toEqual(expected);
      }
    }
  });

  it("has no Arabic line left in English", () => {
    const ar = dictionaries.ar;
    const english = keys.filter((key) => !SAME_ON_PURPOSE.has(key) && /[A-Za-z]{3}/.test(en[key]) && ar[key] === en[key]);
    expect(english).toEqual([]);
  });
});

type Tables = Readonly<Record<string, Readonly<{ en: unknown; fr: unknown; ar: unknown }>>>;

// Each table, by language. The "-CA" tables are re-keyed to en/fr/ar.
const tables: Tables = {
  about: { en: aboutCopy["en-CA"], fr: aboutCopy["fr-CA"], ar: aboutCopy.ar },
  contact: { en: contactCopy["en-CA"], fr: contactCopy["fr-CA"], ar: contactCopy.ar },
  faq: { en: faqCopy["en-CA"], fr: faqCopy["fr-CA"], ar: faqCopy.ar },
  howItWorks: { en: howItWorksCopy["en-CA"], fr: howItWorksCopy["fr-CA"], ar: howItWorksCopy.ar },
  landing: { en: getLandingContent("en-CA"), fr: getLandingContent("fr-CA"), ar: getLandingContent("ar") },
  pricing: { en: pricingCopy["en-CA"], fr: pricingCopy["fr-CA"], ar: pricingCopy.ar },
  staffing: staffingText,
  contactJoblop: contactText,
  contract: contractText,
  setup: setupText,
  sites: sitesText,
  siteStatus: siteStatusLabels,
  pageHeaders,
  assignments: assignmentsText,
  attendance: attendanceText,
  timesheets: timesheetsText,
  calendarStates: calendarStateText,
  assignmentStatus: assignmentStatusLabels,
  attendanceStatus: attendanceStatusLabels,
  timesheetStatus: timesheetStatusLabels,
  reviewStatus: reviewStatusLabels
};

/** Every difference in shape between `base` and `other`: missing keys, list lengths, empty text. */
function shapeProblems(base: unknown, other: unknown, path: string): string[] {
  if (typeof base === "string") {
    if (typeof other !== "string") return [`${path}: missing`];
    return other.trim() ? [] : [`${path}: empty`];
  }
  if (Array.isArray(base)) {
    if (!Array.isArray(other)) return [`${path}: not a list`];
    if (other.length !== base.length) return [`${path}: ${other.length} items, English has ${base.length}`];
    return base.flatMap((item, i) => shapeProblems(item, other[i], `${path}[${i}]`));
  }
  if (base && typeof base === "object") {
    if (!other || typeof other !== "object") return [`${path}: missing`];
    return Object.entries(base).flatMap(([key, value]) =>
      shapeProblems(value, (other as Record<string, unknown>)[key], `${path}.${key}`)
    );
  }
  return [];
}

/** Multi-word English sentences copied unchanged into another language. */
function untranslated(base: unknown, other: unknown, path: string): string[] {
  if (typeof base === "string") {
    return other === base && /[A-Za-z]{3,} [A-Za-z]{3,} [A-Za-z]{3,}/.test(base) ? [path] : [];
  }
  if (Array.isArray(base) && Array.isArray(other)) return base.flatMap((item, i) => untranslated(item, other[i], `${path}[${i}]`));
  if (base && typeof base === "object" && other && typeof other === "object") {
    return Object.entries(base).flatMap(([key, value]) => untranslated(value, (other as Record<string, unknown>)[key], `${path}.${key}`));
  }
  return [];
}

describe("employer page text tables", () => {
  for (const [name, table] of Object.entries(tables)) {
    it(`${name}: French and Arabic match the English shape and are translated`, () => {
      for (const lang of ["fr", "ar"] as const) {
        expect(shapeProblems(table.en, table[lang], `${name}.${lang}`)).toEqual([]);
        expect(untranslated(table.en, table[lang], `${name}.${lang}`)).toEqual([]);
      }
    });
  }
});
