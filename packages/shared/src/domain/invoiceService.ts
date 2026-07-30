import {
  canPerformInvoiceAction,
  canTransitionInvoice,
  type InvoiceAction,
  type InvoiceActorRole,
  type InvoiceCalculationSnapshot,
  type InvoiceNumberingConfiguration,
  type InvoiceStatus
} from "./invoice";

export type LocalInvoice = Readonly<{
  id: string;
  organizationId: string;
  status: InvoiceStatus;
  number: string | null;
  version: number;
  calculation: InvoiceCalculationSnapshot;
  issuedAt: string | null;
  correctionOfInvoiceId: string | null;
}>;

export type InvoiceAuditEntry = Readonly<{
  sequence: number;
  invoiceId: string;
  organizationId: string;
  action: InvoiceAction;
  actorRole: InvoiceActorRole;
  occurredAt: string;
  fromStatus: InvoiceStatus | null;
  toStatus: InvoiceStatus;
}>;

export type InvoiceCreditNote = Readonly<{
  id: string;
  organizationId: string;
  invoiceId: string;
  reason: string;
  amountMinor: number;
  currency: "CAD";
  createdAt: string;
}>;

export type LocalInvoiceService = Readonly<{
  create(input: {
    id: string;
    organizationId: string;
    role: InvoiceActorRole;
    calculation: InvoiceCalculationSnapshot;
    idempotencyKey: string;
  }): LocalInvoice;
  get(invoiceId: string, authorizedOrganizationId: string): LocalInvoice;
  transition(input: {
    invoiceId: string;
    organizationId: string;
    role: InvoiceActorRole;
    toStatus: InvoiceStatus;
    expectedVersion: number;
    numbering?: InvoiceNumberingConfiguration;
  }): LocalInvoice;
  createCreditNote(input: {
    id: string;
    invoiceId: string;
    organizationId: string;
    role: InvoiceActorRole;
    reason: string;
    amountMinor: number;
  }): InvoiceCreditNote;
  listCreditNotes(invoiceId: string, authorizedOrganizationId: string): readonly InvoiceCreditNote[];
  listAudit(invoiceId: string, authorizedOrganizationId: string): readonly InvoiceAuditEntry[];
}>;

