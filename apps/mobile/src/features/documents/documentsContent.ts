// Pure rules for the Documents screen — the same lists and limits as the website's Documents page
// (apps/worker/app/documents/MyDocuments.tsx): the document types, the certificate types an employer
// can require (cert_*), the accepted files (10 MB) and the status / profile-rating words.
import {
  CERTIFICATE_DOCUMENT_TYPES,
  certificateKeyForDocumentType,
  certificateLabel,
  type ListedCertificateKey
} from "@rwos/shared";
import type { WorkerDocument } from "../../auth/secureSession";
import type { Locale } from "../../i18n/strings";

export const DOCUMENT_TYPES: ReadonlyArray<Readonly<{ value: string; labelKey: string }>> = [
  { value: "work_authorization", labelKey: "doc.typeWorkAuth" },
  { value: "identity", labelKey: "doc.typeIdentity" },
  { value: "cv", labelKey: "doc.typeCv" },
  { value: "licence", labelKey: "doc.typeLicence" },
  { value: "certificate", labelKey: "doc.typeCertificate" },
  { value: "photo", labelKey: "doc.typePhoto" },
  { value: "first_aid", labelKey: "doc.typeFirstAid" },
  { value: "qc_healthcare_doc", labelKey: "doc.typeQcHealth" },
  { value: "sin", labelKey: "doc.typeSin" },
  { value: "void_cheque", labelKey: "doc.typeVoidCheque" }
];

const TYPE_LABEL_KEY: Readonly<Record<string, string>> = Object.fromEntries(DOCUMENT_TYPES.map((d) => [d.value, d.labelKey]));

/** One document type per certificate an employer can require (its first proving type, cert_*). */
export const CERTIFICATE_TYPES: ReadonlyArray<Readonly<{ value: string; key: ListedCertificateKey }>> = (
  Object.entries(CERTIFICATE_DOCUMENT_TYPES) as [ListedCertificateKey, readonly string[]][]
)
  .filter(([, types]) => !DOCUMENT_TYPES.some((d) => d.value === types[0]))
  .map(([key, types]) => ({ value: types[0]!, key }));

/** The label of a document type in the worker's language (website words, or the certificate name). */
export function documentTypeLabel(documentType: string, locale: Locale, t: (key: string) => string): string {
  const key = TYPE_LABEL_KEY[documentType];
  if (key) return t(key);
  const cert = certificateKeyForDocumentType(documentType);
  return cert ? certificateLabel(cert, locale) : documentType;
}

const STATUS_KEY: Readonly<Record<string, string>> = {
  submitted: "doc.statusSubmitted",
  under_review: "doc.statusUnderReview",
  accepted: "doc.statusAccepted",
  rejected: "doc.statusRejected",
  expiring: "doc.statusExpiring",
  expired: "doc.statusExpired",
  superseded: "doc.statusSuperseded",
  revoked: "doc.statusRevoked",
  required: "doc.statusRequired"
};

export function documentStatusKey(status: string): string {
  return STATUS_KEY[status] ?? "doc.statusRequired";
}

export function documentStatusTone(status: string): "neutral" | "success" | "warning" | "danger" {
  if (status === "accepted") return "success";
  if (status === "submitted" || status === "under_review" || status === "expiring") return "warning";
  if (status === "expired" || status === "rejected" || status === "revoked") return "danger";
  return "neutral";
}

/** Documents still on the list (replaced and deleted ones are hidden, as on the website). */
export function activeDocuments(documents: readonly WorkerDocument[]): WorkerDocument[] {
  return documents.filter((d) => d.effectiveStatus !== "superseded" && d.effectiveStatus !== "revoked");
}

export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const MAX_CERTIFICATES = 6;

// Mirrors the API's allowlist, so a worker hears why a file is refused before uploading.
const FILE_TYPES: Readonly<Record<string, string>> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  heic: "image/heic",
  heif: "image/heif",
  tif: "image/tiff",
  tiff: "image/tiff",
  txt: "text/plain",
  doc: "application/msword",
  odt: "application/vnd.oasis.opendocument.text",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
};

export const PICKER_TYPES: readonly string[] = [...new Set(Object.values(FILE_TYPES))];

/** The file's real type (falls back to the extension, as some phones leave it empty), or null. */
export function allowedFileType(name: string, mimeType: string | null | undefined): string | null {
  if (mimeType && Object.values(FILE_TYPES).includes(mimeType)) return mimeType;
  return FILE_TYPES[name.split(".").pop()?.toLowerCase() ?? ""] ?? null;
}

/** "2026-12-31T00:00:00Z" → the date in the worker's language. */
export function formatExpiry(iso: string, formatLocale: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso.slice(0, 10);
  try {
    return date.toLocaleDateString(formatLocale, { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });
  } catch {
    return iso.slice(0, 10);
  }
}
