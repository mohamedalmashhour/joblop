// HR-3 Documents — governed HR document domain.
//
// Rules:
//   - File CONTENTS never touch Joblop core. The DB stores metadata + a provider
//     storageReference only. Storage is provider-neutral (fixture in dev; a real
//     encrypted-at-rest, signed-URL, malware-scanned provider swaps in behind the seam).
//   - A previously ACCEPTED document is NEVER overwritten — a replacement is a NEW record;
//     the old one becomes `superseded` (history preserved) and can never silently reactivate.
//   - Workers submit/replace; they can NEVER approve their own document or alter review state.
//   - Every governed transition is audited (append-only).

import { randomUUID } from "node:crypto";

export type HrDocumentStatus =
  | "required" | "submitted" | "under_review" | "accepted" | "rejected"
  | "expiring" | "expired" | "superseded" | "revoked";

export type HrDocumentErrorCode = "denied" | "not_found" | "invalid" | "conflict";
export class HrDocumentError extends Error {
  readonly code: HrDocumentErrorCode;
  constructor(code: HrDocumentErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = "HrDocumentError";
  }
}

// ── Domain helpers (pure) ──

export function deriveDocumentStatus(input: { storedStatus: HrDocumentStatus; expiresAt: string | null; now: Date; warningDays?: number }): HrDocumentStatus {
  // Only ACCEPTED documents are expiry-driven; everything else reads as-stored.
  if (input.storedStatus !== "accepted") return input.storedStatus;
  if (!input.expiresAt) return "accepted";
  const expires = new Date(input.expiresAt).getTime();
  const now = input.now.getTime();
  if (expires <= now) return "expired";
  const warningMs = (input.warningDays ?? 30) * 24 * 60 * 60 * 1000;
  if (expires <= now + warningMs) return "expiring";
  return "accepted";
}

export function canReviewDocument(status: HrDocumentStatus): boolean {
  return status === "submitted" || status === "under_review";
}

// ── Provider-neutral storage seam ──

export type DocumentStorageProvider = Readonly<{
  readonly name: string;
  createUploadReference(input: { workerIdentityId: string; documentType: string }): Promise<{ storageReference: string; uploadUrl: string }>;
  // Short-lived download URL for HR review (a real provider signs + expires it).
  resolveDownloadUrl(input: { storageReference: string }): Promise<{ url: string; expiresInSeconds: number } | null>;
  // Reject fabricated / cross-worker references before trusting them.
  verifyReference(input: { storageReference: string; workerIdentityId: string }): Promise<boolean>;
  // Original file name / type recorded at upload, when the provider keeps them.
  describe?(input: { storageReference: string }): Promise<{ fileName: string | null; contentType: string | null } | null>;
}>;

// Fixture provider: deterministic namespace per worker, no network. NOTE: encryption-at-rest,
// signed URLs, malware scanning, file-type allowlist, and size limits are EXTERNAL controls
// that a real provider implements — the fixture does NOT provide them (do not claim it does).
export function createFixtureDocumentStorageProvider(name = "fixture"): DocumentStorageProvider {
  const prefix = (workerIdentityId: string) => `fixture-doc/${workerIdentityId.slice(0, 8)}/`;
  return {
    name,
    async createUploadReference({ workerIdentityId, documentType }) {
      const storageReference = `${prefix(workerIdentityId)}${documentType}/${randomUUID()}`;
      return { storageReference, uploadUrl: `https://fixture-storage.local/upload?ref=${encodeURIComponent(storageReference)}` };
    },
    async resolveDownloadUrl({ storageReference }) {
      return { url: `https://fixture-storage.local/download?ref=${encodeURIComponent(storageReference)}&exp=300`, expiresInSeconds: 300 };
    },
    async verifyReference({ storageReference, workerIdentityId }) {
      // A reference must belong to this worker's namespace and match the fixture format.
      return typeof storageReference === "string" && storageReference.startsWith(prefix(workerIdentityId));
    }
  };
}

// ── Records ──

