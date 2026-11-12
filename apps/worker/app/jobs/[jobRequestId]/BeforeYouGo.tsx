"use client";

import { BEFORE_YOU_GO_LABELS, breakRuleLabel, dressCodeLabel, hasShiftConditions, type ShiftConditionsView } from "@rwos/shared";
import { useLocale } from "../../i18n/LocaleProvider";

/** The worker site's language as the shared shift-condition words' language. */
export function conditionsLanguage(locale: string): "en" | "fr" | "ar" {
  return locale === "ar" ? "ar" : locale.startsWith("fr") ? "fr" : "en";
}

/** The stated conditions as [label, text] lines (only the ones the employer filled in). */
export function beforeYouGoLines(c: ShiftConditionsView | null | undefined, lang: "en" | "fr" | "ar"): [string, string][] {
  if (!hasShiftConditions(c)) return [];
  const L = BEFORE_YOU_GO_LABELS[lang];
  const lines: [string, string][] = [];
  const breakText = breakRuleLabel(c.breakMinutes, lang);
  if (breakText) lines.push([L.breakRule, breakText]);
  if (c.dressCode) lines.push([L.dressCode, dressCodeLabel(c.dressCode, lang)]);
  if (c.equipmentToBring) lines.push([L.equipment, c.equipmentToBring]);
  if (c.arrivalInstructions) lines.push([L.arrival, c.arrivalInstructions]);
  if (c.workerNotes) lines.push([L.notes, c.workerNotes]);
  return lines;
}

// "Before you go" on the shift page: break, dress code, equipment, arrival instructions (only the
// worker who holds the shift gets them from the API) and the employer's notes. Shown only when stated.
export function BeforeYouGo({ conditions }: { conditions: ShiftConditionsView | null | undefined }) {
  const lang = conditionsLanguage(useLocale());
  const lines = beforeYouGoLines(conditions, lang);
  if (lines.length === 0) return null;
  const L = BEFORE_YOU_GO_LABELS[lang];
  return (
    <section className="detail-section" data-testid="before-you-go" aria-labelledby="before-you-go-title">
      <h2 id="before-you-go-title">{L.title}</h2>
      <ul className="quals">
        {lines.map(([label, text]) => (
          <li key={label}>
            <strong>{label}:</strong> <bdi style={{ whiteSpace: "pre-line" }}>{text}</bdi>
          </li>
        ))}
      </ul>
      {conditions?.breakMinutes ? <p className="muted">{L.breakInfo}</p> : null}
    </section>
  );
}
