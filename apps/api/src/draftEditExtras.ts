// Extra fields the employer's "Edit draft" form needs to open pre-filled and to save every field it
// shows: the required certificates (stored on the job request) and the per-shift allowances (stored on
// the calendar profile). These are the employer's own entries, never worker pay or Joblop's margin.
import { parseRequiredCertificates, storedRequiredCertificates } from "@rwos/shared";

type AllowanceRow = Readonly<{
  transportProvision: string;
  transportAmountMinor: number | null;
  transportNote: string | null;
  mealProvision: string;
  mealAmountMinor: number | null;
  mealNote: string | null;
  lodgingProvision: string;
  lodgingAmountMinor: number | null;
  lodgingNote: string | null;
}>;

export type DraftEditExtrasRow = Readonly<{
  requiredCertificates?: readonly string[] | null;
  requiredCertificateOther?: string | null;
  calendarProfile?: AllowanceRow | null;
}>;

export function draftEditExtras(row: DraftEditExtrasRow) {
  const required = storedRequiredCertificates(row);
  const profile = row.calendarProfile ?? null;
  return {
    requiredCertificates: [...required.keys],
    requiredCertificateOther: required.other ?? null,
    allowances: profile
      ? {
          transport: { provision: profile.transportProvision, amountMinor: profile.transportAmountMinor, note: profile.transportNote },
          meal: { provision: profile.mealProvision, amountMinor: profile.mealAmountMinor, note: profile.mealNote },
          lodging: { provision: profile.lodgingProvision, amountMinor: profile.lodgingAmountMinor, note: profile.lodgingNote }
        }
      : null
  };
}

/**
 * Reads an optional required-certificates change from a draft update body.
 * absent → leave as is; invalid → refuse; ok → the data to store (an empty list clears it).
 */
export function readDraftCertificatesUpdate(body: Record<string, unknown>):
  | Readonly<{ status: "absent" }>
  | Readonly<{ status: "invalid" }>
  | Readonly<{ status: "ok"; data: { requiredCertificates: string[]; requiredCertificateOther: string | null } }> {
  if (body.requiredCertificates === undefined) return { status: "absent" };
  const parsed = parseRequiredCertificates(body.requiredCertificates, body.requiredCertificateOther);
  if (!parsed) return { status: "invalid" };
  return { status: "ok", data: { requiredCertificates: [...parsed.keys], requiredCertificateOther: parsed.other ?? null } };
}
