import { createHash, randomUUID } from "node:crypto";
import { lstat, mkdir, open, readFile, unlink } from "node:fs/promises";
import { resolve, sep } from "node:path";
import {
  createMemoryDocumentMetadataRepository,
  type DocumentMetadataRepository
} from "./documentUploadRepository";

export const documentStates = [
  "quarantined",
  "scan_error",
  "infected",
  "clean",
  "approved",
  "rejected",
  "replaced",
  "expired",
  "deleted"
] as const;
export type DocumentState = (typeof documentStates)[number];
export type DocumentRole = "worker" | "employer_admin" | "platform_admin";
export type DocumentType = "worker_certification" | "employer_contract" | "invoice_support";

export type StoredDocument = Readonly<{
  id: string;
  organizationId: string;
  ownerId: string;
  type: DocumentType;
  originalFilename: string;
  objectKey: string;
  contentType: string;
  size: number;
  digest: string;
  state: DocumentState;
  version: number;
  replacementForId: string | null;
  createdAt: string;
  expiresAt: string | null;
}>;

export type DocumentAudit = Readonly<{
  sequence: number;
  documentId: string;
  organizationId: string;
  action: string;
  actorId: string;
  fromState: DocumentState | null;
  toState: DocumentState;
  occurredAt: string;
}>;

export interface PrivateObjectStore {
  put(input: Readonly<{ key: string; bytes: Uint8Array }>): Promise<void>;
  get(key: string): Promise<Uint8Array | null>;
  delete(key: string): Promise<void>;
}

export interface MalwareScanner {
  scan(input: Readonly<{ bytes: Uint8Array; digest: string }>): Promise<"clean" | "infected" | "error">;
}

export function createMemoryPrivateObjectStore(): PrivateObjectStore {
  const objects = new Map<string, Uint8Array>();
  return {
    async put({ key, bytes }) {
      if (objects.has(key)) throw new Error("Document object already exists.");
      objects.set(key, Uint8Array.from(bytes));
    },
    async get(key) {
      const bytes = objects.get(key);
      return bytes ? Uint8Array.from(bytes) : null;
    },
    async delete(key) {
      objects.delete(key);
    }
  };
}

// Every key shape the disk store accepts. Neither allows dots or empty segments, so no key can
// traverse out of the storage root. `hr/` is `hr/<workerIdentityId>/<documentType>/<uuid>`.
const OBJECT_KEY_PATTERNS = [
  /^quarantine\/[A-Za-z0-9-]{1,64}\/[A-Za-z0-9-]{1,64}$/u,
  /^hr\/[0-9a-fA-F-]{8,64}\/[a-z0-9_]{1,40}\/[0-9a-f-]{36}$/u
];

export function createLocalPrivateFileObjectStore(rootDirectory: string): PrivateObjectStore {
  const root = resolve(rootDirectory);
  const objectPath = (key: string) => {
    if (!OBJECT_KEY_PATTERNS.some((pattern) => pattern.test(key))) {
      throw new Error("Document object key is invalid.");
    }
    const target = resolve(root, key);
    if (!target.startsWith(`${root}${sep}`)) throw new Error("Document object key escapes storage root.");
    return target;
  };
  return {
    async put({ key, bytes }) {
      const target = objectPath(key);
      await mkdir(resolve(target, ".."), { recursive: true, mode: 0o700 });
      const handle = await open(target, "wx", 0o600);
      try {
        await handle.writeFile(bytes);
      } finally {
        await handle.close();
      }
    },
    async get(key) {
      const target = objectPath(key);
      try {
        const metadata = await lstat(target);
        if (!metadata.isFile() || metadata.isSymbolicLink()) {
          throw new Error("Document object is not a private regular file.");
        }
        return new Uint8Array(await readFile(target));
      } catch (error) {
        if (isMissingFile(error)) return null;
        throw error;
      }
    },
    async delete(key) {
      const target = objectPath(key);
      try {
        const metadata = await lstat(target);
        if (!metadata.isFile() || metadata.isSymbolicLink()) {
          throw new Error("Document object is not a private regular file.");
        }
        await unlink(target);
      } catch (error) {
        if (!isMissingFile(error)) throw error;
      }
    }
  };
}

