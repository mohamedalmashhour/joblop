import { createHash } from "node:crypto";
import {
  canPerformInvoiceAction,
  canTransitionInvoice,
  type InvoiceAction,
  type InvoiceActorRole,
  type InvoiceCalculationSnapshot,
  type InvoiceNumberingConfiguration,
  type InvoiceStatus
} from "@rwos/shared";

export type DurableInvoice = Readonly<{
  id: string;
  organizationId: string;
  timesheetId: string;
  timesheetVersion: number;
  status: InvoiceStatus;
  invoiceNumber: string | null;
  currency: "CAD";
  calculationSnapshot: InvoiceCalculationSnapshot;
  subtotalMinor: number;
  taxMinor: number;
  creditMinor: number;
  totalMinor: number;
  version: number;
  issuedAt: string | null;
  dueAt: string | null;
  createdAt: string;
}>;

export type DurableInvoiceAudit = Readonly<{
  sequence: number;
  invoiceId: string;
  organizationId: string;
  action: string;
  actorReference: string;
  actorRole: string;
  priorStatus: InvoiceStatus | null;
  newStatus: InvoiceStatus;
  reason: string | null;
  occurredAt: string;
}>;
export type DurableInvoiceDelivery = Readonly<{
  id: string;
  invoiceId: string;
  organizationId: string;
  recipientAlias: string;
  documentDigest: string;
  status: string;
  acceptedAt: string;
}>;
export type DurableCreditNote = Readonly<{
  id: string;
  invoiceId: string;
  organizationId: string;
  creditNoteNumber: string;
  status: "draft" | "approved" | "rejected" | "issued";
  version: number;
  reason: string;
  amountMinor: number;
  currency: "CAD";
  approvedAt: string | null;
  rejectedAt: string | null;
  rejectedReason: string | null;
  issuedAt: string;
}>;

export interface InvoiceRepository {
  createFromLockedTimesheet(input: {
    id: string;
    organizationId: string;
    calculation: InvoiceCalculationSnapshot;
    actorReference: string;
    actorRole: InvoiceActorRole;
    idempotencyKey: string;
  }): Promise<DurableInvoice>;
  list(organizationId: string, statuses?: readonly InvoiceStatus[]): Promise<readonly DurableInvoice[]>;
  get(invoiceId: string, organizationId: string): Promise<DurableInvoice | null>;
  transition(input: {
    invoiceId: string;
    organizationId: string;
    expectedVersion: number;
    toStatus: InvoiceStatus;
    actorReference: string;
    actorRole: InvoiceActorRole;
    reason?: string;
    numbering?: InvoiceNumberingConfiguration;
  }): Promise<DurableInvoice>;
  listAudit(invoiceId: string, organizationId: string): Promise<readonly DurableInvoiceAudit[]>;
  recordFakeDelivery(input: {
    id: string;
    invoiceId: string;
    organizationId: string;
    expectedVersion: number;
    recipientAlias: string;
    documentDigest: string;
    idempotencyKey: string;
    actorReference: string;
    actorRole: InvoiceActorRole;
  }): Promise<{ invoice: DurableInvoice; receipt: DurableInvoiceDelivery }>;
  listDeliveries(invoiceId: string, organizationId: string): Promise<readonly DurableInvoiceDelivery[]>;
  createCreditNote(input: {
    id: string;
    invoiceId: string;
    organizationId: string;
    amountMinor: number;
    reason: string;
    idempotencyKey: string;
    actorReference: string;
    actorRole: InvoiceActorRole;
  }): Promise<DurableCreditNote>;
  transitionCreditNote(input: {
    creditNoteId: string;
    invoiceId: string;
    organizationId: string;
    expectedVersion: number;
    action: "approve" | "reject" | "issue";
    reason?: string;
    actorReference: string;
    actorRole: InvoiceActorRole;
  }): Promise<DurableCreditNote>;
  listCreditNotes(invoiceId: string, organizationId: string): Promise<readonly DurableCreditNote[]>;
}

