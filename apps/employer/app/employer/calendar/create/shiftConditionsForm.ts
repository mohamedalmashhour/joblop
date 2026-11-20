// The "Before the worker goes" part of the request form: unpaid break, dress code, equipment to bring,
// arrival instructions and notes for workers (all optional). Pure helpers so the form logic is tested
// without React. The API strips HTML and re-checks every limit.
import { DRESS_CODE_PRESETS, SHIFT_CONDITION_LIMITS, isDressCodePreset, type DressCodePreset } from "@rwos/shared";
import type { EmployerShiftConditions } from "../../../api/job-requests/jobRequestBoundary";

export type ConditionsForm = Readonly<{
  breakChoice: "unset" | "none" | "minutes";
  breakMinutes: string;
  dressChoice: "" | DressCodePreset | "other";
  dressOther: string;
  equipmentToBring: string;
  arrivalInstructions: string;
  workerNotes: string;
}>;

export { DRESS_CODE_PRESETS, SHIFT_CONDITION_LIMITS };

export function emptyConditionsForm(): ConditionsForm {
  return { breakChoice: "unset", breakMinutes: "", dressChoice: "", dressOther: "", equipmentToBring: "", arrivalInstructions: "", workerNotes: "" };
}

/** Pre-fill from saved conditions (edit draft, duplicate). */
export function conditionsFormFrom(saved: EmployerShiftConditions | null | undefined): ConditionsForm {
  if (!saved) return emptyConditionsForm();
  const dress = saved.dressCode ?? "";
  return {
    breakChoice: saved.breakMinutes === null ? "unset" : saved.breakMinutes === 0 ? "none" : "minutes",
    breakMinutes: saved.breakMinutes && saved.breakMinutes > 0 ? String(saved.breakMinutes) : "",
    dressChoice: dress === "" ? "" : isDressCodePreset(dress) ? dress : "other",
    dressOther: dress !== "" && !isDressCodePreset(dress) ? dress : "",
    equipmentToBring: saved.equipmentToBring ?? "",
    arrivalInstructions: saved.arrivalInstructions ?? "",
    workerNotes: saved.workerNotes ?? ""
  };
}

/** What is sent to the API, or "invalid" when the break is not a whole number of 0 to 240 minutes. */
export function conditionsPayload(form: ConditionsForm): EmployerShiftConditions | "invalid" {
  let breakMinutes: number | null = null;
  if (form.breakChoice === "none") breakMinutes = 0;
  if (form.breakChoice === "minutes") {
    const n = Number(form.breakMinutes.trim());
    if (!Number.isInteger(n) || n < 1 || n > SHIFT_CONDITION_LIMITS.breakMinutesMax) return "invalid";
    breakMinutes = n;
  }
  const clean = (value: string, max: number) => value.trim().slice(0, max) || null;
  return {
    breakMinutes,
    dressCode: form.dressChoice === "other" ? clean(form.dressOther, SHIFT_CONDITION_LIMITS.dressCode) : form.dressChoice || null,
    equipmentToBring: clean(form.equipmentToBring, SHIFT_CONDITION_LIMITS.equipmentToBring),
    arrivalInstructions: clean(form.arrivalInstructions, SHIFT_CONDITION_LIMITS.arrivalInstructions),
    workerNotes: clean(form.workerNotes, SHIFT_CONDITION_LIMITS.workerNotes)
  };
}
