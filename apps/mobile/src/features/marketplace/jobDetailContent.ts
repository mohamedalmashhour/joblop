// Pure rules for the signed-in job page, the same as the worker website's JobDetail
// (apps/worker/app/jobs/[jobRequestId]/JobDetail.tsx): which panel to show (claim, express interest,
// long-term Apply and its status), and the certificate notice. UI-free so it is unit-tested.
import {
  certificateKeysFromReasons,
  certificateLabel,
  isRequiredCertificateKey,
  missingCertificatesNotice,
  type RequiredCertificateKey
} from "@rwos/shared";
import type { JobInterestState, RequiredCertificatesView } from "../../auth/secureSession";
import type { Locale } from "../../i18n/strings";

export type InterestPanel =
  | Readonly<{ kind: "hired" }>
  | Readonly<{ kind: "applied"; shortlisted: boolean }>
  | Readonly<{ kind: "interest_submitted" }>
  | Readonly<{ kind: "offer" }>
  | Readonly<{ kind: "apply"; notSelectedBefore: boolean; eligible: boolean; certificateBlocked: boolean; reason: string | null }>;

const ACTIVE = ["submitted", "under_review", "shortlisted"];

/** Mirrors the website's InterestPanel: long-term jobs are applied to, short-term ones get interest. */
export function interestPanel(state: JobInterestState | null, longTerm: boolean): InterestPanel {
  const current = state?.interest?.status ?? null;
  const decision = state?.interest?.employerDecision ?? state?.lastEmployerDecision ?? null;
  const reasons = state?.eligibility.reasons ?? [];
  if (longTerm && decision === "hired") return { kind: "hired" };
  if (longTerm && current && ACTIVE.includes(current)) return { kind: "applied", shortlisted: decision === "shortlisted" };
  if (current && ACTIVE.includes(current)) return { kind: "interest_submitted" };
  if (current && ["offer_created", "offer_accepted"].includes(current)) return { kind: "offer" };
  return {
    kind: "apply",
    notSelectedBefore: longTerm && decision === "not_selected",
    eligible: state?.eligibility.eligible ?? true,
    certificateBlocked: reasons.some((r) => r.startsWith("missing_certificate:")),
    reason: reasons[0] ?? null
  };
}

// A server eligibility reason → the website's translation key (never raw server text).
const INELIGIBLE_KEY: Readonly<Record<string, string>> = {
  already_assigned: "job.inelAlreadyAssigned",
  active_offer_exists: "job.inelActiveOffer",
  job_not_open: "job.inelNotOpen",
  job_not_found: "job.inelNotFound"
};

export function ineligibleKey(reason: string | null): string {
  return (reason && INELIGIBLE_KEY[reason]) || "job.inelDefault";
}

export function cleanCertificateKeys(keys: readonly string[] | null | undefined): RequiredCertificateKey[] {
  return (keys ?? []).filter(isRequiredCertificateKey);
}

/** "This job needs: … Add it on your Documents page." from the missing keys or the reason codes. */
export function certificateNotice(
  input: Readonly<{ missing?: readonly string[] | null; reasons?: readonly string[] | null; other?: string | null }>,
  locale: Locale
): string | null {
  const keys = input.missing ? cleanCertificateKeys(input.missing) : certificateKeysFromReasons(input.reasons ?? []);
  return missingCertificatesNotice(keys, locale, input.other ?? null);
}

/** One line per required certificate, with whether this worker has it (null = unknown). */
export function requiredCertificateRows(
  required: RequiredCertificatesView | undefined,
  missing: readonly string[] | null,
  locale: Locale
): ReadonlyArray<Readonly<{ key: RequiredCertificateKey; label: string; state: "have" | "missing" | "staff" | null }>> {
  const keys = cleanCertificateKeys(required?.keys);
  const missingSet = new Set(cleanCertificateKeys(missing));
  return keys.map((key) => ({
    key,
    label: certificateLabel(key, locale, required?.other ?? null),
    state: missing === null ? null : key === "other" ? "staff" : missingSet.has(key) ? "missing" : "have"
  }));
}

/** Short list of required certificate names for a job card chip. */
export function certificateChipText(required: RequiredCertificatesView | undefined, locale: Locale): string | null {
  const keys = cleanCertificateKeys(required?.keys);
  if (keys.length === 0) return null;
  return keys.map((k) => certificateLabel(k, locale, required?.other ?? null)).join(locale === "ar" ? "، " : ", ");
}
