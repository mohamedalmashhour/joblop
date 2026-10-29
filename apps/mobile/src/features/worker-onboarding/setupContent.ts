// Pure copy + helpers for the real worker setup (pay-channel classification election). UI-free so the
// choice explanations and agreement selection are unit-tested without React Native.

export type Classification = "employee" | "contractor";

export const classificationOptions: readonly Readonly<{ id: Classification; title: string; summary: string; detail: string }>[] = [
  {
    id: "employee",
    title: "Employee",
    summary: "Paid through payroll (T4).",
    detail: "Source deductions (tax, QPP, EI, QPIP) are withheld and remitted for you; you get a T4 and employee protections. You're paid net."
  },
  {
    id: "contractor",
    title: "Independent contractor",
    summary: "Paid your gross fee (T4A).",
    detail: "You're paid gross and you handle your own taxes and remittances; you get a T4A. If GST/QST-registered, you can declare it later."
  }
];

/** The current signed agreement version for the chosen channel, from the server-provided versions. */
export function agreementVersionFor(classification: Classification, versions: Readonly<{ employee: string; contractor: string }>): string {
  return classification === "employee" ? versions.employee : versions.contractor;
}

export function classificationLabel(classification: string): string {
  return classification === "employee" ? "Employee (T4)" : classification === "contractor" ? "Independent contractor (T4A)" : classification;
}

export const setupCopy = {
  title: "Get set up",
  intro: "Before you can apply to shifts and receive offers, choose how you'll be paid and sign the matching agreement. This is a legal election — it's recorded and signed, and it doesn't calculate or move any money.",
  signInRequired: "Sign in to set up your pay channel.",
  loadError: "Your setup status could not be loaded right now.",
  chooseCta: "Choose how you'll be paid",
  acceptPrefix: "I have read and accept the",
  acceptSuffix: "agreement",
  submitCta: "Confirm & sign",
  successTitle: "You're set up",
  alreadyNote: "You can apply to open shifts and receive offers.",
  staleNote: "The agreement was updated. Reload and accept the current version.",
  invalidNote: "Choose a pay channel and accept its agreement to continue.",
  deniedNote: "Sign in required.",
  submitError: "Your election couldn't be submitted right now."
} as const;