export type HrDocumentRecord = Readonly<{
  id: string;
  workerIdentityId: string;
  documentType: string;
  issuingAuthority: string | null;
  jurisdiction: string | null;
  issuedAt: string | null;
  expiresAt: string | null;
  status: HrDocumentStatus;
  effectiveStatus: HrDocumentStatus;
  storageReference: string | null;
  checksum: string | null;
  source: string;
  supersededById: string | null;
  reviewReason: string | null; // HR-internal; stripped from worker views
  updatedAt: string;
}>;

// What a WORKER may see (no internal review notes).
export type WorkerDocumentView = Readonly<{
  id: string;
  documentType: string;
  fileName?: string | null;
  contentType?: string | null;
  jurisdiction: string | null;
  expiresAt: string | null;
  effectiveStatus: HrDocumentStatus;
  supersededById: string | null;
}>;

export type HrDocPage<T> = Readonly<{ items: readonly T[]; nextCursor: string | null }>;

export type HrDocumentEventInput = Readonly<{
  documentId: string;
  workerIdentityId: string;
  eventType: string;
  priorState?: string | null;
  newState: string;
  reason?: string | null;
  source: "worker" | "hr_admin" | "employer" | "system";
  actorUserId?: string | null;
  documentReference?: string | null;
}>;

// ── Ports ──

export type HrDocWorkerResolver = Readonly<{ resolveByUserId(userId: string): Promise<{ workerIdentityId: string } | null> }>;

export type HrDocumentStore = Readonly<{
  create(input: { workerIdentityId: string; documentType: string; storageReference: string; checksum: string | null; issuingAuthority: string | null; jurisdiction: string | null; issuedAt: Date | null; expiresAt: Date | null; source: string }): Promise<HrDocumentRecord>;
  getById(id: string): Promise<HrDocumentRecord | null>;
  listForWorker(workerIdentityId: string): Promise<readonly HrDocumentRecord[]>;
  setStatus(input: { id: string; status: HrDocumentStatus; reviewReason?: string | null; reviewedByUserId?: string | null; supersededById?: string | null }): Promise<HrDocumentRecord>;
  latestAcceptedOfType(input: { workerIdentityId: string; documentType: string }): Promise<HrDocumentRecord | null>;
  pageReview(input: { statuses: readonly HrDocumentStatus[]; cursor: string | null; limit: number }): Promise<HrDocPage<HrDocumentRecord>>;
  pageExpiring(input: { before: Date; cursor: string | null; limit: number }): Promise<HrDocPage<HrDocumentRecord>>;
  appendEvent(event: HrDocumentEventInput): Promise<void>;
}>;

export type HrDocumentDeps = Readonly<{
  workers: HrDocWorkerResolver;
  store: HrDocumentStore;
  storage: DocumentStorageProvider;
  now?: () => Date;
  warningDays?: number;
}>;

export type HrDocumentService = ReturnType<typeof createHrDocumentService>;

const MAX_PAGE = 100;

