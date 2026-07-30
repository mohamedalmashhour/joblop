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
    }
  };
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
