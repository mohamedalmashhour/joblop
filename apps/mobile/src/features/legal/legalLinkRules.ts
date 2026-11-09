// Pure helpers for the app's Terms / Privacy / "Delete my account" links and the sign-up consent
// gate (no React, so they are unit-tested directly). The pages live on the worker website.
import { LEGAL_DOCUMENTS_VERSION } from "@rwos/shared";
import type { Locale } from "../../i18n/strings";

export const DEFAULT_WORKER_ORIGIN = "https://joblop.com";

/** The worker website, from EXPO_PUBLIC_RWOS_WORKER_ORIGIN when it is a valid https URL. */
export function workerOrigin(value: string | undefined): string {
  const trimmed = (value ?? "").trim().replace(/\/+$/, "");
  return /^https:\/\/[^\s/]+/i.test(trimmed) ? trimmed : DEFAULT_WORKER_ORIGIN;
}

export const LEGAL_PAGES = ["terms", "privacy", "account-deletion"] as const;
export type LegalPage = (typeof LEGAL_PAGES)[number];

/** The website page in the app's language (the site reads ?lang=en|fr|ar). */
export function legalUrl(origin: string, page: LegalPage, locale: Locale): string {
  return `${origin}/${page}?lang=${locale}`;
}

/** Sign-up stays blocked until the Terms/Privacy box is ticked. */
export function canCreateAccount(accepted: boolean): boolean {
  return accepted === true;
}

/** The version the person accepts by ticking the box; sent with the sign-up request. */
export const ACCEPTED_LEGAL_VERSION = LEGAL_DOCUMENTS_VERSION;
