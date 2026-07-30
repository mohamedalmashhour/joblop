import { describe, expect, it, vi } from "vitest";
import { createPrismaDocumentMetadataRepository } from "./documentUploadRepository";

const persisted = {
  id: "00000000-0000-4000-8000-000000000001",
  organizationId: "00000000-0000-4000-8000-00000000000a",
  ownerUserId: "00000000-0000-4000-8000-00000000000b",
  documentType: "worker_certification",
  originalFilename: "synthetic.pdf",
  objectKey: "quarantine/a/document",
  contentType: "application/pdf",
  sizeBytes: 24,
  contentDigest: "a".repeat(64),
  state: "quarantined",
  version: 1,
  replacementForId: null,
  createdAt: new Date("2026-07-30T12:00:00.000Z"),
  expiresAt: null
};

function setup() {
  const uploadedDocument = {
    findFirst: vi.fn().mockResolvedValue(persisted),
    count: vi.fn().mockResolvedValue(1),
    create: vi.fn().mockResolvedValue(persisted),
    updateMany: vi.fn().mockResolvedValue({ count: 1 })
  };
  const uploadedDocumentAudit = {
    aggregate: vi.fn().mockResolvedValue({ _max: { sequence: 1 } }),
    create: vi.fn().mockResolvedValue({}),
    findMany: vi.fn().mockResolvedValue([])
  };
  const client = {
    uploadedDocument,
    uploadedDocumentAudit,
    $transaction: vi.fn(async (callback: (transaction: unknown) => Promise<unknown>) =>
      callback({ uploadedDocument, uploadedDocumentAudit })
    )
  };
  return { repository: createPrismaDocumentMetadataRepository(client), uploadedDocument, uploadedDocumentAudit };
}

describe("Prisma document metadata repository", () => {
  it("scopes every lookup and active count to the organization", async () => {
    const { repository, uploadedDocument } = setup();
    await repository.find(persisted.id, persisted.organizationId);
    await repository.findByUploadKey(persisted.organizationId, "b".repeat(64));
    await repository.countActive(persisted.organizationId, persisted.ownerUserId);
    expect(uploadedDocument.findFirst).toHaveBeenNthCalledWith(1, {
      where: { id: persisted.id, organizationId: persisted.organizationId }
    });
    expect(uploadedDocument.findFirst).toHaveBeenNthCalledWith(2, {
      where: {
        organizationId: persisted.organizationId,
        uploadIdempotencyKey: "b".repeat(64)
      }
    });
    expect(uploadedDocument.count).toHaveBeenCalledWith({
      where: {
        organizationId: persisted.organizationId,
        ownerUserId: persisted.ownerUserId,
        state: { notIn: ["replaced", "expired", "deleted"] }
      }
    });
  });

  it("creates metadata and the first audit record atomically without file bytes", async () => {
    const { repository, uploadedDocument, uploadedDocumentAudit } = setup();
    await repository.create({
      document: {
        id: persisted.id,
        organizationId: persisted.organizationId,
        ownerId: persisted.ownerUserId,
        type: "worker_certification",
        originalFilename: persisted.originalFilename,
        objectKey: persisted.objectKey,
        contentType: persisted.contentType,
        size: persisted.sizeBytes,
        digest: persisted.contentDigest,
        state: "quarantined",
        version: 1,
        replacementForId: null,
        createdAt: persisted.createdAt.toISOString(),
        expiresAt: null
      },
      uploadKeyDigest: "b".repeat(64),
      requestDigest: "c".repeat(64),
      actorId: persisted.ownerUserId
    });
    const data = uploadedDocument.create.mock.calls[0]?.[0]?.data;
    expect(data).not.toHaveProperty("bytes");
    expect(data).not.toHaveProperty("content");
    expect(uploadedDocumentAudit.create).toHaveBeenCalledTimes(1);
  });

  it("uses organization, expected version and state in an atomic transition", async () => {
    const { repository, uploadedDocument } = setup();
    await repository.transition({
      documentId: persisted.id,
      organizationId: persisted.organizationId,
      expectedVersion: 1,
      fromStates: ["quarantined"],
      toState: "clean",
      action: "scan_clean",
      actorId: persisted.ownerUserId,
      occurredAt: "2026-07-30T12:01:00.000Z"
    });
    expect(uploadedDocument.updateMany).toHaveBeenCalledWith({
      where: {
        id: persisted.id,
        organizationId: persisted.organizationId,
        version: 1,
        state: { in: ["quarantined"] }
      },
      data: { state: "clean", version: { increment: 1 } }
    });
  });

  it("fails closed on a concurrent transition", async () => {
    const setupResult = setup();
    setupResult.uploadedDocument.updateMany.mockResolvedValueOnce({ count: 0 });
    await expect(
      setupResult.repository.transition({
        documentId: persisted.id,
        organizationId: persisted.organizationId,
        expectedVersion: 1,
        fromStates: ["quarantined"],
        toState: "clean",
        action: "scan_clean",
        actorId: persisted.ownerUserId,
        occurredAt: "2026-07-30T12:01:00.000Z"
      })
    ).rejects.toThrow("version conflict");
  });
});
