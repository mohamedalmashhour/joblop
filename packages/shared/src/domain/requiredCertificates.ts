// Required certificates an employer can ask for on a job (owner rule: "any job asking for a
// certificate, whoever applies must have that certificate").
//
// The list is data, not law: each key names a certificate and the worker document types that prove
// it. A worker "holds" a certificate when a document of one of those types (or one staff marked as
// that certificate when verifying it) is accepted by staff and not expired when the job starts.
//
// "other" is free text written by the employer. No document type can prove it automatically, so it
// is never met by the automatic paths (claim, auto-offer, accepting an offer without staff approval):
//   - short-term jobs: staff check it by hand and approve the worker with the logged certificate
//     override on the offer or the assignment;
//   - long-term jobs: the employer hires directly and checks it with the candidate.

export const REQUIRED_CERTIFICATE_KEYS = [
  "pab",
  "rcr_first_aid",
  "oiiq_nurse",
  "oiiaq_nursing_assistant",
  "mapaq_food_handler",
  "asp_construction",
  "forklift",
  "whmis",
  "racj_alcohol",
  "driver_class5",
  "other"
] as const;

export type RequiredCertificateKey = (typeof REQUIRED_CERTIFICATE_KEYS)[number];
export type ListedCertificateKey = Exclude<RequiredCertificateKey, "other">;

export const OTHER_CERTIFICATE_MAX_LENGTH = 120;

// Worker document types that prove each certificate. The first one is the type the worker picks on
// the Documents page for that certificate.
export const CERTIFICATE_DOCUMENT_TYPES: Readonly<Record<ListedCertificateKey, readonly string[]>> = {
  pab: ["cert_pab"],
  rcr_first_aid: ["cert_rcr_first_aid", "first_aid"],
  oiiq_nurse: ["cert_oiiq_nurse"],
  oiiaq_nursing_assistant: ["cert_oiiaq_nursing_assistant"],
  mapaq_food_handler: ["cert_mapaq_food_handler"],
  asp_construction: ["cert_asp_construction"],
  forklift: ["cert_forklift"],
  whmis: ["cert_whmis"],
  racj_alcohol: ["cert_racj_alcohol"],
  driver_class5: ["cert_driver_class5"]
};

type Labels = Readonly<{ en: string; fr: string; ar: string }>;

export const CERTIFICATE_LABELS: Readonly<Record<RequiredCertificateKey, Labels>> = {
  pab: {
    en: "PAB certificate (orderly / préposé aux bénéficiaires)",
    fr: "Certificat PAB (préposé aux bénéficiaires)",
    ar: "شهادة PAB (مساعد رعاية المستفيدين)"
  },
  rcr_first_aid: {
    en: "CPR / first aid card",
    fr: "Carte RCR / premiers soins",
    ar: "بطاقة الإنعاش القلبي / الإسعافات الأولية"
  },
  oiiq_nurse: {
    en: "Nurse licence (OIIQ)",
    fr: "Permis d'infirmière ou d'infirmier (OIIQ)",
    ar: "رخصة ممرض/ممرضة (OIIQ)"
  },
  oiiaq_nursing_assistant: {
    en: "Nursing assistant licence (OIIAQ)",
    fr: "Permis d'infirmière ou d'infirmier auxiliaire (OIIAQ)",
    ar: "رخصة ممرض/ممرضة مساعد (OIIAQ)"
  },
  mapaq_food_handler: {
    en: "Food handler certificate (MAPAQ)",
    fr: "Certificat de manipulateur d'aliments (MAPAQ)",
    ar: "شهادة متداول الأغذية (MAPAQ)"
  },
  asp_construction: {
    en: "Construction safety card (ASP Construction, CCQ)",
    fr: "Carte ASP Construction (CCQ)",
    ar: "بطاقة السلامة في البناء (ASP Construction، CCQ)"
  },
  forklift: {
    en: "Forklift operator card",
    fr: "Carte de cariste (chariot élévateur)",
    ar: "بطاقة سائق الرافعة الشوكية"
  },
  whmis: {
    en: "WHMIS training",
    fr: "Formation SIMDUT",
    ar: "تدريب WHMIS / SIMDUT"
  },
  racj_alcohol: {
    en: "Alcohol service training (RACJ)",
    fr: "Formation service de boissons alcoolisées (RACJ)",
    ar: "تدريب تقديم المشروبات الكحولية (RACJ)"
  },
  driver_class5: {
    en: "Driver's licence, class 5",
    fr: "Permis de conduire classe 5",
    ar: "رخصة قيادة الفئة 5"
  },
  other: {
    en: "Other certificate",
    fr: "Autre certificat",
    ar: "شهادة أخرى"
  }
};

