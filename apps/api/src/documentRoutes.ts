import type { FastifyInstance, FastifyRequest } from "fastify";
import type {
  DocumentRole,
  DocumentType,
  DocumentUploadService,
  StoredDocument
} from "./documentUpload";
import type { createDocumentUploadContract } from "./documentUploadContract";

type UploadContract = ReturnType<typeof createDocumentUploadContract>;
type DocumentOperation =
  | "request_upload"
  | "list"
  | "read"
  | "scan"
  | "decide"
  | "download"
  | "replace"
  | "expire"
  | "delete";

export type DocumentRouteAuthorization = Readonly<{
  actorId: string;
  ownerId: string;
  role: DocumentRole;
}>;

export function registerDocumentRoutes(
  app: FastifyInstance,
  options: {
    service: DocumentUploadService;
    contract: UploadContract;
    authorize(
      request: FastifyRequest,
      input: {
        organizationId: string;
        operation: DocumentOperation;
        ownerId?: string;
        type?: DocumentType;
      }
    ): Promise<DocumentRouteAuthorization | null>;
  }
) {
  app.post("/organizations/:organizationId/document-uploads", async (request, reply) => {
    const organizationId = routeParam(request.params, "organizationId");
    const body = record(request.body);
    const ownerId = string(body.ownerId);
    const type = documentType(body.type);
    const filename = string(body.filename);
    const declaredContentType = string(body.declaredContentType);
    const idempotencyKey = string(body.idempotencyKey);
    const replacementForId = nullableString(body.replacementForId);
    if (!ownerId || !type || !filename || !declaredContentType || !idempotencyKey) {
      return invalid(reply);
    }
    const authorization = await options.authorize(request, {
      organizationId,
      operation: "request_upload",
      ownerId,
      type
    });
    if (!authorization || authorization.ownerId !== ownerId) return denied(reply);
    const issued = options.contract.issue({
      organizationId,
      ownerId,
      actorId: authorization.actorId,
      role: authorization.role,
      type,
      filename,
      declaredContentType,
      idempotencyKey,
      replacementForId
    });
    return reply.code(201).send({
      upload: {
        id: issued.uploadId,
        completionPath: `/organizations/${organizationId}/document-uploads/${issued.uploadId}`,
        token: issued.token,
        expiresAtEpochSeconds: issued.expiresAtEpochSeconds
      }
    });
  });

  app.put("/organizations/:organizationId/document-uploads/:uploadId", async (request, reply) => {
    const organizationId = routeParam(request.params, "organizationId");
    const uploadId = routeParam(request.params, "uploadId");
    const body = record(request.body);
    const token = string(body.token);
    const contentBase64 = string(body.contentBase64);
    if (!token || !contentBase64 || contentBase64.length > 14_000_000) return invalid(reply);
    const preliminary = decodeUntrustedTicketActor(token);
    if (!preliminary) return invalid(reply);
    const authorization = await options.authorize(request, {
      organizationId,
      operation: "request_upload",
      ownerId: preliminary.ownerId,
      type: preliminary.type
    });
    if (!authorization) return denied(reply);
    try {
      const ticket = options.contract.verify(token, {
        uploadId,
        organizationId,
        actorId: authorization.actorId
      });
      const document = await options.service.upload({
        organizationId,
        ownerId: ticket.ownerId,
        actorId: authorization.actorId,
        role: authorization.role,
        type: ticket.type,
        filename: ticket.filename,
        declaredContentType: ticket.declaredContentType,
        bytes: decodeBase64(contentBase64),
        idempotencyKey: ticket.idempotencyKey,
        ...(ticket.replacementForId ? { replacementForId: ticket.replacementForId } : {})
      });
      const scanned = await options.service.scan({
        documentId: document.id,
        organizationId,
        actorId: authorization.actorId,
        expectedVersion: document.version
      });
      return reply.code(201).send({ document: publicDocument(scanned) });
    } catch (error) {
      return documentFailure(reply, error);
    }
  });

  app.get("/organizations/:organizationId/documents", async (request, reply) => {
    const organizationId = routeParam(request.params, "organizationId");
    const ownerId = optionalQuery(request.query, "ownerId");
    const authorization = await options.authorize(request, {
      organizationId,
      operation: "list",
      ...(ownerId ? { ownerId } : {})
    });
    if (!authorization) return denied(reply);
    const documents = await options.service.list(
      organizationId,
      authorization.role === "worker" ? authorization.ownerId : ownerId
    );
    return reply.send({ documents: documents.map(publicDocument) });
  });

  app.get("/organizations/:organizationId/documents/:documentId", async (request, reply) => {
    const result = await authorizedDocument(request, options, "read");
    if (!result) return denied(reply);
    return reply.send({ document: publicDocument(result.document) });
  });

  app.get("/organizations/:organizationId/documents/:documentId/audit", async (request, reply) => {
    const result = await authorizedDocument(request, options, "read");
    if (!result) return denied(reply);
    const audit = await options.service.listAudit(result.document.id, result.document.organizationId);
    return reply.send({ audit });
  });

  app.post("/organizations/:organizationId/documents/:documentId/decision", async (request, reply) => {
    const result = await authorizedDocument(request, options, "decide");
    if (!result) return denied(reply);
    const body = record(request.body);
    const decision = body.decision === "approve" || body.decision === "reject" ? body.decision : null;
    const expectedVersion = integer(body.expectedVersion);
    if (!decision || expectedVersion === null) return invalid(reply);
    try {
      const document = await options.service.decide({
        documentId: result.document.id,
        organizationId: result.document.organizationId,
        actorId: result.authorization.actorId,
        role: result.authorization.role,
        decision,
        expectedVersion
      });
      return reply.send({ document: publicDocument(document) });
    } catch (error) {
      return documentFailure(reply, error);
    }
  });

  app.post("/organizations/:organizationId/documents/:documentId/download-reference", async (request, reply) => {
    const result = await authorizedDocument(request, options, "download");
    if (!result) return denied(reply);
    try {
      const now = Math.floor(Date.now() / 1000);
      const reference = await options.service.createDownloadReference({
        documentId: result.document.id,
        organizationId: result.document.organizationId,
        expiresAtEpochSeconds: now + 300
      });
      return reply.send({ reference, expiresAtEpochSeconds: now + 300 });
    } catch (error) {
      return documentFailure(reply, error);
    }
  });

  app.post("/organizations/:organizationId/documents/:documentId/download", async (request, reply) => {
    const result = await authorizedDocument(request, options, "download");
    if (!result) return denied(reply);
    const reference = string(record(request.body).reference);
    if (!reference) return invalid(reply);
    try {
      const verified = await options.service.verifyDownloadReference(reference);
      if (
        verified.documentId !== result.document.id ||
        verified.organizationId !== result.document.organizationId
      ) {
        return denied(reply);
      }
      const downloaded = await options.service.download({
        documentId: result.document.id,
        organizationId: result.document.organizationId,
        actorId: result.authorization.actorId,
        role: result.authorization.role,
        ownerId: result.document.ownerId
      });
      return reply.send({
        document: publicDocument(downloaded.document),
        contentBase64: Buffer.from(downloaded.bytes).toString("base64")
      });
    } catch (error) {
      return documentFailure(reply, error);
    }
  });

  app.post("/organizations/:organizationId/documents/:documentId/replace", async (request, reply) => {
    const result = await authorizedDocument(request, options, "replace");
    if (!result) return denied(reply);
    const body = record(request.body);
    const replacementDocumentId = string(body.replacementDocumentId);
    const expectedVersion = integer(body.expectedVersion);
    if (!replacementDocumentId || expectedVersion === null) return invalid(reply);
    try {
      const document = await options.service.markReplaced({
        documentId: result.document.id,
        replacementDocumentId,
        organizationId: result.document.organizationId,
        actorId: result.authorization.actorId,
        role: result.authorization.role,
        expectedVersion
      });
      return reply.send({ document: publicDocument(document) });
    } catch (error) {
      return documentFailure(reply, error);
    }
  });

  for (const action of ["expire", "delete"] as const) {
    app.post(`/organizations/:organizationId/documents/:documentId/${action}`, async (request, reply) => {
      const result = await authorizedDocument(request, options, action);
      if (!result) return denied(reply);
      const expectedVersion = integer(record(request.body).expectedVersion);
      if (expectedVersion === null) return invalid(reply);
      try {
        const document = await (action === "expire"
          ? options.service.expire({
              documentId: result.document.id,
              organizationId: result.document.organizationId,
              actorId: result.authorization.actorId,
              role: result.authorization.role,
              expectedVersion
            })
          : options.service.remove({
              documentId: result.document.id,
              organizationId: result.document.organizationId,
              actorId: result.authorization.actorId,
              role: result.authorization.role,
              expectedVersion
            }));
        return reply.send({ document: publicDocument(document) });
      } catch (error) {
        return documentFailure(reply, error);
      }
    });
  }
}