type Delegate = {
  findFirst(input: unknown): Promise<unknown>;
  findMany(input: unknown): Promise<unknown[]>;
  create(input: unknown): Promise<unknown>;
  updateMany(input: unknown): Promise<{ count: number }>;
};
type Transaction = {
  timesheet: Pick<Delegate, "findFirst">;
  invoice: Delegate;
  invoiceAuditEntry: Delegate & {
    aggregate(input: unknown): Promise<{ _max: { sequence: number | null } }>;
  };
  invoiceNumberSequence: {
    upsert(input: unknown): Promise<{ lastValue: number }>;
  };
  invoiceDeliveryReceipt: Delegate;
  invoiceCreditNote: Delegate & {
    aggregate(input: unknown): Promise<{ _sum: { amountMinor: bigint | null } }>;
  };
};
type Client = Transaction & {
  $transaction<T>(callback: (transaction: Transaction) => Promise<T>): Promise<T>;
};

export function createPrismaInvoiceRepository(prismaClient: unknown): InvoiceRepository {
  const prisma = prismaClient as Client;

  async function get(invoiceId: string, organizationId: string) {
    const value = await prisma.invoice.findFirst({
      where: { id: invoiceId, organizationId }
    });
    return value ? mapInvoice(value) : null;
  }

  return {
    async createFromLockedTimesheet(input) {
      assertAuthorized(input.actorRole, "create");
      if (input.calculation.source.organizationId !== input.organizationId) {
        throw new Error("Invoice source is outside the authorized organization.");
      }
      const idempotencyKeyDigest = digest(input.idempotencyKey);
      const requestDigest = digest(stableJson({
        id: input.id,
        organizationId: input.organizationId,
        calculation: input.calculation
      }));
      return prisma.$transaction(async (transaction) => {
        const replay = await transaction.invoice.findFirst({
          where: { organizationId: input.organizationId, idempotencyKeyDigest }
        });
        if (replay) {
          const row = replay as Record<string, unknown>;
          if (row.requestDigest !== requestDigest || row.id !== input.id) {
            throw new Error("Invoice creation idempotency conflict.");
          }
          return mapInvoice(replay);
        }
        const timesheet = await transaction.timesheet.findFirst({
          where: {
            id: input.calculation.source.timesheetId,
            organizationId: input.organizationId,
            status: "locked",
            version: input.calculation.source.timesheetVersion
          },
          select: { id: true }
        });
        if (!timesheet) throw new Error("Invoice requires an approved and locked timesheet.");
        const created = await transaction.invoice.create({
          data: {
            id: input.id,
            organizationId: input.organizationId,
            timesheetId: input.calculation.source.timesheetId,
            timesheetVersion: input.calculation.source.timesheetVersion,
            status: "draft",
            currency: "CAD",
            issuerModel: input.calculation.issuer.issuerModel,
            issuerSnapshot: input.calculation.issuer,
            recipientSnapshot: { organizationId: input.organizationId, synthetic: true },
            taxSnapshot: input.calculation.tax,
            configurationSnapshot: input.calculation.rules,
            calculationSnapshot: input.calculation,
            subtotalMinor: BigInt(input.calculation.subtotal.amountMinor),
            taxMinor: BigInt(input.calculation.taxes.amountMinor),
            creditMinor: BigInt(input.calculation.credits.amountMinor),
            totalMinor: BigInt(input.calculation.total.amountMinor),
            idempotencyKeyDigest,
            requestDigest,
            version: 1
          }
        });
        await transaction.invoiceAuditEntry.create({
          data: auditData(input.id, input.organizationId, 1, "create", input.actorReference, input.actorRole, null, "draft")
        });
        return mapInvoice(created);
      });
    },
    async list(organizationId, statuses) {
      const values = await prisma.invoice.findMany({
        where: {
          organizationId,
          ...(statuses?.length ? { status: { in: [...statuses] } } : {})
        },
        orderBy: [{ createdAt: "desc" }, { id: "asc" }]
      });
      return values.map(mapInvoice);
    },
    get,
    async transition(input) {
      return prisma.$transaction(async (transaction) => {
        const value = await transaction.invoice.findFirst({
          where: { id: input.invoiceId, organizationId: input.organizationId }
        });
        if (!value) throw new Error("Invoice is outside the authorized organization.");
        const current = mapInvoice(value);
        const action = transitionAction(current.status, input.toStatus);
        assertAuthorized(input.actorRole, action);
        if (!canTransitionInvoice(current.status, input.toStatus)) {
          throw new Error("Invoice transition is not permitted.");
        }
        let invoiceNumber = current.invoiceNumber;
        let issuedAt: Date | undefined;
        let numberScopeYear: number | undefined;
        if (input.toStatus === "issued") {
          const numbering = input.numbering;
          if (!numbering || numbering.organizationId !== input.organizationId) {
            throw new Error("Invoice numbering policy is missing.");
          }
          const sequence = await transaction.invoiceNumberSequence.upsert({
            where: {
              organizationId_scopeYear_prefix: {
                organizationId: input.organizationId,
                scopeYear: numbering.scopeYear,
                prefix: numbering.prefix
              }
            },
            create: {
              organizationId: input.organizationId,
              scopeYear: numbering.scopeYear,
              prefix: numbering.prefix,
              lastValue: 1
            },
            update: { lastValue: { increment: 1 } },
            select: { lastValue: true }
          });
          invoiceNumber = `${numbering.prefix}-${numbering.scopeYear}-${sequence.lastValue.toString().padStart(6, "0")}`;
          issuedAt = new Date();
          numberScopeYear = numbering.scopeYear;
        }
        const updated = await transaction.invoice.updateMany({
          where: {
            id: input.invoiceId,
            organizationId: input.organizationId,
            version: input.expectedVersion,
            status: current.status
          },
          data: {
            status: input.toStatus,
            version: { increment: 1 },
            ...(invoiceNumber ? { invoiceNumber } : {}),
            ...(issuedAt ? { issuedAt } : {}),
            ...(numberScopeYear ? { numberScopeYear } : {})
          }
        });
        if (updated.count !== 1) throw new Error("Invoice version conflict.");
        const sequence = await transaction.invoiceAuditEntry.aggregate({
          where: { invoiceId: input.invoiceId },
          _max: { sequence: true }
        });
        await transaction.invoiceAuditEntry.create({
          data: auditData(
            input.invoiceId,
            input.organizationId,
            (sequence._max.sequence ?? 0) + 1,
            action,
            input.actorReference,
            input.actorRole,
            current.status,
            input.toStatus,
            input.reason
          )
        });
        const result = await transaction.invoice.findFirst({
          where: { id: input.invoiceId, organizationId: input.organizationId }
        });
        if (!result) throw new Error("Invoice persistence failed.");
        return mapInvoice(result);
      });
    },
    async listAudit(invoiceId, organizationId) {
      if (!(await get(invoiceId, organizationId))) {
        throw new Error("Invoice is outside the authorized organization.");
      }
      const values = await prisma.invoiceAuditEntry.findMany({
        where: { invoiceId, organizationId },
        orderBy: { sequence: "asc" }
      });
      return values.map(mapAudit);
    },
    async recordFakeDelivery(input) {
      assertAuthorized(input.actorRole, "send");
      if (!/^[a-f0-9]{64}$/u.test(input.documentDigest)) {
        throw new Error("Invoice document digest is invalid.");
      }
      if (!input.recipientAlias.trim() || input.recipientAlias.length > 200) {
        throw new Error("Invoice delivery recipient alias is invalid.");
      }
      const idempotencyKeyDigest = digest(input.idempotencyKey);
      return prisma.$transaction(async (transaction) => {
        const existing = await transaction.invoiceDeliveryReceipt.findFirst({
          where: { organizationId: input.organizationId, idempotencyKeyDigest }
        });
        if (existing) {
          const receipt = mapDelivery(existing);
          if (
            receipt.invoiceId !== input.invoiceId ||
            receipt.documentDigest !== input.documentDigest ||
            receipt.recipientAlias !== input.recipientAlias
          ) {
            throw new Error("Invoice delivery idempotency conflict.");
          }
          const invoice = await transaction.invoice.findFirst({
            where: { id: input.invoiceId, organizationId: input.organizationId }
          });
          if (!invoice) throw new Error("Invoice is outside the authorized organization.");
          return { invoice: mapInvoice(invoice), receipt };
        }
        const value = await transaction.invoice.findFirst({
          where: { id: input.invoiceId, organizationId: input.organizationId }
        });
        if (!value) throw new Error("Invoice is outside the authorized organization.");
        const current = mapInvoice(value);
        if (current.status !== "issued") throw new Error("Invoice delivery requires issued state.");
        const acceptedAt = new Date();
        const receiptValue = await transaction.invoiceDeliveryReceipt.create({
          data: {
            id: input.id,
            invoiceId: input.invoiceId,
            organizationId: input.organizationId,
            providerBoundary: "local_fake",
            recipientAlias: input.recipientAlias,
            documentDigest: input.documentDigest,
            idempotencyKeyDigest,
            status: "accepted",
            acceptedAt
          }
        });
        const updated = await transaction.invoice.updateMany({
          where: {
            id: input.invoiceId,
            organizationId: input.organizationId,
            version: input.expectedVersion,
            status: "issued"
          },
          data: { status: "sent", sentAt: acceptedAt, version: { increment: 1 } }
        });
        if (updated.count !== 1) throw new Error("Invoice version conflict.");
        await appendAudit(transaction, {
          invoiceId: input.invoiceId,
          organizationId: input.organizationId,
          action: "send",
          actorReference: input.actorReference,
          actorRole: input.actorRole,
          priorStatus: "issued",
          newStatus: "sent"
        });
        const invoice = await transaction.invoice.findFirst({
          where: { id: input.invoiceId, organizationId: input.organizationId }
        });
        if (!invoice) throw new Error("Invoice persistence failed.");
        return { invoice: mapInvoice(invoice), receipt: mapDelivery(receiptValue) };
      });
    },
    async listDeliveries(invoiceId, organizationId) {
      if (!(await get(invoiceId, organizationId))) {
        throw new Error("Invoice is outside the authorized organization.");
      }
      const values = await prisma.invoiceDeliveryReceipt.findMany({
        where: { invoiceId, organizationId },
        orderBy: [{ acceptedAt: "desc" }, { id: "asc" }]
      });
      return values.map(mapDelivery);
    },
    async createCreditNote(input) {
      assertAuthorized(input.actorRole, "create_credit_note");
      if (!Number.isSafeInteger(input.amountMinor) || input.amountMinor <= 0) {
        throw new Error("Credit note amount is invalid.");
      }
      if (!input.reason.trim()) throw new Error("Credit note reason is required.");
      const idempotencyKeyDigest = digest(input.idempotencyKey);
      return prisma.$transaction(async (transaction) => {
        const existing = await transaction.invoiceCreditNote.findFirst({
          where: { organizationId: input.organizationId, idempotencyKeyDigest }
        });
        if (existing) {
          const note = mapCreditNote(existing);
          if (
            note.invoiceId !== input.invoiceId ||
            note.amountMinor !== input.amountMinor ||
            note.reason !== input.reason
          ) {
            throw new Error("Credit note idempotency conflict.");
          }
          return note;
        }
        const value = await transaction.invoice.findFirst({
          where: { id: input.invoiceId, organizationId: input.organizationId }
        });
        if (!value) throw new Error("Invoice is outside the authorized organization.");
        const invoice = mapInvoice(value);
        if (
          !["issued", "sent", "viewed", "partially_paid", "paid", "overdue", "disputed"].includes(
            invoice.status
          ) ||
          !invoice.invoiceNumber
        ) {
          throw new Error("Credit notes require an issued invoice.");
        }
        const totals = await transaction.invoiceCreditNote.aggregate({
          where: {
            invoiceId: input.invoiceId,
            organizationId: input.organizationId,
            status: { in: ["draft", "approved", "issued"] }
          },
          _sum: { amountMinor: true }
        });
        const credited = safeBigInt(totals._sum.amountMinor ?? 0n);
        if (credited + input.amountMinor > invoice.totalMinor) {
          throw new Error("Credit note exceeds the eligible invoice balance.");
        }
        const noteValue = await transaction.invoiceCreditNote.create({
          data: {
            id: input.id,
            invoiceId: input.invoiceId,
            organizationId: input.organizationId,
            creditNoteNumber: `CN-${invoice.invoiceNumber}-${idempotencyKeyDigest.slice(0, 10).toUpperCase()}`,
            status: "draft",
            reason: input.reason,
            calculationSnapshot: {
              originalInvoiceNumber: invoice.invoiceNumber,
              originalTotalMinor: invoice.totalMinor,
              priorCreditedMinor: credited,
              creditMinor: input.amountMinor
            },
            amountMinor: BigInt(input.amountMinor),
            currency: "CAD",
            idempotencyKeyDigest,
            issuedAt: new Date()
          }
        });
        await appendAudit(transaction, {
          invoiceId: input.invoiceId,
          organizationId: input.organizationId,
          action: "create_credit_note",
          actorReference: input.actorReference,
          actorRole: input.actorRole,
          priorStatus: invoice.status,
          newStatus: invoice.status,
          ...(input.reason ? { reason: input.reason } : {})
        });
        return mapCreditNote(noteValue);
      });
    },
    async transitionCreditNote(input) {
      assertAuthorized(
        input.actorRole,
        input.action === "issue" ? "issue" : "approve"
      );
      if (input.action === "reject" && !input.reason?.trim()) {
        throw new Error("Credit note rejection reason is required.");
      }
      return prisma.$transaction(async (transaction) => {
        const noteValue = await transaction.invoiceCreditNote.findFirst({
          where: {
            id: input.creditNoteId,
            invoiceId: input.invoiceId,
            organizationId: input.organizationId
          }
        });
        if (!noteValue) throw new Error("Credit note is outside the authorized organization.");
        const note = mapCreditNote(noteValue);
        if (note.version !== input.expectedVersion) throw new Error("Credit note version conflict.");
        const valid =
          (input.action === "approve" && note.status === "draft") ||
          (input.action === "reject" && ["draft", "approved"].includes(note.status)) ||
          (input.action === "issue" && note.status === "approved");
        if (!valid) throw new Error("Credit note transition is invalid.");
        const invoiceValue = await transaction.invoice.findFirst({
          where: { id: input.invoiceId, organizationId: input.organizationId }
        });
        if (!invoiceValue) throw new Error("Invoice is outside the authorized organization.");
        const invoice = mapInvoice(invoiceValue);
        if (!invoice.invoiceNumber) throw new Error("Credit note requires an issued invoice.");
        const now = new Date();
        const nextStatus =
          input.action === "approve"
            ? "approved"
            : input.action === "reject"
              ? "rejected"
              : "issued";
        const updated = await transaction.invoiceCreditNote.updateMany({
          where: {
            id: note.id,
            invoiceId: note.invoiceId,
            organizationId: note.organizationId,
            version: input.expectedVersion,
            status: note.status
          },
          data: {
            status: nextStatus,
            version: { increment: 1 },
            ...(input.action === "approve" ? { approvedAt: now } : {}),
            ...(input.action === "reject"
              ? { rejectedAt: now, rejectedReason: input.reason!.trim() }
              : {})
          }
        });
        if (updated.count !== 1) throw new Error("Credit note concurrency conflict.");
        await appendAudit(transaction, {
          invoiceId: input.invoiceId,
          organizationId: input.organizationId,
          action: `credit_note_${input.action}`,
          actorReference: input.actorReference,
          actorRole: input.actorRole,
          priorStatus: invoice.status,
          newStatus: invoice.status,
          ...(input.reason ? { reason: input.reason } : {})
        });
        const result = await transaction.invoiceCreditNote.findFirst({
          where: {
            id: input.creditNoteId,
            invoiceId: input.invoiceId,
            organizationId: input.organizationId
          }
        });
        if (!result) throw new Error("Credit note persistence failed.");
        return mapCreditNote(result);
      });
    },
    async listCreditNotes(invoiceId, organizationId) {
      if (!(await get(invoiceId, organizationId))) {
        throw new Error("Invoice is outside the authorized organization.");
      }
      const values = await prisma.invoiceCreditNote.findMany({
        where: { invoiceId, organizationId },
        orderBy: [{ createdAt: "desc" }, { id: "asc" }]
      });
      return values.map(mapCreditNote);
    }
  };
}

