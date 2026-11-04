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

  return {
    name: options.name ?? "local-hr",
    store: options.store,
    isValidReference: (ref) => typeof ref === "string" && REF_RE.test(ref),
    objectKey,
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
