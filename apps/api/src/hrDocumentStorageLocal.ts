import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import type { DocumentStorageProvider } from "@rwos/auth";
import type { PrivateObjectStore } from "./documentUpload";

// Real, disk-backed HR-document storage provider (replaces the fixture that handed out a fake
// `fixture-storage.local` URL). References are opaque, namespaced per worker, and HMAC-signed so the
// upload endpoint can trust a reference without a DB round-trip. Bytes are written to a private
// object store (a local disk directory on the mounted persistent disk). The browser never talks to
// the store directly: it PUTs to the worker BFF (same-origin), which forwards the bytes to the API.
//
// ref format: `<workerIdentityId>/<sanitizedType>/<uuid>` — workerIdentityId and the uuid are both
// UUIDs, the type is a short [a-z0-9_] slug, so a reference can never contain path-traversal.
const REF_RE = /^[0-9a-fA-F][0-9a-fA-F-]{7,}\/[a-z0-9_]{1,40}\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export type LocalHrDocumentStorageProvider = DocumentStorageProvider & {
  // Extra surface the API's blob route uses (not part of the provider seam).
  verifyUploadSignature(ref: string, sig: string): boolean;
  objectKey(ref: string): string;
  saveFileInfo(ref: string, info: { fileName: string | null; contentType: string }): Promise<void>;
  readonly store: PrivateObjectStore;
  isValidReference(ref: string): boolean;
};

export function createLocalHrDocumentStorageProvider(options: {
  store: PrivateObjectStore;
  secret: string;
  name?: string;
}): LocalHrDocumentStorageProvider {
  if (!options.secret || options.secret.length < 32) {
    throw new Error("HR document storage secret is required (>= 32 chars).");
  }
  const sign = (scope: "up" | "dl", ref: string) =>
    createHmac("sha256", options.secret).update(`${scope}:${ref}`).digest("hex");
  const verify = (scope: "up" | "dl", ref: string, sig: string) => {
    if (typeof sig !== "string" || !/^[a-f0-9]{64}$/u.test(sig)) return false;
    const expected = Buffer.from(sign(scope, ref), "hex");
    const supplied = Buffer.from(sig, "hex");
    return expected.length === supplied.length && timingSafeEqual(expected, supplied);
  };
  const objectKey = (ref: string) => `hr/${ref}`;
  const infoKey = (ref: string) => `${objectKey(ref)}.meta`;

  return {
    name: options.name ?? "local-hr",
    store: options.store,
    isValidReference: (ref) => typeof ref === "string" && REF_RE.test(ref),
    objectKey,
    async saveFileInfo(ref, info) {
      const bytes = new TextEncoder().encode(JSON.stringify(info));
      await options.store.put({ key: infoKey(ref), bytes });
    },
    async describe({ storageReference }) {
      if (!REF_RE.test(storageReference)) return null;
      const bytes = await options.store.get(infoKey(storageReference));
      if (!bytes) return null;
      try {
        const info = JSON.parse(new TextDecoder().decode(bytes)) as { fileName?: unknown; contentType?: unknown };
        return {
          fileName: typeof info.fileName === "string" ? info.fileName : null,
          contentType: typeof info.contentType === "string" ? info.contentType : null
        };
      } catch {
        return null;
      }
    },
    verifyUploadSignature: (ref, sig) => REF_RE.test(ref) && verify("up", ref, sig),
    async createUploadReference({ workerIdentityId, documentType }) {
      const safeType = (documentType || "document").replace(/[^a-z0-9_]/giu, "").slice(0, 40) || "document";
      const ref = `${workerIdentityId}/${safeType}/${randomUUID()}`;
      const sig = sign("up", ref);
      // Relative, same-origin path: the worker BFF proxies the bytes to the API.
      return { storageReference: ref, uploadUrl: `/api/documents/blob?ref=${encodeURIComponent(ref)}&sig=${sig}` };
    },
    async resolveDownloadUrl({ storageReference }) {
      if (!REF_RE.test(storageReference)) return null;
      const sig = sign("dl", storageReference);
      return {
        url: `/api/documents/blob?ref=${encodeURIComponent(storageReference)}&dl=${sig}`,
        expiresInSeconds: 300
      };
    },
    async verifyReference({ storageReference, workerIdentityId }) {
      // A reference must be well-formed, belong to this worker's namespace, AND have a stored object
      // (so a worker cannot record a document whose bytes were never uploaded).
      if (!REF_RE.test(storageReference)) return false;
      if (!storageReference.startsWith(`${workerIdentityId}/`)) return false;
      return (await options.store.get(objectKey(storageReference))) !== null;
    }
  };
}

// Content types accepted for a worker's compliance documents. Deliberately excludes HTML/SVG/scripts
// and executables. Kept broad enough for real certificates (PDF, images, office docs, plain text).
export const ALLOWED_HR_DOCUMENT_CONTENT_TYPES: ReadonlySet<string> = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
  "image/tiff",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.oasis.opendocument.text"
]);

export const MAX_HR_DOCUMENT_BYTES = 10 * 1024 * 1024; // 10 MB

// Keep a display name only: no folders, control characters or header-breaking quotes.
export function sanitizeHrDocumentFileName(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const base = raw.split(/[\\/]/u).pop() ?? "";
  const clean = base.replace(/[\p{Cc}"]/gu, "").trim().slice(0, 120);
  return clean.length > 0 && clean !== "." && clean !== ".." ? clean : null;
}

// Detect from the bytes themselves, never the uploaded label, whether a browser may open a file
// directly. Everything else is only ever offered as a download.
export function detectViewableHrDocumentType(bytes: Uint8Array): string | null {
  const starts = (...head: number[]) => head.every((b, i) => bytes[i] === b);
  if (starts(0x25, 0x50, 0x44, 0x46, 0x2d)) return "application/pdf";
  if (starts(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return "image/png";
  if (starts(0xff, 0xd8, 0xff)) return "image/jpeg";
  if (starts(0x47, 0x49, 0x46, 0x38)) return "image/gif";
  if (starts(0x52, 0x49, 0x46, 0x46) && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) return "image/webp";
  return null;
}