async function appendAudit(
  transaction: Transaction,
  input: {
    invoiceId: string;
    organizationId: string;
    action: string;
    actorReference: string;
    actorRole: string;
    priorStatus: InvoiceStatus;
    newStatus: InvoiceStatus;
    reason?: string;
  }
) {
  const sequence = await transaction.invoiceAuditEntry.aggregate({
    where: { invoiceId: input.invoiceId },
    _max: { sequence: true }
  });
  await transaction.invoiceAuditEntry.create({
    data: auditData(
      input.invoiceId,
      input.organizationId,
      (sequence._max.sequence ?? 0) + 1,
      input.action,
      input.actorReference,
      input.actorRole,
      input.priorStatus,
      input.newStatus,
      input.reason
    )
  });
}

function mapInvoice(value: unknown): DurableInvoice {
  const row = value as Record<string, unknown>;
  return {
    id: text(row.id),
    organizationId: text(row.organizationId),
    timesheetId: text(row.timesheetId),
    timesheetVersion: integer(row.timesheetVersion),
    status: text(row.status) as InvoiceStatus,
    invoiceNumber: nullableText(row.invoiceNumber),
    currency: "CAD",
    calculationSnapshot: row.calculationSnapshot as InvoiceCalculationSnapshot,
    subtotalMinor: safeBigInt(row.subtotalMinor),
    taxMinor: safeBigInt(row.taxMinor),
    creditMinor: safeBigInt(row.creditMinor),
    totalMinor: safeBigInt(row.totalMinor),
    version: integer(row.version),
    issuedAt: nullableDate(row.issuedAt),
    dueAt: nullableDate(row.dueAt),
    createdAt: date(row.createdAt).toISOString()
  };
}