export function createFakeMalwareScanner(
  result: "clean" | "infected" | "error" = "clean"
): MalwareScanner {
  return { async scan() { return result; } };
}

export function createLocalDocumentService(options: {
  store: PrivateObjectStore;
  scanner: MalwareScanner;
  now: () => string;
  referenceSecret: string;
  maxBytes?: number;
  maxDocumentsPerOwner?: number;
  metadata?: DocumentMetadataRepository;
}) {
  if (options.referenceSecret.length < 16) throw new Error("Document reference secret is required.");
  const maxBytes = options.maxBytes ?? 10 * 1024 * 1024;
  const maxDocumentsPerOwner = options.maxDocumentsPerOwner ?? 20;
  const metadata = options.metadata ?? createMemoryDocumentMetadataRepository();

  async function requireDocument(id: string, organizationId: string) {
    const document = await metadata.find(id, organizationId);
    if (!document) {
      throw new Error("Document is outside the authorized organization.");
    }
    return document;
  }

  async function update(
    document: StoredDocument,
    state: DocumentState,
    expectedVersion: number,
    action: string,
    actorId: string
  ) {
    return metadata.transition({
      documentId: document.id,
      organizationId: document.organizationId,
      expectedVersion,
      fromStates: [document.state],
      toState: state,
      action,
      actorId,
      occurredAt: options.now()
    });
  }

  return {
    async upload(input: {
      organizationId: string;
      ownerId: string;
      actorId: string;
      role: DocumentRole;
      type: DocumentType;
      filename: string;
      declaredContentType: string;
      bytes: Uint8Array;
      idempotencyKey: string;
      replacementForId?: string;
    }) {
      authorizeUpload(input.role, input.type, input.actorId, input.ownerId);
      const filename = safeFilename(input.filename);
      if (input.bytes.byteLength === 0 || input.bytes.byteLength > maxBytes) {
        throw new Error("Document size is outside the allowed range.");
      }
      const detected = detectType(input.bytes);
      if (!detected || detected.contentType !== input.declaredContentType || !detected.extensions.has(extension(filename))) {
        throw new Error("Document content does not match an allowed file type.");
      }
      const activeCount = await metadata.countActive(input.organizationId, input.ownerId);
      if (activeCount >= maxDocumentsPerOwner) throw new Error("Document count limit reached.");
      if (input.replacementForId) await requireDocument(input.replacementForId, input.organizationId);

      const digest = sha256(input.bytes);
      const uploadKeyDigest = sha256Text(input.idempotencyKey);
      const requestDigest = sha256Text(
        [input.ownerId, input.type, filename, digest, input.replacementForId ?? ""].join(":")
      );
      const replay = await metadata.findByUploadKey(input.organizationId, uploadKeyDigest);
      if (replay) {
        if (
          replay.ownerId !== input.ownerId ||
          replay.type !== input.type ||
          replay.originalFilename !== filename ||
          replay.digest !== digest ||
          replay.replacementForId !== (input.replacementForId ?? null)
        ) {
          throw new Error("Document upload idempotency conflict.");
        }
        return structuredClone(replay);
      }

      const id = randomUUID();
      const objectKey = `quarantine/${input.organizationId}/${id}`;
      await options.store.put({ key: objectKey, bytes: input.bytes });
      const document: StoredDocument = {
        id,
        organizationId: input.organizationId,
        ownerId: input.ownerId,
        type: input.type,
        originalFilename: filename,
        objectKey,
        contentType: detected.contentType,
        size: input.bytes.byteLength,
        digest,
        state: "quarantined",
        version: 1,
        replacementForId: input.replacementForId ?? null,
        createdAt: options.now(),
        expiresAt: null
      };
      try {
        return await metadata.create({
          document,
          uploadKeyDigest,
          requestDigest,
          actorId: input.actorId
        });
      } catch (error) {
        await options.store.delete(objectKey);
        throw error;
      }
    },
    async scan(input: { documentId: string; organizationId: string; actorId: string; expectedVersion: number }) {
      const document = await requireDocument(input.documentId, input.organizationId);
      if (document.state !== "quarantined" && document.state !== "scan_error") {
        throw new Error("Document is not awaiting a malware scan.");
      }
      const bytes = await options.store.get(document.objectKey);
      if (!bytes || sha256(bytes) !== document.digest) throw new Error("Document object integrity check failed.");
      const result = await options.scanner.scan({ bytes, digest: document.digest });
      return update(
        document,
        result === "clean" ? "clean" : result === "infected" ? "infected" : "scan_error",
        input.expectedVersion,
        `scan_${result}`,
        input.actorId
      );
    },
    async decide(input: {
      documentId: string;
      organizationId: string;
      actorId: string;
      role: DocumentRole;
      decision: "approve" | "reject";
      expectedVersion: number;
    }) {
      if (input.role !== "platform_admin" && input.role !== "employer_admin") {
        throw new Error("Document decision is not authorized.");
      }
      const document = await requireDocument(input.documentId, input.organizationId);
      if (input.decision === "approve" && document.state !== "clean") {
        throw new Error("Only a clean document can be approved.");
      }
      if (input.decision === "reject" && !["clean", "infected", "scan_error"].includes(document.state)) {
        throw new Error("Document cannot be rejected from its current state.");
      }
      return update(document, input.decision === "approve" ? "approved" : "rejected", input.expectedVersion, input.decision, input.actorId);
    },
    async download(input: {
      documentId: string;
      organizationId: string;
      actorId: string;
      role: DocumentRole;
      ownerId: string;
    }) {
      const document = await requireDocument(input.documentId, input.organizationId);
      if (document.state !== "approved") throw new Error("Document is not available for download.");
      authorizeRead(input.role, input.actorId, input.ownerId, document.ownerId);
      const bytes = await options.store.get(document.objectKey);
      if (!bytes || sha256(bytes) !== document.digest) throw new Error("Document object integrity check failed.");
      await metadata.appendAudit({
        document,
        action: "download",
        actorId: input.actorId,
        occurredAt: options.now()
      });
      return { document: structuredClone(document), bytes };
    },
    async remove(input: {
      documentId: string;
      organizationId: string;
      actorId: string;
      role: DocumentRole;
      expectedVersion: number;
    }) {
      if (input.role !== "platform_admin") throw new Error("Document deletion is not authorized.");
      const document = await requireDocument(input.documentId, input.organizationId);
      const deleted = await update(document, "deleted", input.expectedVersion, "delete", input.actorId);
      await options.store.delete(document.objectKey);
      return deleted;
    },
    async markReplaced(input: {
      documentId: string;
      replacementDocumentId: string;
      organizationId: string;
      actorId: string;
      role: DocumentRole;
      expectedVersion: number;
    }) {
      if (input.role !== "platform_admin" && input.role !== "employer_admin") {
        throw new Error("Document replacement is not authorized.");
      }
      const document = await requireDocument(input.documentId, input.organizationId);
      const replacement = await requireDocument(input.replacementDocumentId, input.organizationId);
      if (
        replacement.replacementForId !== document.id ||
        replacement.ownerId !== document.ownerId ||
        replacement.type !== document.type ||
        replacement.state !== "approved"
      ) {
        throw new Error("Approved replacement document is required.");
      }
      return update(document, "replaced", input.expectedVersion, "replace", input.actorId);
    },
    async expire(input: {
      documentId: string;
      organizationId: string;
      actorId: string;
      role: DocumentRole;
      expectedVersion: number;
    }) {
      if (input.role !== "platform_admin") throw new Error("Document expiry is not authorized.");
      const document = await requireDocument(input.documentId, input.organizationId);
      if (document.state !== "approved") throw new Error("Only an approved document can expire.");
      return update(document, "expired", input.expectedVersion, "expire", input.actorId);
    },
    async get(documentId: string, organizationId: string) {
      return structuredClone(await requireDocument(documentId, organizationId));
    },
    async list(organizationId: string, ownerId?: string) {
      return metadata.list(organizationId, ownerId);
    },
    async listAudit(documentId: string, organizationId: string) {
      await requireDocument(documentId, organizationId);
      return metadata.listAudit(documentId, organizationId);
    },
    async createDownloadReference(input: { documentId: string; organizationId: string; expiresAtEpochSeconds: number }) {
      const document = await requireDocument(input.documentId, input.organizationId);
      if (document.state !== "approved") throw new Error("Document is not available for download.");
      const now = Math.floor(new Date(options.now()).getTime() / 1000);
      if (input.expiresAtEpochSeconds <= now || input.expiresAtEpochSeconds > now + 300) {
        throw new Error("Document reference expiry is outside the allowed range.");
      }
      const payload = `${document.id}.${document.organizationId}.${input.expiresAtEpochSeconds}`;
      return `${payload}.${createHash("sha256").update(`${options.referenceSecret}:${payload}`).digest("hex")}`;
    },
    async verifyDownloadReference(reference: string) {
      const parts = reference.split(".");
      if (parts.length !== 4) throw new Error("Document reference is invalid.");
      const [documentId, organizationId, expiryText, signature] = parts as [
        string,
        string,
        string,
        string
      ];
      const expiresAt = Number(expiryText);
      const payload = `${documentId}.${organizationId}.${expiryText}`;
      const expected = createHash("sha256")
        .update(`${options.referenceSecret}:${payload}`)
        .digest("hex");
      const now = Math.floor(new Date(options.now()).getTime() / 1000);
      if (signature !== expected || !Number.isSafeInteger(expiresAt) || expiresAt <= now) {
        throw new Error("Document reference is invalid or expired.");
      }
      const document = await requireDocument(documentId, organizationId);
      if (document.state !== "approved") throw new Error("Document is not available for download.");
      return { documentId, organizationId };
    }
  };
}

