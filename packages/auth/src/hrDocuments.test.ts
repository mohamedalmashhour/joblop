import { beforeEach, describe, expect, it } from "vitest";
import {
  createHrDocumentService,
  createFixtureDocumentStorageProvider,
  deriveDocumentStatus,
  HrDocumentError,
  type HrDocumentEventInput,
  type HrDocumentRecord,
  type HrDocumentStore,
  type HrDocPage
} from "./hrDocuments";

type Mut<T> = { -readonly [K in keyof T]: T[K] };

function makeStore() {
  const docs: Mut<HrDocumentRecord>[] = [];
  const events: HrDocumentEventInput[] = [];
  let seq = 0;
  const iso = () => new Date(1_700_000_000_000 + seq * 1000).toISOString();
  const store: HrDocumentStore = {
    async create(input) {
      const r: Mut<HrDocumentRecord> = { id: `doc-${seq++}`, workerIdentityId: input.workerIdentityId, documentType: input.documentType, issuingAuthority: input.issuingAuthority, jurisdiction: input.jurisdiction, issuedAt: input.issuedAt?.toISOString() ?? null, expiresAt: input.expiresAt?.toISOString() ?? null, status: "submitted", effectiveStatus: "submitted", storageReference: input.storageReference, checksum: input.checksum, source: input.source, supersededById: null, reviewReason: null, updatedAt: iso() };
      docs.push(r);
      return { ...r };
    },
    async getById(id) { const r = docs.find((d) => d.id === id); return r ? { ...r } : null; },
    async listForWorker(w) { return docs.filter((d) => d.workerIdentityId === w).map((d) => ({ ...d })); },
    async setStatus({ id, status, reviewReason, supersededById }) { const r = docs.find((d) => d.id === id)!; r.status = status; if (reviewReason !== undefined) r.reviewReason = reviewReason; if (supersededById !== undefined) r.supersededById = supersededById; return { ...r }; },
    async latestAcceptedOfType({ workerIdentityId, documentType }) { const r = [...docs].reverse().find((d) => d.workerIdentityId === workerIdentityId && d.documentType === documentType && d.status === "accepted"); return r ? { ...r } : null; },
    async pageReview({ statuses, limit }): Promise<HrDocPage<HrDocumentRecord>> { return { items: docs.filter((d) => statuses.includes(d.status)).slice(0, limit).map((d) => ({ ...d })), nextCursor: null }; },
    async pageExpiring({ limit }): Promise<HrDocPage<HrDocumentRecord>> { return { items: docs.filter((d) => d.status === "accepted" && d.expiresAt).slice(0, limit).map((d) => ({ ...d })), nextCursor: null }; },
    async appendEvent(e) { events.push(e); }
  };
  return { store, docs, events };
}

function makeService(over?: { worker?: { workerIdentityId: string } | null }) {
  const ctx = makeStore();
  const service = createHrDocumentService({
    workers: { async resolveByUserId() { return over && "worker" in over ? over.worker ?? null : { workerIdentityId: "w-1" }; } },
    store: ctx.store,
    storage: createFixtureDocumentStorageProvider(),
    now: () => new Date("2026-08-11T00:00:00.000Z")
  });
  return { service, ...ctx };
}

describe("HR document domain", () => {
  const now = new Date("2026-08-11T00:00:00.000Z");
  it("only ACCEPTED documents are expiry-driven; others read as-stored", () => {
    expect(deriveDocumentStatus({ storedStatus: "accepted", expiresAt: "2027-01-01T00:00:00Z", now })).toBe("accepted");
    expect(deriveDocumentStatus({ storedStatus: "accepted", expiresAt: "2026-08-20T00:00:00Z", now })).toBe("expiring");
    expect(deriveDocumentStatus({ storedStatus: "accepted", expiresAt: "2020-01-01T00:00:00Z", now })).toBe("expired");
    expect(deriveDocumentStatus({ storedStatus: "submitted", expiresAt: "2020-01-01T00:00:00Z", now })).toBe("submitted");
    expect(deriveDocumentStatus({ storedStatus: "superseded", expiresAt: "2027-01-01T00:00:00Z", now })).toBe("superseded");
  });
});

