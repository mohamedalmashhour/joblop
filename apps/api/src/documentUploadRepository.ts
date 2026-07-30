import type { DocumentAudit, DocumentState, StoredDocument } from "./documentUpload";

export interface DocumentMetadataRepository {
  find(documentId: string, organizationId: string): Promise<StoredDocument | null>;
  findByUploadKey(organizationId: string, uploadKeyDigest: string): Promise<StoredDocument | null>;
  countActive(organizationId: string, ownerId: string): Promise<number>;
  create(input: {
    document: StoredDocument;
    uploadKeyDigest: string;
    requestDigest: string;
    actorId: string;
  }): Promise<StoredDocument>;
  transition(input: {
    documentId: string;
    organizationId: string;
    expectedVersion: number;
    fromStates: readonly DocumentState[];
    toState: DocumentState;
    action: string;
    actorId: string;
    occurredAt: string;
  }): Promise<StoredDocument>;
  listAudit(documentId: string, organizationId: string): Promise<readonly DocumentAudit[]>;
}

type PrismaDocumentClient = {
  $transaction<T>(callback: (transaction: PrismaDocumentTransaction) => Promise<T>): Promise<T>;
  uploadedDocument: PrismaDocumentTransaction["uploadedDocument"];
  uploadedDocumentAudit: PrismaDocumentTransaction["uploadedDocumentAudit"];
};

type PrismaDocumentTransaction = {
  uploadedDocument: {
    findFirst(input: unknown): Promise<unknown>;
    count(input: unknown): Promise<number>;
    create(input: unknown): Promise<unknown>;
    updateMany(input: unknown): Promise<{ count: number }>;
  };
  uploadedDocumentAudit: {
    aggregate(input: unknown): Promise<{ _max: { sequence: number | null } }>;
    create(input: unknown): Promise<unknown>;
    findMany(input: unknown): Promise<unknown[]>;
  };
};

export function createPrismaDocumentMetadataRepository(
  prismaClient: unknown
): DocumentMetadataRepository {
  const prisma = prismaClient as PrismaDocumentClient;

  async function find(documentId: string, organizationId: string) {
    const value = await prisma.uploadedDocument.findFirst({
      where: { id: documentId, organizationId }
    });
    return value ? mapDocument(value) : null;
  }

  return {
    find,
    async findByUploadKey(organizationId, uploadKeyDigest) {
      const value = await prisma.uploadedDocument.findFirst({
        where: { organizationId, uploadIdempotencyKey: uploadKeyDigest }
      });
      return value ? mapDocument(value) : null;
    },
    countActive(organizationId, ownerId) {
      return prisma.uploadedDocument.count({
        where: {
          organizationId,
          ownerUserId: ownerId,
          state: { notIn: ["replaced", "expired", "deleted"] }
        }
      });
    },
    async create({ document, uploadKeyDigest, requestDigest, actorId }) {
      return prisma.$transaction(async (transaction) => {
        const created = await transaction.uploadedDocument.create({
          data: {
            id: document.id,
            organizationId: document.organizationId,
            ownerUserId: document.ownerId,
            documentType: document.type,
            originalFilename: document.originalFilename,
            objectKey: document.objectKey,
            contentType: document.contentType,
            sizeBytes: document.size,
            contentDigest: document.digest,
            state: document.state,
            version: document.version,
            replacementForId: document.replacementForId,
            uploadIdempotencyKey: uploadKeyDigest,
            requestDigest,
            createdAt: new Date(document.createdAt),
            expiresAt: document.expiresAt ? new Date(document.expiresAt) : null
          }
        });
        await transaction.uploadedDocumentAudit.create({
          data: {
            documentId: document.id,
            organizationId: document.organizationId,
            sequence: 1,
            action: "upload",
            actorUserId: actorId,
            priorState: null,
            newState: document.state,
            occurredAt: new Date(document.createdAt)
          }
        });
        return mapDocument(created);
      });
    },
    async transition(input) {
      return prisma.$transaction(async (transaction) => {
        const currentValue = await transaction.uploadedDocument.findFirst({
          where: { id: input.documentId, organizationId: input.organizationId }
        });
        if (!currentValue) throw new Error("Document is outside the authorized organization.");
        const current = mapDocument(currentValue);
        if (!input.fromStates.includes(current.state)) {
          throw new Error("Document transition is not permitted from its current state.");
        }
        const result = await transaction.uploadedDocument.updateMany({
          where: {
            id: input.documentId,
            organizationId: input.organizationId,
            version: input.expectedVersion,
            state: { in: [...input.fromStates] }
          },
          data: { state: input.toState, version: { increment: 1 } }
        });
        if (result.count !== 1) throw new Error("Document version conflict.");
        const sequence = await transaction.uploadedDocumentAudit.aggregate({
          where: { documentId: input.documentId },
          _max: { sequence: true }
        });
        await transaction.uploadedDocumentAudit.create({
          data: {
            documentId: input.documentId,
            organizationId: input.organizationId,
            sequence: (sequence._max.sequence ?? 0) + 1,
            action: input.action,
            actorUserId: input.actorId,
            priorState: current.state,
            newState: input.toState,
            occurredAt: new Date(input.occurredAt)
          }
        });
        const updated = await transaction.uploadedDocument.findFirst({
          where: { id: input.documentId, organizationId: input.organizationId }
        });
        if (!updated) throw new Error("Document persistence failed.");
        return mapDocument(updated);
      });
    },
    async listAudit(documentId, organizationId) {
      if (!(await find(documentId, organizationId))) {
        throw new Error("Document is outside the authorized organization.");
      }
      const values = await prisma.uploadedDocumentAudit.findMany({
        where: { documentId, organizationId },
        orderBy: { sequence: "asc" }
      });
      return values.map(mapAudit);
    }
  };
}