function mapAudit(value: unknown): DurableInvoiceAudit {
  const row = value as Record<string, unknown>;
  return {
    sequence: integer(row.sequence),
    invoiceId: text(row.invoiceId),
    organizationId: text(row.organizationId),
    action: text(row.action),
    actorReference: text(row.actorReference),
    actorRole: text(row.actorRole),
    priorStatus: nullableText(row.priorStatus) as InvoiceStatus | null,
    newStatus: text(row.newStatus) as InvoiceStatus,
    reason: nullableText(row.reason),
    occurredAt: date(row.occurredAt).toISOString()
  };
}

function mapDelivery(value: unknown): DurableInvoiceDelivery {
  const row = value as Record<string, unknown>;
  return {
    id: text(row.id),
    invoiceId: text(row.invoiceId),
    organizationId: text(row.organizationId),
    recipientAlias: text(row.recipientAlias),
    documentDigest: text(row.documentDigest),
    status: text(row.status),
    acceptedAt: date(row.acceptedAt).toISOString()
  };
}

function mapCreditNote(value: unknown): DurableCreditNote {
  const row = value as Record<string, unknown>;
  return {
    id: text(row.id),
    invoiceId: text(row.invoiceId),
    organizationId: text(row.organizationId),
    creditNoteNumber: text(row.creditNoteNumber),
    status: creditNoteStatus(row.status),
    version: positiveInteger(row.version),
    reason: text(row.reason),
    amountMinor: safeBigInt(row.amountMinor),
    currency: "CAD",
    approvedAt: nullableDate(row.approvedAt),
    rejectedAt: nullableDate(row.rejectedAt),
    rejectedReason: nullableText(row.rejectedReason),
    issuedAt: date(row.issuedAt).toISOString()
  };
}