async function authorizedDocument(
  request: FastifyRequest,
  options: Parameters<typeof registerDocumentRoutes>[1],
  operation: DocumentOperation
) {
  const organizationId = routeParam(request.params, "organizationId");
  const documentId = routeParam(request.params, "documentId");
  let document: StoredDocument;
  try {
    document = await options.service.get(documentId, organizationId);
  } catch {
    return null;
  }
  const authorization = await options.authorize(request, {
    organizationId,
    operation,
    ownerId: document.ownerId,
    type: document.type
  });
  return authorization ? { document, authorization } : null;
}

function publicDocument(document: StoredDocument) {
  return Object.fromEntries(
    Object.entries(document).filter(([key]) => key !== "objectKey")
  );
}

function decodeUntrustedTicketActor(token: string) {
  try {
    const payload = token.split(".")[0];
    if (!payload) return null;
    const value = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Record<string, unknown>;
    const ownerId = string(value.ownerId);
    const type = documentType(value.type);
    return ownerId && type ? { ownerId, type } : null;
  } catch {
    return null;
  }
}

function decodeBase64(value: string) {
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/u.test(value)) {
    throw new Error("Document content encoding is invalid.");
  }
  return new Uint8Array(Buffer.from(value, "base64"));
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function string(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function nullableString(value: unknown) {
  return value === null || value === undefined ? null : string(value);
}

function integer(value: unknown) {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 1 ? value : null;
}

function documentType(value: unknown): DocumentType | null {
  return ["worker_certification", "employer_contract", "invoice_support"].includes(value as string)
    ? (value as DocumentType)
    : null;
}

function routeParam(value: unknown, key: string) {
  return string(record(value)[key]) ?? "";
}

function optionalQuery(value: unknown, key: string) {
  return string(record(value)[key]) ?? undefined;
}

function denied(reply: { code(status: number): { send(value: unknown): unknown } }) {
  return reply.code(404).send({ error: "RWOS_RESOURCE_UNAVAILABLE", message: "Resource unavailable." });
}

function invalid(reply: { code(status: number): { send(value: unknown): unknown } }) {
  return reply.code(400).send({ error: "RWOS_INVALID_DOCUMENT_REQUEST", message: "Invalid document request." });
}

function documentFailure(
  reply: { code(status: number): { send(value: unknown): unknown } },
  error: unknown
) {
  const message = error instanceof Error ? error.message : "";
  const conflict = /conflict|already exists|current state/u.test(message);
  return reply.code(conflict ? 409 : 400).send({
    error: conflict ? "RWOS_DOCUMENT_CONFLICT" : "RWOS_INVALID_DOCUMENT_REQUEST",
    message: conflict ? "Document state conflict." : "Invalid document request."
  });
}