export function createHrDocumentService(deps: HrDocumentDeps) {
  const now = deps.now ?? (() => new Date());
  const withEffective = (r: HrDocumentRecord): HrDocumentRecord => ({
    ...r,
    effectiveStatus: deriveDocumentStatus({ storedStatus: r.status, expiresAt: r.expiresAt, now: now(), ...(deps.warningDays !== undefined ? { warningDays: deps.warningDays } : {}) })
  });
  const toWorkerView = (r: HrDocumentRecord): WorkerDocumentView => ({
    id: r.id, documentType: r.documentType, jurisdiction: r.jurisdiction, expiresAt: r.expiresAt,
    effectiveStatus: withEffective(r).effectiveStatus, supersededById: r.supersededById
  });

  async function requireWorker(userId: string): Promise<string> {
    const w = await deps.workers.resolveByUserId(userId);
    if (!w) throw new HrDocumentError("denied", "Only a worker can manage their documents.");
    return w.workerIdentityId;
  }

  return {
    // Worker: get a provider upload reference (they upload to the provider, not to Joblop).
    async requestUploadReference(input: { userId: string; documentType: string }): Promise<{ storageReference: string; uploadUrl: string }> {
      const workerIdentityId = await requireWorker(input.userId);
      if (!input.documentType.trim()) throw new HrDocumentError("invalid", "A documentType is required.");
      return deps.storage.createUploadReference({ workerIdentityId, documentType: input.documentType.trim() });
    },

    // Worker: submit a document metadata record for a verified storage reference. Reject a
    // fabricated / cross-worker reference. The worker can NEVER set the status to accepted.
    async submitDocument(input: { userId: string; documentType: string; storageReference: string; checksum?: string | null; issuingAuthority?: string | null; jurisdiction?: string | null; issuedAt?: string | null; expiresAt?: string | null }): Promise<WorkerDocumentView> {
      const workerIdentityId = await requireWorker(input.userId);
      if (!input.documentType.trim()) throw new HrDocumentError("invalid", "A documentType is required.");
      const ok = await deps.storage.verifyReference({ storageReference: input.storageReference, workerIdentityId });
      if (!ok) throw new HrDocumentError("invalid", "That document reference could not be verified.");
      const rec = await deps.store.create({
        workerIdentityId, documentType: input.documentType.trim(), storageReference: input.storageReference,
        checksum: input.checksum ?? null, issuingAuthority: input.issuingAuthority ?? null, jurisdiction: input.jurisdiction ?? null,
        issuedAt: input.issuedAt ? new Date(input.issuedAt) : null, expiresAt: input.expiresAt ? new Date(input.expiresAt) : null, source: "worker"
      });
      await deps.store.appendEvent({ documentId: rec.id, workerIdentityId, eventType: "document_submitted", newState: rec.status, source: "worker", documentReference: rec.storageReference });
      return toWorkerView(rec);
    },

    // Worker: replace a document. Submits a NEW document; when an accepted one of the same
    // type exists, that older one becomes `superseded` (never overwritten).
    async replaceDocument(input: { userId: string; documentType: string; storageReference: string; expiresAt?: string | null }): Promise<WorkerDocumentView> {
      const workerIdentityId = await requireWorker(input.userId);
      const ok = await deps.storage.verifyReference({ storageReference: input.storageReference, workerIdentityId });
      if (!ok) throw new HrDocumentError("invalid", "That document reference could not be verified.");
      const created = await deps.store.create({ workerIdentityId, documentType: input.documentType.trim(), storageReference: input.storageReference, checksum: null, issuingAuthority: null, jurisdiction: null, issuedAt: null, expiresAt: input.expiresAt ? new Date(input.expiresAt) : null, source: "worker" });
      await deps.store.appendEvent({ documentId: created.id, workerIdentityId, eventType: "document_submitted", newState: created.status, source: "worker", documentReference: created.storageReference });
      const prior = await deps.store.latestAcceptedOfType({ workerIdentityId, documentType: input.documentType.trim() });
      if (prior && prior.id !== created.id) {
        await deps.store.setStatus({ id: prior.id, status: "superseded", supersededById: created.id });
        await deps.store.appendEvent({ documentId: prior.id, workerIdentityId, eventType: "document_superseded", priorState: prior.status, newState: "superseded", source: "worker", actorUserId: null });
      }
      return toWorkerView(created);
    },

    async listMyDocuments(input: { userId: string }): Promise<readonly WorkerDocumentView[]> {
      const workerIdentityId = await requireWorker(input.userId);
      const records = await deps.store.listForWorker(workerIdentityId);
      return Promise.all(records.map(async (r) => {
        const info = r.storageReference ? await deps.storage.describe?.({ storageReference: r.storageReference }) : null;
        return { ...toWorkerView(r), fileName: info?.fileName ?? null, contentType: info?.contentType ?? null };
      }));
    },

    async myDocumentStatuses(input: { userId: string }): Promise<ReadonlyArray<{ documentType: string; effectiveStatus: string }>> {
      const workerIdentityId = await requireWorker(input.userId);
      return (await deps.store.listForWorker(workerIdentityId)).map((r) => ({ documentType: r.documentType, effectiveStatus: withEffective(r).effectiveStatus }));
    },

    // Worker: locate ONE of their OWN current documents so they can view or save it. A deleted or
    // replaced document is not served, and another worker's document is never found.
    async getMyDocumentFile(input: { userId: string; documentId: string }): Promise<{ documentType: string; storageReference: string } | null> {
      const workerIdentityId = await requireWorker(input.userId);
      const rec = (await deps.store.listForWorker(workerIdentityId)).find((r) => r.id === input.documentId);
      if (!rec || !rec.storageReference) return null;
      if (rec.status === "revoked" || rec.status === "superseded") return null;
      return { documentType: rec.documentType, storageReference: rec.storageReference };
    },

    // Worker: resolve ONE of their OWN documents for an advisory AI review. Ownership is enforced
    // (only documents belonging to the requesting worker are returned). Returns the type, expiry and a
    // short-lived provider download URL so the API can fetch the bytes for the vision pre-check. Never
    // exposes the raw storageReference to the client.
    async resolveMyDocumentForReview(input: { userId: string; documentId: string }): Promise<{ documentType: string; expired: boolean; downloadUrl: string | null } | null> {
      const workerIdentityId = await requireWorker(input.userId);
      const rec = (await deps.store.listForWorker(workerIdentityId)).find((r) => r.id === input.documentId);
      if (!rec) return null;
      const effective = withEffective(rec).effectiveStatus;
      const dl = rec.storageReference ? await deps.storage.resolveDownloadUrl({ storageReference: rec.storageReference }) : null;
      return { documentType: rec.documentType, expired: effective === "expired", downloadUrl: dl?.url ?? null };
    },

    // Worker: remove ONE of their OWN documents. Ownership enforced. Governed/append-only model — this
    // marks the record "revoked" (worker-initiated) and keeps the audit event rather than hard-deleting.
    // The worker then re-uploads a fresh one if needed. Cannot touch another worker's document.
    async removeMyDocument(input: { userId: string; documentId: string }): Promise<WorkerDocumentView> {
      const workerIdentityId = await requireWorker(input.userId);
      const rec = (await deps.store.listForWorker(workerIdentityId)).find((r) => r.id === input.documentId);
      if (!rec) throw new HrDocumentError("not_found", "That document was not found.");
      const updated = await deps.store.setStatus({ id: rec.id, status: "revoked", reviewReason: "removed_by_worker", reviewedByUserId: null });
      await deps.store.appendEvent({ documentId: rec.id, workerIdentityId, eventType: "document_revoked", priorState: rec.status, newState: "revoked", reason: "removed_by_worker", source: "worker", actorUserId: null });
      return toWorkerView(updated);
    },

    // ── HR authority ──
    async getDocument(id: string): Promise<HrDocumentRecord | null> {
      const rec = await deps.store.getById(id);
      return rec ? withEffective(rec) : null;
    },
    async listWorkerDocuments(workerIdentityId: string): Promise<readonly HrDocumentRecord[]> {
      return (await deps.store.listForWorker(workerIdentityId)).map(withEffective);
    },
    // A short-lived download URL for review (delegated to the provider).
    async resolveDownloadUrl(id: string): Promise<{ url: string; expiresInSeconds: number } | null> {
      const rec = await deps.store.getById(id);
      if (!rec || !rec.storageReference) return null;
      return deps.storage.resolveDownloadUrl({ storageReference: rec.storageReference });
    },

    async accept(input: { actorUserId: string; documentId: string }): Promise<HrDocumentRecord> {
      const rec = await deps.store.getById(input.documentId);
      if (!rec) throw new HrDocumentError("not_found", "That document was not found.");
      if (!canReviewDocument(rec.status)) throw new HrDocumentError("conflict", `A document in state ${rec.status} cannot be accepted.`);
      const updated = await deps.store.setStatus({ id: rec.id, status: "accepted", reviewedByUserId: input.actorUserId });
      await deps.store.appendEvent({ documentId: rec.id, workerIdentityId: rec.workerIdentityId, eventType: "document_accepted", priorState: rec.status, newState: "accepted", source: "hr_admin", actorUserId: input.actorUserId });
      return withEffective(updated);
    },
    async reject(input: { actorUserId: string; documentId: string; reason: string }): Promise<HrDocumentRecord> {
      if (!input.reason?.trim()) throw new HrDocumentError("invalid", "A reason is required to reject a document.");
      const rec = await deps.store.getById(input.documentId);
      if (!rec) throw new HrDocumentError("not_found", "That document was not found.");
      if (!canReviewDocument(rec.status)) throw new HrDocumentError("conflict", `A document in state ${rec.status} cannot be rejected.`);
      const updated = await deps.store.setStatus({ id: rec.id, status: "rejected", reviewReason: input.reason.trim(), reviewedByUserId: input.actorUserId });
      await deps.store.appendEvent({ documentId: rec.id, workerIdentityId: rec.workerIdentityId, eventType: "document_rejected", priorState: rec.status, newState: "rejected", reason: input.reason.trim(), source: "hr_admin", actorUserId: input.actorUserId });
      return withEffective(updated);
    },
    async revoke(input: { actorUserId: string; documentId: string; reason?: string | null }): Promise<HrDocumentRecord> {
      const rec = await deps.store.getById(input.documentId);
      if (!rec) throw new HrDocumentError("not_found", "That document was not found.");
      const updated = await deps.store.setStatus({ id: rec.id, status: "revoked", reviewReason: input.reason ?? null, reviewedByUserId: input.actorUserId });
      await deps.store.appendEvent({ documentId: rec.id, workerIdentityId: rec.workerIdentityId, eventType: "document_revoked", priorState: rec.status, newState: "revoked", reason: input.reason ?? null, source: "hr_admin", actorUserId: input.actorUserId });
      return withEffective(updated);
    },

    async pageReviewQueue(input: { cursor?: string | null; limit?: number }): Promise<HrDocPage<HrDocumentRecord>> {
      const limit = Math.min(Math.max(input.limit ?? 25, 1), MAX_PAGE);
      const page = await deps.store.pageReview({ statuses: ["submitted", "under_review"], cursor: input.cursor ?? null, limit });
      return { items: page.items.map(withEffective), nextCursor: page.nextCursor };
    },
    async pageRejected(input: { cursor?: string | null; limit?: number }): Promise<HrDocPage<HrDocumentRecord>> {
      const limit = Math.min(Math.max(input.limit ?? 25, 1), MAX_PAGE);
      const page = await deps.store.pageReview({ statuses: ["rejected"], cursor: input.cursor ?? null, limit });
      return { items: page.items.map(withEffective), nextCursor: page.nextCursor };
    },
    async pageExpiring(input: { cursor?: string | null; limit?: number; withinDays?: number }): Promise<HrDocPage<HrDocumentRecord>> {
      const limit = Math.min(Math.max(input.limit ?? 25, 1), MAX_PAGE);
      const before = new Date(now().getTime() + (input.withinDays ?? deps.warningDays ?? 30) * 24 * 60 * 60 * 1000);
      const page = await deps.store.pageExpiring({ before, cursor: input.cursor ?? null, limit });
      return { items: page.items.map(withEffective), nextCursor: page.nextCursor };
    }
  };
}