export function createLocalInvoiceService(options: { now: () => string }): LocalInvoiceService {
  const invoices = new Map<string, LocalInvoice>();
  const idempotency = new Map<string, string>();
  const sequenceByScope = new Map<string, number>();
  const usedNumbers = new Set<string>();
  const creditNotes = new Map<string, InvoiceCreditNote>();
  const audit: InvoiceAuditEntry[] = [];

  function requireInvoice(invoiceId: string, organizationId: string) {
    const invoice = invoices.get(invoiceId);
    if (!invoice || invoice.organizationId !== organizationId) {
      throw new Error("Invoice is outside the authorized organization.");
    }
    return invoice;
  }

  function record(
    invoice: LocalInvoice,
    action: InvoiceAction,
    actorRole: InvoiceActorRole,
    fromStatus: InvoiceStatus | null
  ) {
    audit.push({
      sequence: audit.length + 1,
      invoiceId: invoice.id,
      organizationId: invoice.organizationId,
      action,
      actorRole,
      occurredAt: options.now(),
      fromStatus,
      toStatus: invoice.status
    });
  }

  return {
    create(input) {
      assertAuthorized(input.role, "create");
      if (input.calculation.source.organizationId !== input.organizationId) {
        throw new Error("Invoice source is outside the authorized organization.");
      }
      const key = `${input.organizationId}:${input.idempotencyKey}`;
      const replayId = idempotency.get(key);
      if (replayId) {
        if (replayId !== input.id) throw new Error("Invoice creation idempotency conflict.");
        return requireInvoice(replayId, input.organizationId);
      }
      if (invoices.has(input.id)) throw new Error("Invoice identifier already exists.");
      const invoice: LocalInvoice = {
        id: input.id,
        organizationId: input.organizationId,
        status: "draft",
        number: null,
        version: 1,
        calculation: structuredClone(input.calculation),
        issuedAt: null,
        correctionOfInvoiceId: null
      };
      invoices.set(invoice.id, invoice);
      idempotency.set(key, invoice.id);
      record(invoice, "create", input.role, null);
      return structuredClone(invoice);
    },
    get(invoiceId, authorizedOrganizationId) {
      return structuredClone(requireInvoice(invoiceId, authorizedOrganizationId));
    },
    transition(input) {
      const current = requireInvoice(input.invoiceId, input.organizationId);
      const action = actionForTransition(current.status, input.toStatus);
      assertAuthorized(input.role, action);
      if (current.version !== input.expectedVersion) {
        throw new Error("Invoice version conflict.");
      }
      if (!canTransitionInvoice(current.status, input.toStatus)) {
        throw new Error(`Invoice transition ${current.status} -> ${input.toStatus} is not allowed.`);
      }
      let number = current.number;
      let issuedAt = current.issuedAt;
      if (input.toStatus === "issued") {
        if (!input.numbering) throw new Error("Invoice numbering policy is missing.");
        if (input.numbering.organizationId !== input.organizationId) {
          throw new Error("Invoice numbering policy is outside the authorized organization.");
        }
        number = allocateNumber(input.numbering, sequenceByScope, usedNumbers);
        issuedAt = options.now();
      }
      const updated: LocalInvoice = {
        ...current,
        status: input.toStatus,
        number,
        issuedAt,
        version: current.version + 1
      };
      invoices.set(updated.id, updated);
      record(updated, action, input.role, current.status);
      return structuredClone(updated);
    },
    createCreditNote(input) {
      assertAuthorized(input.role, "create_credit_note");
      const invoice = requireInvoice(input.invoiceId, input.organizationId);
      if (!["issued", "sent", "viewed", "partially_paid", "paid", "overdue", "disputed"].includes(invoice.status)) {
        throw new Error("Credit notes require an issued invoice.");
      }
      if (!input.reason.trim()) throw new Error("Credit note reason is required.");
      if (!Number.isSafeInteger(input.amountMinor) || input.amountMinor <= 0) {
        throw new Error("Credit note amount must be positive integer minor units.");
      }
      if (creditNotes.has(input.id)) throw new Error("Credit note identifier already exists.");
      const note: InvoiceCreditNote = {
        id: input.id,
        organizationId: input.organizationId,
        invoiceId: input.invoiceId,
        reason: input.reason,
        amountMinor: input.amountMinor,
        currency: "CAD",
        createdAt: options.now()
      };
      creditNotes.set(note.id, note);
      record(invoice, "create_credit_note", input.role, invoice.status);
      return structuredClone(note);
    },
    listCreditNotes(invoiceId, authorizedOrganizationId) {
      requireInvoice(invoiceId, authorizedOrganizationId);
      return [...creditNotes.values()]
        .filter(
          (note) =>
            note.invoiceId === invoiceId && note.organizationId === authorizedOrganizationId
        )
        .map((note) => structuredClone(note));
    },
    listAudit(invoiceId, authorizedOrganizationId) {
      requireInvoice(invoiceId, authorizedOrganizationId);
      return audit
        .filter(
          (entry) =>
            entry.invoiceId === invoiceId &&
            entry.organizationId === authorizedOrganizationId
        )
        .map((entry) => structuredClone(entry));
    }
  };
}

function assertAuthorized(role: InvoiceActorRole, action: InvoiceAction) {
  if (!canPerformInvoiceAction(role, action)) {
    throw new Error(`Invoice action ${action} is not authorized for ${role}.`);
  }
}

function actionForTransition(from: InvoiceStatus, to: InvoiceStatus): InvoiceAction {
  if (from === "draft" && to === "approved") return "approve";
  if (from === "approved" && to === "issued") return "issue";
  if (to === "sent") return "send";
  if (to === "viewed") return "view";
  if (to === "disputed") return "dispute";
  if (to === "voided") return "void";
  if (["partially_paid", "paid", "refunded"].includes(to)) return "record_payment_evidence";
  return "approve";
}

function allocateNumber(
  policy: InvoiceNumberingConfiguration,
  sequences: Map<string, number>,
  usedNumbers: Set<string>
) {
  if (!policy.prefix.trim()) throw new Error("Invoice number prefix is required.");
  const scope = `${policy.organizationId}:${policy.scopeYear}:${policy.prefix}`;
  const sequence = (sequences.get(scope) ?? 0) + 1;
  const candidate = `${policy.prefix}-${policy.scopeYear}-${sequence.toString().padStart(6, "0")}`;
  if (usedNumbers.has(`${policy.organizationId}:${candidate}`)) {
    throw new Error("Invoice number collision.");
  }
  sequences.set(scope, sequence);
  usedNumbers.add(`${policy.organizationId}:${candidate}`);
  return candidate;
}