function auditData(
  invoiceId: string,
  organizationId: string,
  sequence: number,
  action: string,
  actorReference: string,
  actorRole: string,
  priorStatus: InvoiceStatus | null,
  newStatus: InvoiceStatus,
  reason?: string
) {
  return {
    invoiceId,
    organizationId,
    sequence,
    action,
    actorReference,
    actorRole,
    priorStatus,
    newStatus,
    reason: reason?.trim() || null,
    occurredAt: new Date()
  };
}

function transitionAction(from: InvoiceStatus, to: InvoiceStatus): InvoiceAction {
  if (from === "draft" && to === "approved") return "approve";
  if (from === "approved" && to === "issued") return "issue";
  if (to === "sent") return "send";
  if (to === "viewed") return "view";
  if (to === "disputed") return "dispute";
  if (to === "voided") return "void";
  if (["partially_paid", "paid", "refunded"].includes(to)) return "record_payment_evidence";
  throw new Error("Invoice transition has no authorized action.");
}

function assertAuthorized(role: InvoiceActorRole, action: InvoiceAction) {
  if (!canPerformInvoiceAction(role, action)) {
    throw new Error("Invoice action is not authorized.");
  }
}

function digest(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function stableJson(value: unknown) {
  return JSON.stringify(value, (_key, item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return item;
    return Object.fromEntries(Object.entries(item).sort(([left], [right]) => left.localeCompare(right)));
  });
}

function text(value: unknown) {
  if (typeof value !== "string") throw new Error("Invalid persisted invoice.");
  return value;
}

function nullableText(value: unknown) {
  return value === null || value === undefined ? null : text(value);
}

function integer(value: unknown) {
  if (typeof value !== "number" || !Number.isSafeInteger(value)) {
    throw new Error("Invalid persisted invoice.");
  }
  return value;
}
function positiveInteger(value: unknown) {
  const result = integer(value);
  if (result < 1) throw new Error("Invalid persisted invoice.");
  return result;
}

function creditNoteStatus(value: unknown): DurableCreditNote["status"] {
  if (!["draft", "approved", "rejected", "issued"].includes(value as string)) {
    throw new Error("Invalid persisted credit note.");
  }
  return value as DurableCreditNote["status"];
}

function safeBigInt(value: unknown) {
  if (typeof value !== "bigint" || value > BigInt(Number.MAX_SAFE_INTEGER) || value < BigInt(Number.MIN_SAFE_INTEGER)) {
    throw new Error("Persisted invoice amount exceeds safe API range.");
  }
  return Number(value);
}

function date(value: unknown) {
  if (!(value instanceof Date) || !Number.isFinite(value.getTime())) {
    throw new Error("Invalid persisted invoice.");
  }
  return value;
}

function nullableDate(value: unknown) {
  return value === null || value === undefined ? null : date(value).toISOString();
}