export type CertificateLanguage = "en" | "fr" | "ar";

export function certificateLanguage(locale: string | null | undefined): CertificateLanguage {
  const v = (locale ?? "").toLowerCase();
  if (v.startsWith("ar")) return "ar";
  if (v.startsWith("fr")) return "fr";
  return "en";
}

export function isRequiredCertificateKey(value: unknown): value is RequiredCertificateKey {
  return typeof value === "string" && (REQUIRED_CERTIFICATE_KEYS as readonly string[]).includes(value);
}

/** Every worker document type that proves some listed certificate. */
export function certificateDocumentTypes(): readonly string[] {
  return [...new Set(Object.values(CERTIFICATE_DOCUMENT_TYPES).flat())];
}

/** The listed certificate a document type proves, or null. */
export function certificateKeyForDocumentType(documentType: string): ListedCertificateKey | null {
  for (const [key, types] of Object.entries(CERTIFICATE_DOCUMENT_TYPES) as [ListedCertificateKey, readonly string[]][]) {
    if (types.includes(documentType)) return key;
  }
  return null;
}

export type RequiredCertificates = Readonly<{
  keys: readonly RequiredCertificateKey[];
  /** Free text for "other" (null unless "other" is in keys). */
  other: string | null;
}>;

export const NO_REQUIRED_CERTIFICATES: RequiredCertificates = { keys: [], other: null };

/**
 * Read what an employer sent. Unknown keys, duplicates and an "other" with no text are refused
 * (null), so a typo never silently drops a requirement. Absent input means "none".
 */
export function parseRequiredCertificates(input: unknown, otherInput?: unknown): RequiredCertificates | null {
  if (input === undefined || input === null) {
    return otherInput === undefined || otherInput === null || otherInput === "" ? NO_REQUIRED_CERTIFICATES : null;
  }
  if (!Array.isArray(input) || input.length > REQUIRED_CERTIFICATE_KEYS.length) return null;
  const keys: RequiredCertificateKey[] = [];
  for (const value of input) {
    if (!isRequiredCertificateKey(value) || keys.includes(value)) return null;
    keys.push(value);
  }
  const otherText = typeof otherInput === "string" ? otherInput.trim().replace(/\s+/g, " ") : "";
  if (keys.includes("other")) {
    if (!otherText || otherText.length > OTHER_CERTIFICATE_MAX_LENGTH) return null;
    return { keys: sortKeys(keys), other: otherText };
  }
  if (otherText) return null;
  return { keys: sortKeys(keys), other: null };
}

function sortKeys(keys: readonly RequiredCertificateKey[]): RequiredCertificateKey[] {
  return [...keys].sort((a, b) => REQUIRED_CERTIFICATE_KEYS.indexOf(a) - REQUIRED_CERTIFICATE_KEYS.indexOf(b));
}

/**
 * Read the stored columns back. Unknown stored values are dropped; a stored "other" stays required
 * even without its text (fail closed).
 */
export function storedRequiredCertificates(row: Readonly<{ requiredCertificates?: readonly string[] | null; requiredCertificateOther?: string | null }>): RequiredCertificates {
  const keys = sortKeys([...new Set((row.requiredCertificates ?? []).filter(isRequiredCertificateKey))]);
  const other = keys.includes("other") ? row.requiredCertificateOther?.trim() || null : null;
  return { keys, other };
}