// ── Prisma adapters ──

type DocRow = {
  id: string; workerIdentityId: string; documentType: string; issuingAuthority: string | null; jurisdiction: string | null;
  issuedAt: Date | null; expiresAt: Date | null; status: HrDocumentStatus; storageReference: string | null; checksum: string | null;
  source: string; supersededById: string | null; reviewReason: string | null; updatedAt: Date;
};

type DocPrisma = {
  workerIdentity: { findUnique(args: unknown): Promise<{ id: string } | null> };
  hrDocument: {
    create(args: unknown): Promise<DocRow>;
    findUnique(args: unknown): Promise<DocRow | null>;
    findFirst(args: unknown): Promise<DocRow | null>;
    findMany(args: unknown): Promise<DocRow[]>;
    update(args: unknown): Promise<DocRow>;
  };
  hrDocumentEvent: { create(args: unknown): Promise<unknown> };
};

function toDoc(r: DocRow): HrDocumentRecord {
  return {
    id: r.id, workerIdentityId: r.workerIdentityId, documentType: r.documentType, issuingAuthority: r.issuingAuthority,
    jurisdiction: r.jurisdiction, issuedAt: r.issuedAt?.toISOString() ?? null, expiresAt: r.expiresAt?.toISOString() ?? null,
    status: r.status, effectiveStatus: r.status, storageReference: r.storageReference, checksum: r.checksum, source: r.source,
    supersededById: r.supersededById, reviewReason: r.reviewReason, updatedAt: r.updatedAt.toISOString()
  };
}