describe("HR document service", () => {
  let ctx: ReturnType<typeof makeService>;
  beforeEach(() => { ctx = makeService(); });

  it("serves a worker only their own current documents", async () => {
    const { storageReference } = await ctx.service.requestUploadReference({ userId: "u-1", documentType: "licence" });
    const view = await ctx.service.submitDocument({ userId: "u-1", documentType: "licence", storageReference });
    expect(await ctx.service.getMyDocumentFile({ userId: "u-1", documentId: view.id })).toEqual({ documentType: "licence", storageReference });
    const otherWorker = createHrDocumentService({
      workers: { async resolveByUserId() { return { workerIdentityId: "w-2" }; } },
      store: ctx.store,
      storage: createFixtureDocumentStorageProvider()
    });
    expect(await otherWorker.getMyDocumentFile({ userId: "u-2", documentId: view.id })).toBeNull();
    await ctx.service.removeMyDocument({ userId: "u-1", documentId: view.id });
    expect(await ctx.service.getMyDocumentFile({ userId: "u-1", documentId: view.id })).toBeNull();
  });

  it("submit verifies the storage reference (rejects fabricated/cross-worker) and audits", async () => {
    const { storageReference } = await ctx.service.requestUploadReference({ userId: "u-1", documentType: "licence" });
    const view = await ctx.service.submitDocument({ userId: "u-1", documentType: "licence", storageReference });
    expect(view.effectiveStatus).toBe("submitted");
    expect(ctx.events.some((e) => e.eventType === "document_submitted")).toBe(true);
    // fabricated reference (wrong namespace) is rejected
    await expect(ctx.service.submitDocument({ userId: "u-1", documentType: "licence", storageReference: "fabricated/ref" })).rejects.toMatchObject({ code: "invalid" });
  });

  it("the worker view never exposes internal review notes", async () => {
    const { storageReference } = await ctx.service.requestUploadReference({ userId: "u-1", documentType: "licence" });
    const view = await ctx.service.submitDocument({ userId: "u-1", documentType: "licence", storageReference });
    expect(Object.keys(view)).not.toContain("reviewReason");
    expect(Object.keys(view)).not.toContain("storageReference");
  });

  it("HR accept/reject is governed; a non-reviewable state cannot be accepted", async () => {
    const { storageReference } = await ctx.service.requestUploadReference({ userId: "u-1", documentType: "licence" });
    const view = await ctx.service.submitDocument({ userId: "u-1", documentType: "licence", storageReference });
    const accepted = await ctx.service.accept({ actorUserId: "hr-1", documentId: view.id });
    expect(accepted.status).toBe("accepted");
    // cannot accept again (already accepted) — "superseded/terminal cannot reactivate"
    await expect(ctx.service.accept({ actorUserId: "hr-1", documentId: view.id })).rejects.toMatchObject({ code: "conflict" });
    expect(ctx.events.some((e) => e.eventType === "document_accepted")).toBe(true);
  });

  it("reject requires a reason", async () => {
    const { storageReference } = await ctx.service.requestUploadReference({ userId: "u-1", documentType: "licence" });
    const view = await ctx.service.submitDocument({ userId: "u-1", documentType: "licence", storageReference });
    await expect(ctx.service.reject({ actorUserId: "hr-1", documentId: view.id, reason: "" })).rejects.toMatchObject({ code: "invalid" });
  });

  it("replacement supersedes the accepted document (never overwrites it); history preserved", async () => {
    const first = await ctx.service.requestUploadReference({ userId: "u-1", documentType: "licence" });
    const v1 = await ctx.service.submitDocument({ userId: "u-1", documentType: "licence", storageReference: first.storageReference });
    await ctx.service.accept({ actorUserId: "hr-1", documentId: v1.id });
    const second = await ctx.service.requestUploadReference({ userId: "u-1", documentType: "licence" });
    const v2 = await ctx.service.replaceDocument({ userId: "u-1", documentType: "licence", storageReference: second.storageReference });
    const old = ctx.docs.find((d) => d.id === v1.id)!;
    expect(old.status).toBe("superseded");
    expect(old.supersededById).toBe(v2.id);
    // the old accepted document still exists (not overwritten)
    expect(ctx.docs.filter((d) => d.documentType === "licence").length).toBe(2);
  });

  it("a non-worker cannot manage documents", async () => {
    const svc = makeService({ worker: null }).service;
    await expect(svc.listMyDocuments({ userId: "x" })).rejects.toBeInstanceOf(HrDocumentError);
  });
});