export type HeldCertificateDocument = Readonly<{
  documentType: string;
  /** Set by staff when verifying a generic document as a specific certificate. */
  verifiedCertificateKey?: string | null;
  status: string;
  expiresAt: Date | string | null;
}>;

/**
 * The listed certificates a worker holds at `validAt`: an accepted document of a proving type (or
 * staff-verified as that certificate) with no expiry or an expiry after `validAt`.
 */
export function heldCertificateKeys(documents: readonly HeldCertificateDocument[], validAt: Date): Set<ListedCertificateKey> {
  const held = new Set<ListedCertificateKey>();
  for (const doc of documents) {
    if (doc.status !== "accepted") continue;
    if (doc.expiresAt !== null && new Date(doc.expiresAt).getTime() <= validAt.getTime()) continue;
    const byType = certificateKeyForDocumentType(doc.documentType);
    if (byType) held.add(byType);
    if (doc.verifiedCertificateKey && isRequiredCertificateKey(doc.verifiedCertificateKey) && doc.verifiedCertificateKey !== "other") {
      held.add(doc.verifiedCertificateKey);
    }
  }
  return held;
}

/**
 * The required certificates a worker is missing. "other" is always listed as missing when required:
 * only a person (staff, or the hiring employer on a long-term job) can check it.
 */
export function missingCertificates(required: RequiredCertificates, documents: readonly HeldCertificateDocument[], validAt: Date): RequiredCertificateKey[] {
  if (required.keys.length === 0) return [];
  const held = heldCertificateKeys(documents, validAt);
  return required.keys.filter((key) => key === "other" || !held.has(key));
}

/** Eligibility reason code for one missing certificate ("missing_certificate:pab"). */
export function missingCertificateReason(key: RequiredCertificateKey): string {
  return `missing_certificate:${key}`;
}

/** The certificate keys inside a list of eligibility reasons. */
export function certificateKeysFromReasons(reasons: readonly string[]): RequiredCertificateKey[] {
  return reasons
    .filter((r) => r.startsWith("missing_certificate:"))
    .map((r) => r.slice("missing_certificate:".length))
    .filter(isRequiredCertificateKey);
}

/** One certificate's label; "other" shows the employer's own text when there is one. */
export function certificateLabel(key: RequiredCertificateKey, locale: string | null | undefined, other?: string | null): string {
  const lang = certificateLanguage(locale);
  if (key === "other" && other) return other;
  return CERTIFICATE_LABELS[key][lang];
}

/**
 * The worker notice: "This job needs: PAB certificate. Add it on your Documents page." For "other"
 * the worker is told Joblop staff check it by hand.
 */
export function missingCertificatesNotice(missing: readonly RequiredCertificateKey[], locale: string | null | undefined, other?: string | null): string | null {
  if (missing.length === 0) return null;
  const lang = certificateLanguage(locale);
  const listed = missing.filter((k) => k !== "other").map((k) => certificateLabel(k, lang));
  const needsStaff = missing.includes("other");
  const otherLabel = other ?? CERTIFICATE_LABELS.other[lang];
  const parts: string[] = [];
  if (listed.length > 0) {
    const names = listed.join(lang === "ar" ? "، " : ", ");
    parts.push(
      lang === "fr"
        ? `Cet emploi exige : ${names}. Ajoutez-le dans votre page Documents.`
        : lang === "ar"
          ? `تتطلب هذه الوظيفة: ${names}. أضِفها في صفحة المستندات.`
          : `This job needs: ${names}. Add it on your Documents page.`
    );
  }
  if (needsStaff) {
    parts.push(
      lang === "fr"
        ? `Cet emploi exige aussi : ${otherLabel}. Ajoutez-le dans votre page Documents; l'équipe Joblop le vérifie à la main.`
        : lang === "ar"
          ? `تتطلب هذه الوظيفة أيضاً: ${otherLabel}. أضِفها في صفحة المستندات؛ يتحقق منها فريق جوب‑لوب يدوياً.`
          : `This job also needs: ${otherLabel}. Add it on your Documents page; the Joblop team checks it by hand.`
    );
  }
  return parts.join(" ");
}