export function createPrismaHrDocWorkerResolver(prisma: DocPrisma): HrDocWorkerResolver {
  return {
    async resolveByUserId(userId) {
      const w = await prisma.workerIdentity.findUnique({ where: { userId }, select: { id: true } });
      return w ? { workerIdentityId: w.id } : null;
    }
  };
}

export function createPrismaHrDocumentStore(prisma: DocPrisma): HrDocumentStore {
  return {
    async create(input) {
      return toDoc(await prisma.hrDocument.create({ data: { ...input, status: "submitted" } }));
    },
    async getById(id) {
      const r = await prisma.hrDocument.findUnique({ where: { id } });
      return r ? toDoc(r) : null;
    },
    async listForWorker(workerIdentityId) {
      const rows = await prisma.hrDocument.findMany({ where: { workerIdentityId }, orderBy: { createdAt: "desc" } });
      return rows.map(toDoc);
    },
    async setStatus({ id, status, reviewReason, reviewedByUserId, supersededById }) {
      return toDoc(await prisma.hrDocument.update({
        where: { id },
        data: {
          status,
          ...(reviewReason !== undefined ? { reviewReason } : {}),
          ...(reviewedByUserId !== undefined ? { reviewedByUserId, reviewedAt: new Date() } : {}),
          ...(supersededById !== undefined ? { supersededById } : {})
        }
      }));
    },
    async latestAcceptedOfType({ workerIdentityId, documentType }) {
      const r = await prisma.hrDocument.findFirst({ where: { workerIdentityId, documentType, status: "accepted" }, orderBy: { createdAt: "desc" } });
      return r ? toDoc(r) : null;
    },
    async pageReview({ statuses, cursor, limit }) {
      const rows = await prisma.hrDocument.findMany({
        where: { status: { in: [...statuses] } },
        orderBy: [{ updatedAt: "asc" }, { id: "asc" }],
        take: limit + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {})
      });
      const hasMore = rows.length > limit;
      return { items: rows.slice(0, limit).map(toDoc), nextCursor: hasMore ? (rows[limit - 1]?.id ?? null) : null };
    },
    async pageExpiring({ before, cursor, limit }) {
      const rows = await prisma.hrDocument.findMany({
        where: { status: "accepted", expiresAt: { not: null, lte: before } },
        orderBy: [{ expiresAt: "asc" }, { id: "asc" }],
        take: limit + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {})
      });
      const hasMore = rows.length > limit;
      return { items: rows.slice(0, limit).map(toDoc), nextCursor: hasMore ? (rows[limit - 1]?.id ?? null) : null };
    },
    async appendEvent(event) {
      await prisma.hrDocumentEvent.create({
        data: {
          documentId: event.documentId, workerIdentityId: event.workerIdentityId, eventType: event.eventType,
          priorState: event.priorState ?? null, newState: event.newState, reason: event.reason ?? null,
          source: event.source, actorUserId: event.actorUserId ?? null, documentReference: event.documentReference ?? null
        }
      });
    }
  };
}

