// Shift conditions an employer can state on a request (all optional): the unpaid break, dress code,
// equipment to bring, arrival instructions and notes for workers. Stored on the request profile
// (staffing_request_calendar_profiles). Workers see them in "Before you go"; arrival instructions only
// once they hold the shift, like the exact address. The break is information only: the timesheet engine
// does not deduct breaks yet (breakRule "break_evidence_deferred"), so pay is unchanged.

import {
  BEFORE_YOU_GO_LABELS,
  SHIFT_CONDITION_LIMITS,
  breakRuleLabel,
  dressCodeLabel,
  type ShiftConditionsView
} from "@rwos/shared";

export { DRESS_CODE_PRESETS, SHIFT_CONDITION_LIMITS } from "@rwos/shared";

export type ShiftConditions = ShiftConditionsView;

export const SHIFT_CONDITIONS_SELECT = {
  breakMinutes: true,
  dressCode: true,
  equipmentToBring: true,
  arrivalInstructions: true,
  workerNotes: true
} as const;

export const EMPTY_SHIFT_CONDITIONS: ShiftConditions = {
  breakMinutes: null,
  dressCode: null,
  equipmentToBring: null,
  arrivalInstructions: null,
  workerNotes: null
};

/** Plain text only: tags removed, control characters dropped, spaces tidied; empty → null. */
export function plainText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const text = value
    .replace(/<[^>]*>/g, " ")
    .replace(/&(lt|gt|amp|quot|#39|nbsp);/g, " ")
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return text.length > 0 ? text : null;
}

export type ShiftConditionsParse =
  | Readonly<{ status: "absent" }>
  | Readonly<{ status: "ok"; data: ShiftConditions }>
  | Readonly<{ status: "invalid"; field: keyof ShiftConditions }>;

/** Reads body.conditions. Absent → leave stored values alone; invalid → 400 with the field name. */
export function parseShiftConditions(input: unknown): ShiftConditionsParse {
  if (input === undefined) return { status: "absent" };
  if (input === null) return { status: "ok", data: EMPTY_SHIFT_CONDITIONS };
  if (typeof input !== "object" || Array.isArray(input)) return { status: "invalid", field: "workerNotes" };
  const record = input as Record<string, unknown>;

  let breakMinutes: number | null = null;
  const rawBreak = record.breakMinutes;
  if (rawBreak !== undefined && rawBreak !== null && rawBreak !== "") {
    const n = typeof rawBreak === "string" ? Number(rawBreak) : rawBreak;
    if (typeof n !== "number" || !Number.isInteger(n) || n < 0 || n > SHIFT_CONDITION_LIMITS.breakMinutesMax) {
      return { status: "invalid", field: "breakMinutes" };
    }
    breakMinutes = n;
  }

  const texts = {
    dressCode: plainText(record.dressCode),
    equipmentToBring: plainText(record.equipmentToBring),
    arrivalInstructions: plainText(record.arrivalInstructions),
    workerNotes: plainText(record.workerNotes)
  };
  for (const key of ["dressCode", "equipmentToBring", "arrivalInstructions", "workerNotes"] as const) {
    const value = texts[key];
    if (value !== null && value.length > SHIFT_CONDITION_LIMITS[key]) return { status: "invalid", field: key };
  }
  return { status: "ok", data: { breakMinutes, ...texts } };
}

/** The stored values as conditions (missing profile → all empty). */
export function storedShiftConditions(row: Partial<ShiftConditions> | null | undefined): ShiftConditions {
  return {
    breakMinutes: row?.breakMinutes ?? null,
    dressCode: row?.dressCode ?? null,
    equipmentToBring: row?.equipmentToBring ?? null,
    arrivalInstructions: row?.arrivalInstructions ?? null,
    workerNotes: row?.workerNotes ?? null
  };
}

/**
 * What a worker may see. Arrival instructions (where to go, who to ask, parking) only for the worker
 * who holds the shift, like the exact address. Null when nothing is stated.
 */
export function workerShiftConditions(row: Partial<ShiftConditions> | null | undefined, booked: boolean): ShiftConditions | null {
  const c = storedShiftConditions(row);
  const view: ShiftConditions = { ...c, arrivalInstructions: booked ? c.arrivalInstructions : null };
  return Object.values(view).some((v) => v !== null) ? view : null;
}

type Lang = "en" | "fr" | "ar";

/** The "Before you go" block of the "you got the job" email; empty when nothing is stated. */
export function beforeYouGoEmailBlock(conditions: ShiftConditions | null, language: Lang): string {
  if (!conditions) return "";
  const L = BEFORE_YOU_GO_LABELS[language];
  const lines: string[] = [];
  const breakText = breakRuleLabel(conditions.breakMinutes, language);
  if (breakText) lines.push(`- ${L.breakRule}: ${breakText}`);
  if (conditions.dressCode) lines.push(`- ${L.dressCode}: ${dressCodeLabel(conditions.dressCode, language)}`);
  if (conditions.equipmentToBring) lines.push(`- ${L.equipment}: ${conditions.equipmentToBring}`);
  if (conditions.arrivalInstructions) lines.push(`- ${L.arrival}: ${conditions.arrivalInstructions}`);
  if (conditions.workerNotes) lines.push(`- ${L.notes}: ${conditions.workerNotes}`);
  return lines.length > 0 ? `${L.title}:\n${lines.join("\n")}\n\n` : "";
}