function mapDocument(value: unknown): StoredDocument {
  const row = value as Record<string, unknown>;
  return {
    id: requiredString(row.id),
    organizationId: requiredString(row.organizationId),
    ownerId: requiredString(row.ownerUserId),
    type: requiredString(row.documentType) as StoredDocument["type"],
    originalFilename: requiredString(row.originalFilename),
    objectKey: requiredString(row.objectKey),
    contentType: requiredString(row.contentType),
    size: requiredNumber(row.sizeBytes),
    digest: requiredString(row.contentDigest),
    state: requiredString(row.state) as DocumentState,
    version: requiredNumber(row.version),
    replacementForId: nullableString(row.replacementForId),
    createdAt: requiredDate(row.createdAt).toISOString(),
    expiresAt: row.expiresAt === null ? null : requiredDate(row.expiresAt).toISOString()
  };
}

function mapAudit(value: unknown): DocumentAudit {
  const row = value as Record<string, unknown>;
  return {
    sequence: requiredNumber(row.sequence),
    documentId: requiredString(row.documentId),
    organizationId: requiredString(row.organizationId),
    action: requiredString(row.action),
    actorId: requiredString(row.actorUserId),
    fromState: row.priorState === null ? null : requiredString(row.priorState) as DocumentState,
    toState: requiredString(row.newState) as DocumentState,
    occurredAt: requiredDate(row.occurredAt).toISOString()
  };
}

function requiredString(value: unknown) {
  if (typeof value !== "string") throw new Error("Invalid persisted document record.");
  return value;
}

function nullableString(value: unknown) {
  return value === null ? null : requiredString(value);
}

function requiredNumber(value: unknown) {
  if (typeof value !== "number" || !Number.isSafeInteger(value)) {
    throw new Error("Invalid persisted document record.");
  }
  return value;
}

function requiredDate(value: unknown) {
  if (!(value instanceof Date) || !Number.isFinite(value.getTime())) {
    throw new Error("Invalid persisted document record.");
  }
  return value;
}
