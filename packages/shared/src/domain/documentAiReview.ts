// Advisory AI document review (worker side). PURE domain: decide which document types may be read by
// the AI vs must be verified by a human, and shape the advisory verdict. No AI call, no I/O here.
//
// Privacy rule (QC): sensitive identity/financial documents are NEVER sent to an AI provider. They
// always return "human verification required". Only low-sensitivity documents (CV, certificate,
// photo, first-aid) may be read by the vision model, and even then the result is ADVISORY — the
// governed accept/reject decision still belongs to a platform HR admin.

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

// Low-sensitivity types the AI may read to give an advisory verdict.
const AI_REVIEWABLE_DOC_TYPES: ReadonlySet<string> = new Set([
  "cv",
  "certificate",
  "photo",
  "first_aid"
]);

export function isSensitiveDocType(documentType: string): boolean {
  return SENSITIVE_DOC_TYPES.has(documentType);
}

export function isAiReviewableDocType(documentType: string): boolean {
  return AI_REVIEWABLE_DOC_TYPES.has(documentType);
}

/** Offline, privacy-safe advisory verdict — no file content is read. Used when the AI provider is not
 *  configured, and for every sensitive type. Honest: it never claims the content was verified. */
export function offlineAdvisoryVerdict(documentType: string, opts?: { expired?: boolean }): DocumentAiVerdict {
  if (opts?.expired) {
    return { status: "needs_reupload", advisory: true, reason: "expired", source: "offline" };
  }
  if (isSensitiveDocType(documentType)) {
    return { status: "human_required", advisory: true, reason: "sensitive_type", source: "offline" };
  }
  if (isAiReviewableDocType(documentType)) {
    return { status: "ai_approved", advisory: true, reason: "offline_precheck", source: "offline" };
  }
  return { status: "human_required", advisory: true, reason: "unknown_type", source: "offline" };
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