export type DocumentUploadService = ReturnType<typeof createLocalDocumentService>;

function authorizeUpload(role: DocumentRole, type: DocumentType, actorId: string, ownerId: string) {
  if (role === "worker" && (actorId !== ownerId || type !== "worker_certification")) {
    throw new Error("Document upload is not authorized.");
  }
}

function authorizeRead(role: DocumentRole, actorId: string, requestedOwnerId: string, documentOwnerId: string) {
  if (requestedOwnerId !== documentOwnerId || (role === "worker" && actorId !== documentOwnerId)) {
    throw new Error("Document download is not authorized.");
  }
}

function safeFilename(value: string) {
  const normalized = value.normalize("NFC").trim();
  if (
    normalized.length < 1 ||
    normalized.length > 120 ||
    normalized !== value ||
    /[/\\]/u.test(normalized) ||
    [...normalized].some((character) => {
      const codePoint = character.codePointAt(0) ?? 0;
      return codePoint <= 31 || codePoint === 127;
    }) ||
    normalized.includes("..") ||
    /[\u202a-\u202e\u2066-\u2069]/u.test(normalized)
  ) {
    throw new Error("Document filename is unsafe.");
  }
  return normalized;
}

function extension(filename: string) {
  return filename.slice(filename.lastIndexOf(".")).toLowerCase();
}

function detectType(bytes: Uint8Array) {
  if (bytes.length >= 5 && new TextDecoder().decode(bytes.slice(0, 5)) === "%PDF-") {
    return { contentType: "application/pdf", extensions: new Set([".pdf"]) };
  }
  if (bytes.length >= 8 && [137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => bytes[index] === value)) {
    return { contentType: "image/png", extensions: new Set([".png"]) };
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { contentType: "image/jpeg", extensions: new Set([".jpg", ".jpeg"]) };
  }
  return null;
}

function sha256(bytes: Uint8Array) {
  return createHash("sha256").update(bytes).digest("hex");
}

function sha256Text(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function isMissingFile(error: unknown) {
  return Boolean(
    error &&
    typeof error === "object" &&
    "code" in error &&
    (error as { code?: unknown }).code === "ENOENT"
  );
}
