import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import type { DocumentRole, DocumentType } from "./documentUpload";

export type DocumentUploadTicket = Readonly<{
  uploadId: string;
  organizationId: string;
  ownerId: string;
  actorId: string;
  role: DocumentRole;
  type: DocumentType;
  filename: string;
  declaredContentType: string;
  idempotencyKey: string;
  replacementForId: string | null;
  expiresAtEpochSeconds: number;
}>;

export function createDocumentUploadContract(options: {
  secret: string;
  nowEpochSeconds: () => number;
  ttlSeconds?: number;
}) {
  if (options.secret.length < 32) throw new Error("Document upload contract secret is required.");
  const ttlSeconds = options.ttlSeconds ?? 300;
  if (!Number.isSafeInteger(ttlSeconds) || ttlSeconds < 30 || ttlSeconds > 900) {
    throw new Error("Document upload contract TTL is invalid.");
  }
  return {
    issue(input: Omit<DocumentUploadTicket, "uploadId" | "expiresAtEpochSeconds">) {
      const ticket: DocumentUploadTicket = {
        ...input,
        uploadId: randomUUID(),
        expiresAtEpochSeconds: options.nowEpochSeconds() + ttlSeconds
      };
      return {
        uploadId: ticket.uploadId,
        expiresAtEpochSeconds: ticket.expiresAtEpochSeconds,
        token: encode(ticket, options.secret)
      };
    },
    verify(token: string, expected: { uploadId: string; organizationId: string; actorId: string }) {
      const ticket = decode(token, options.secret);
      if (
        ticket.uploadId !== expected.uploadId ||
        ticket.organizationId !== expected.organizationId ||
        ticket.actorId !== expected.actorId ||
        ticket.expiresAtEpochSeconds <= options.nowEpochSeconds()
      ) {
        throw new Error("Document upload ticket is invalid or expired.");
      }
      return ticket;
    }
  };
}

function encode(ticket: DocumentUploadTicket, secret: string) {
  const payload = Buffer.from(JSON.stringify(ticket), "utf8").toString("base64url");
  return `${payload}.${signature(payload, secret)}`;
}

function decode(token: string, secret: string): DocumentUploadTicket {
  const [payload, supplied, extra] = token.split(".");
  if (!payload || !supplied || extra || !/^[a-f0-9]{64}$/u.test(supplied)) {
    throw new Error("Document upload ticket is invalid.");
  }
  const expected = signature(payload, secret);
  const left = Buffer.from(supplied, "hex");
  const right = Buffer.from(expected, "hex");
  if (left.length !== right.length || !timingSafeEqual(left, right)) {
    throw new Error("Document upload ticket is invalid.");
  }
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as unknown;
    return validateTicket(parsed);
  } catch {
    throw new Error("Document upload ticket is invalid.");
  }
}

function validateTicket(value: unknown): DocumentUploadTicket {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("invalid");
  }
  const ticket = value as Record<string, unknown>;
  const strings = [
    "uploadId",
    "organizationId",
    "ownerId",
    "actorId",
    "role",
    "type",
    "filename",
    "declaredContentType",
    "idempotencyKey"
  ] as const;
  for (const key of strings) {
    if (typeof ticket[key] !== "string" || ticket[key].length === 0) throw new Error("invalid");
  }
  if (
    !["worker", "employer_admin", "platform_admin"].includes(ticket.role as string) ||
    !["worker_certification", "employer_contract", "invoice_support"].includes(
      ticket.type as string
    ) ||
    !Number.isSafeInteger(ticket.expiresAtEpochSeconds) ||
    (ticket.replacementForId !== null && typeof ticket.replacementForId !== "string")
  ) {
    throw new Error("invalid");
  }
  return ticket as unknown as DocumentUploadTicket;
}

function signature(payload: string, secret: string) {
  return createHmac("sha256", secret).update(`rwos:document-upload:v1:${payload}`).digest("hex");
}
