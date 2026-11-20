// Advisory AI document review (worker side). PURE domain: decide which document types may be read by
// the AI vs must be verified by a human, and shape the advisory verdict. No AI call, no I/O here.
//
// Privacy rule (QC, launch step 6): NO document image is ever sent to an AI provider, of any type.
// Identity, SIN, licence, certificate, first-aid card, CV and photo files show a name, an address, a
// birth date or a face, and an image cannot be masked. So no document type is AI-reviewable: the
// pre-check is offline and text-only (our own record of the type and expiry) and never opens the file.
// Sensitive identity/financial types return "human verification required" with reason
// "sensitive_type"; every other type (CV, photo, certificate, first aid, unknown) returns "a person
// checks it". The governed accept/reject decision always belongs to a platform HR admin.

export type DocumentAiStatus =
  | "ai_approved" // advisory: the model (or offline pre-check) found nothing wrong
  | "needs_reupload" // unreadable / wrong type / expired — ask the worker to re-upload
  | "human_required" // sensitive type, or model unavailable — a human must verify
  ;

export type DocumentAiVerdict = Readonly<{
  status: DocumentAiStatus;
  advisory: true; // ALWAYS advisory — never a legal verification
  reason: string; // short machine reason code, not shown raw to the user
  source: "claude" | "offline"; // which path produced the verdict
}>;

// Document types that must NOT be sent to an AI provider and always need a human (identity/financial).
const SENSITIVE_DOC_TYPES: ReadonlySet<string> = new Set([
  "identity",
  "sin",
  "licence", // driver's licence — government ID
  "work_authorization",
  "qc_healthcare_doc",
  "void_cheque"
]);

// Document types an AI may read. Deliberately EMPTY (audit G2, owner rule "no phone, address or
// health information to an outside AI"): cv, photo, certificate and first_aid were removed because
// their images show personal data. Keep it empty; a type may only be added here if its content can be
// sent as masked text, never as an image.
const AI_REVIEWABLE_DOC_TYPES: ReadonlySet<string> = new Set<string>([]);

export function isSensitiveDocType(documentType: string): boolean {
  return SENSITIVE_DOC_TYPES.has(documentType);
}

export function isAiReviewableDocType(documentType: string): boolean {
  return AI_REVIEWABLE_DOC_TYPES.has(documentType);
}

/** Offline, privacy-safe advisory verdict — no file content is read. The only verdict used since launch
 *  step 6. Honest: it never claims the content was verified. */
export function offlineAdvisoryVerdict(documentType: string, opts?: { expired?: boolean }): DocumentAiVerdict {
  if (opts?.expired) {
    return { status: "needs_reupload", advisory: true, reason: "expired", source: "offline" };
  }
  if (isSensitiveDocType(documentType)) {
    return { status: "human_required", advisory: true, reason: "sensitive_type", source: "offline" };
  }
  if (isAiReviewableDocType(documentType)) {
    // Unreachable while the list is empty; kept so a future text-only type still ends with a person.
    return { status: "ai_approved", advisory: true, reason: "offline_precheck", source: "offline" };
  }
  return { status: "human_required", advisory: true, reason: "person_checks", source: "offline" };
}

/** What a person may be shown. An offline pass means no file was read, so it must never read as an
 *  approval; it goes to a human instead. */
export function presentableVerdict(verdict: DocumentAiVerdict): DocumentAiVerdict {
  return verdict.source === "offline" && verdict.status === "ai_approved"
    ? { ...verdict, status: "human_required", reason: "not_read" }
    : verdict;
}

/** Map a free-form model answer ("APPROVE" / "REUPLOAD" / "HUMAN") to a verdict. Defaults to the
 *  safe side (human_required) when the answer is unrecognized. */
export function parseModelVerdict(answer: string, documentType: string): DocumentAiVerdict {
  const a = answer.trim().toUpperCase();
  if (a.startsWith("APPROVE")) return { status: "ai_approved", advisory: true, reason: "model_approve", source: "claude" };
  if (a.startsWith("REUPLOAD")) return { status: "needs_reupload", advisory: true, reason: "model_reupload", source: "claude" };
  return offlineAdvisoryVerdict(documentType); // HUMAN or anything unexpected -> safe default
}
