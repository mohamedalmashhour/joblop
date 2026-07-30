import { createHash } from "node:crypto";
import type {
  FakePaymentScenario,
  PaymentOperation,
  PaymentProviderPort,
  PaymentRecord,
  PaymentEvent,
  PaymentState,
  PaymentMethodReference,
  PaymentPolicyMode
} from "@rwos/shared";

type Delegate = {
  findFirst(input: unknown): Promise<unknown>;
  findMany(input: unknown): Promise<unknown[]>;
  create(input: unknown): Promise<unknown>;
  updateMany(input: unknown): Promise<{ count: number }>;
};
type Transaction = {
  invoice: Pick<Delegate, "findFirst">;
  employerPaymentMethod: Delegate;
  employerPaymentAttempt: Delegate;
  employerPaymentEvent: Delegate;
  employerPaymentAllocation: Delegate;
  employerPaymentRefund: Delegate;
};
type Client = Transaction & {
  $transaction<T>(callback: (transaction: Transaction) => Promise<T>): Promise<T>;
};

export interface PaymentRepository {
  registerMethod(method: PaymentMethodReference): Promise<PaymentMethodReference>;
  listMethods(organizationId: string): Promise<readonly PaymentMethodReference[]>;
  listAttempts(organizationId: string): Promise<readonly PaymentRecord[]>;
  createAttempt(input: {
    id: string;
    organizationId: string;
    assignmentId: string;
    timesheetId: string;
    invoiceId: string;
    paymentMethodId: string | null;
    policyVersion: string;
    policyMode: PaymentPolicyMode;
    amountMinor: number;
    idempotencyKey: string;
  }): Promise<PaymentRecord>;
  get(paymentId: string, organizationId: string): Promise<PaymentRecord | null>;
  listEvents(paymentId: string, organizationId: string): Promise<readonly PaymentEvent[]>;
  processProviderEvent(input: {
    eventId: string;
    paymentId: string;
    organizationId: string;
    expectedVersion: number;
    newState: Extract<PaymentState, "succeeded" | "failed" | "disputed">;
    amountMinor: number;
    payloadDigest: string;
    occurredAt: Date;
  }): Promise<PaymentRecord>;
  execute(input: {
    paymentId: string;
    organizationId: string;
    expectedVersion: number;
    operation: Exclude<PaymentOperation, "setup">;
    amountMinor: number;
    idempotencyKey: string;
    scenario: FakePaymentScenario;
  }): Promise<PaymentRecord>;
}

export function createPrismaPaymentRepository(
  prismaClient: unknown,
  provider: PaymentProviderPort
): PaymentRepository {
  const prisma = prismaClient as Client;

  async function get(paymentId: string, organizationId: string) {
    const value = await prisma.employerPaymentAttempt.findFirst({
      where: { id: paymentId, organizationId }
    });
    return value ? mapPayment(value) : null;
  }

  return {
    async registerMethod(method) {
      assertOpaque(method.providerCustomerReference);
      assertOpaque(method.providerMethodReference);
      if (!["local_fake", "stripe_test"].includes(method.provider)) {
        throw new Error("Payment provider is not approved.");
      }
      const existing = await prisma.employerPaymentMethod.findFirst({
        where: {
          organizationId: method.organizationId,
          provider: method.provider,
          providerMethodReference: method.providerMethodReference
        }
      });
      if (existing) {
        const mapped = mapMethod(existing);
        if (
          mapped.id !== method.id ||
          mapped.providerCustomerReference !== method.providerCustomerReference
        ) {
          throw new Error("Payment method reference conflict.");
        }
        return mapped;
      }
      return mapMethod(
        await prisma.employerPaymentMethod.create({
          data: {
            id: method.id,
            organizationId: method.organizationId,
            provider: method.provider,
            methodKind: method.methodKind,
            providerCustomerReference: method.providerCustomerReference,
            providerMethodReference: method.providerMethodReference,
            displayAlias: method.displayAlias,
            reusable: method.reusable,
            status: "active"
          }
        })
      );
    },
    async listMethods(organizationId) {
      const values = await prisma.employerPaymentMethod.findMany({
        where: { organizationId, status: "active" },
        orderBy: [{ createdAt: "desc" }, { id: "asc" }]
      });
      return values
        .map(mapMethod)
        .sort((left, right) =>
          left.methodKind === right.methodKind
            ? left.id.localeCompare(right.id)
            : left.methodKind === "mastercard"
              ? -1
              : 1
        );
    },
    async listAttempts(organizationId) {
      const values = await prisma.employerPaymentAttempt.findMany({
        where: { organizationId },
        orderBy: [{ createdAt: "desc" }, { id: "asc" }]
      });
      return values.map(mapPayment);
    },
    async createAttempt(input) {
      assertMoney(input.amountMinor);
      const idempotencyKeyDigest = digest(input.idempotencyKey);
      const requestDigest = digest(JSON.stringify(input));
      return prisma.$transaction(async (transaction) => {
        const replay = await transaction.employerPaymentAttempt.findFirst({
          where: { organizationId: input.organizationId, idempotencyKeyDigest }
        });
        if (replay) {
          const mapped = mapPayment(replay);
          if (text(replay, "requestDigest") !== requestDigest) {
            throw new Error("Payment creation idempotency conflict.");
          }
          return mapped;
        }
        if (input.paymentMethodId) {
          const method = await transaction.employerPaymentMethod.findFirst({
            where: {
              id: input.paymentMethodId,
              organizationId: input.organizationId,
              status: "active"
            }
          });
          if (!method) throw new Error("Payment method is outside the authorized organization.");
        }
        const invoice = await transaction.invoice.findFirst({
          where: {
            id: input.invoiceId,
            organizationId: input.organizationId,
            timesheetId: input.timesheetId,
            status: { in: ["issued", "sent", "viewed", "overdue"] }
          }
        });
        if (!invoice) throw new Error("Payment requires an issued organization-scoped invoice.");
        const invoiceTotalMinor = safeBigInt(invoice, "totalMinor");
        if (input.amountMinor > invoiceTotalMinor) {
          throw new Error("Payment amount exceeds the issued invoice total.");
        }
        const created = await transaction.employerPaymentAttempt.create({
          data: {
            id: input.id,
            organizationId: input.organizationId,
            assignmentId: input.assignmentId,
            timesheetId: input.timesheetId,
            invoiceId: input.invoiceId,
            paymentMethodId: input.paymentMethodId,
            policyVersion: input.policyVersion,
            policyMode: input.policyMode,
            state: "pending",
            amountMinor: BigInt(input.amountMinor),
            currency: "CAD",
            idempotencyKeyDigest,
            requestDigest
          }
        });
        await transaction.employerPaymentEvent.create({
          data: eventData(input.id, input.organizationId, "created", null, "pending", "system")
        });
        return mapPayment(created);
      });
    },
    get,
    async listEvents(paymentId, organizationId) {
      if (!(await get(paymentId, organizationId))) {
        throw new Error("Payment is outside the authorized organization.");
      }
      const values = await prisma.employerPaymentEvent.findMany({
        where: { paymentAttemptId: paymentId, organizationId },
        orderBy: [{ occurredAt: "asc" }, { id: "asc" }]
      });
      return values.map((value, index) => mapEvent(value, index + 1));
    },
    async processProviderEvent(input) {
      assertMoney(input.amountMinor);
      if (!/^[a-f0-9]{64}$/u.test(input.payloadDigest)) {
        throw new Error("Payment provider event digest is invalid.");
      }
      return prisma.$transaction(async (transaction) => {
        const priorEvent = await transaction.employerPaymentEvent.findFirst({
          where: {
            organizationId: input.organizationId,
            providerEventReference: input.eventId
          }
        });
        if (priorEvent) {
          if (
            text(priorEvent, "paymentAttemptId") !== input.paymentId ||
            nullableText(priorEvent, "payloadDigest") !== input.payloadDigest
          ) {
            throw new Error("Payment provider event replay conflict.");
          }
          const replay = await transaction.employerPaymentAttempt.findFirst({
            where: { id: input.paymentId, organizationId: input.organizationId }
          });
          if (!replay) throw new Error("Payment is outside the authorized organization.");
          return mapPayment(replay);
        }
        const currentValue = await transaction.employerPaymentAttempt.findFirst({
          where: { id: input.paymentId, organizationId: input.organizationId }
        });
        if (!currentValue) throw new Error("Payment is outside the authorized organization.");
        const current = mapPayment(currentValue);
        if (current.version !== input.expectedVersion) throw new Error("Payment version conflict.");
        if (!["processing", "authorized", "succeeded"].includes(current.state)) {
          throw new Error("Payment provider event is invalid for the current state.");
        }
        if (input.amountMinor !== current.amountMinor) {
          throw new Error("Payment provider event amount does not match the attempt.");
        }
        const updated = await transaction.employerPaymentAttempt.updateMany({
          where: {
            id: input.paymentId,
            organizationId: input.organizationId,
            version: input.expectedVersion,
            state: current.state
          },
          data: {
            state: input.newState,
            version: { increment: 1 },
            ...(input.newState === "succeeded" && current.allocatedMinor === 0
              ? { allocatedMinor: BigInt(input.amountMinor) }
              : {})
          }
        });
        if (updated.count !== 1) throw new Error("Payment provider event concurrency conflict.");
        await transaction.employerPaymentEvent.create({
          data: {
            ...eventData(
              input.paymentId,
              input.organizationId,
              "provider_webhook",
              current.state,
              input.newState,
              "provider"
            ),
            providerEventReference: input.eventId,
            payloadDigest: input.payloadDigest,
            occurredAt: input.occurredAt
          }
        });
        if (input.newState === "succeeded" && current.allocatedMinor === 0) {
          await transaction.employerPaymentAllocation.create({
            data: {
              paymentAttemptId: current.id,
              organizationId: current.organizationId,
              invoiceId: current.invoiceId,
              amountMinor: BigInt(input.amountMinor),
              currency: "CAD"
            }
          });
        }
        const result = await transaction.employerPaymentAttempt.findFirst({
          where: { id: input.paymentId, organizationId: input.organizationId }
        });
        if (!result) throw new Error("Payment persistence failed.");
        return mapPayment(result);
      });
    },
    async execute(input) {
      assertMoney(input.amountMinor);
      const current = await get(input.paymentId, input.organizationId);
      if (!current) throw new Error("Payment is outside the authorized organization.");
      if (current.version !== input.expectedVersion) throw new Error("Payment version conflict.");
      assertOperationState(current, input.operation, input.amountMinor);
      const claimed = await prisma.employerPaymentAttempt.updateMany({
        where: {
          id: current.id,
          organizationId: current.organizationId,
          version: current.version,
          state: current.state
        },
        data: { state: "processing", version: { increment: 1 } }
      });
      if (claimed.count !== 1) throw new Error("Payment concurrency conflict.");

      const method = current.methodReferenceId
        ? await prisma.employerPaymentMethod.findFirst({
            where: { id: current.methodReferenceId, organizationId: current.organizationId }
          })
        : null;
      const result = await provider.execute({
        operation: input.operation,
        organizationId: current.organizationId,
        paymentId: current.id,
        amountMinor: input.amountMinor,
        currency: "CAD",
        methodReference: method ? text(method, "providerMethodReference") : null,
        authorizationReference: current.authorizationReference,
        idempotencyKey: input.idempotencyKey,
        scenario: input.scenario
      });
      const next = nextState(current, input.operation, input.amountMinor, result.outcome);
      return prisma.$transaction(async (transaction) => {
        const updated = await transaction.employerPaymentAttempt.updateMany({
          where: {
            id: current.id,
            organizationId: current.organizationId,
            version: current.version + 1,
            state: "processing"
          },
          data: {
            state: next.state,
            version: { increment: 1 },
            ...(input.operation === "authorize" && result.outcome === "accepted"
              ? { authorizationReference: result.providerOperationReference }
              : {}),
            ...(input.operation === "capture" && result.outcome === "accepted"
              ? { allocatedMinor: { increment: BigInt(input.amountMinor) } }
              : {}),
            ...(input.operation === "refund" && result.outcome === "accepted"
              ? { refundedMinor: { increment: BigInt(input.amountMinor) } }
              : {})
          }
        });
        if (updated.count !== 1) throw new Error("Payment finalization conflict.");
        await transaction.employerPaymentEvent.create({
          data: {
            ...eventData(
              current.id,
              current.organizationId,
              input.operation,
              current.state,
              next.state,
              "system"
            ),
            providerOperationReference: result.providerOperationReference,
            safeReasonCode: result.reason
          }
        });
        if (input.operation === "capture" && result.outcome === "accepted") {
          await transaction.employerPaymentAllocation.create({
            data: {
              paymentAttemptId: current.id,
              organizationId: current.organizationId,
              invoiceId: current.invoiceId,
              amountMinor: BigInt(input.amountMinor),
              currency: "CAD"
            }
          });
        }
        if (input.operation === "refund" && result.outcome === "accepted") {
          await transaction.employerPaymentRefund.create({
            data: {
              paymentAttemptId: current.id,
              organizationId: current.organizationId,
              amountMinor: BigInt(input.amountMinor),
              currency: "CAD",
              providerOperationReference: result.providerOperationReference,
              idempotencyKeyDigest: digest(input.idempotencyKey)
            }
          });
        }
        const value = await transaction.employerPaymentAttempt.findFirst({
          where: { id: current.id, organizationId: current.organizationId }
        });
        if (!value) throw new Error("Payment persistence failed.");
        return mapPayment(value);
      });
    }
  };
}

function nextState(
  payment: PaymentRecord,
  operation: Exclude<PaymentOperation, "setup">,
  amountMinor: number,
  outcome: "accepted" | "declined" | "authentication_required" | "unknown"
) {
  if (outcome === "unknown" || outcome === "authentication_required") {
    return { state: "processing" as const };
  }
  if (outcome === "declined") return { state: "failed" as const };
  if (operation === "authorize") return { state: "authorized" as const };
  if (operation === "capture") return { state: "succeeded" as const };
  if (operation === "void") return { state: "cancelled" as const };
  return {
    state:
      payment.refundedMinor + amountMinor === payment.allocatedMinor
        ? ("refunded" as const)
        : ("partially_refunded" as const)
  };
}

function assertOperationState(
  payment: PaymentRecord,
  operation: Exclude<PaymentOperation, "setup">,
  amountMinor: number
) {
  const valid =
    (operation === "authorize" && payment.state === "pending") ||
    (operation === "capture" && payment.state === "authorized") ||
    (operation === "void" && payment.state === "authorized") ||
    (operation === "refund" &&
      ["succeeded", "partially_refunded"].includes(payment.state) &&
      payment.refundedMinor + amountMinor <= payment.allocatedMinor);
  if (!valid) throw new Error("Payment operation is invalid for the current state.");
}

function eventData(
  paymentAttemptId: string,
  organizationId: string,
  eventType: string,
  priorState: PaymentState | null,
  newState: PaymentState,
  actorType: string
) {
  return {
    paymentAttemptId,
    organizationId,
    eventType,
    priorState,
    newState,
    actorType,
    occurredAt: new Date()
  };
}

function mapMethod(value: unknown): PaymentMethodReference {
  return {
    id: text(value, "id"),
    organizationId: text(value, "organizationId"),
    provider: approvedProvider(text(value, "provider")),
    methodKind: paymentMethodKind(text(value, "methodKind")),
    providerCustomerReference: text(value, "providerCustomerReference"),
    providerMethodReference: text(value, "providerMethodReference"),
    displayAlias: text(value, "displayAlias"),
    reusable: boolean(value, "reusable")
  };
}

function mapPayment(value: unknown): PaymentRecord {
  return {
    id: text(value, "id"),
    organizationId: text(value, "organizationId"),
    assignmentId: text(value, "assignmentId"),
    timesheetId: text(value, "timesheetId"),
    invoiceId: text(value, "invoiceId"),
    policyVersion: text(value, "policyVersion"),
    policyMode: paymentPolicyMode(text(value, "policyMode")),
    methodReferenceId: nullableText(value, "paymentMethodId"),
    state: paymentState(text(value, "state")),
    amountMinor: safeBigInt(value, "amountMinor"),
    allocatedMinor: safeBigInt(value, "allocatedMinor"),
    refundedMinor: safeBigInt(value, "refundedMinor"),
    currency: "CAD",
    authorizationReference: nullableText(value, "authorizationReference"),
    version: integer(value, "version")
  };
}

function mapEvent(value: unknown, sequence: number): PaymentEvent {
  const prior = nullableText(value, "priorState");
  return {
    sequence,
    organizationId: text(value, "organizationId"),
    paymentId: text(value, "paymentAttemptId"),
    type: text(value, "eventType"),
    actor: paymentActor(text(value, "actorType")),
    fromState: prior === null ? null : paymentState(prior),
    toState: paymentState(text(value, "newState")),
    amountMinor: 0,
    providerReference: nullableText(value, "providerOperationReference"),
    occurredAt: date(value, "occurredAt")
  };
}

function row(value: unknown) {
  if (!value || typeof value !== "object") throw new Error("Invalid persisted payment.");
  return value as Record<string, unknown>;
}
function text(value: unknown, key: string) {
  const item = row(value)[key];
  if (typeof item !== "string" || !item) throw new Error("Invalid persisted payment.");
  return item;
}
function nullableText(value: unknown, key: string) {
  const item = row(value)[key];
  if (item === null || item === undefined) return null;
  if (typeof item !== "string" || !item) throw new Error("Invalid persisted payment.");
  return item;
}
function boolean(value: unknown, key: string) {
  const item = row(value)[key];
  if (typeof item !== "boolean") throw new Error("Invalid persisted payment.");
  return item;
}
function integer(value: unknown, key: string) {
  const item = row(value)[key];
  if (!Number.isSafeInteger(item) || (item as number) < 1) throw new Error("Invalid persisted payment.");
  return item as number;
}
function safeBigInt(value: unknown, key: string) {
  const item = row(value)[key];
  const number = typeof item === "bigint" ? Number(item) : item;
  if (!Number.isSafeInteger(number) || (number as number) < 0) {
    throw new Error("Persisted payment amount exceeds safe API range.");
  }
  return number as number;
}
function date(value: unknown, key: string) {
  const item = row(value)[key];
  if (!(item instanceof Date) || Number.isNaN(item.valueOf())) {
    throw new Error("Invalid persisted payment.");
  }
  return item.toISOString();
}
function approvedProvider(value: string) {
  if (value !== "local_fake" && value !== "stripe_test") throw new Error("Invalid payment provider.");
  return value;
}
function paymentState(value: string): PaymentState {
  if (
    ![
      "pending", "authorized", "processing", "succeeded", "failed", "cancelled",
      "partially_refunded", "refunded", "disputed"
    ].includes(value)
  ) throw new Error("Invalid payment state.");
  return value as PaymentState;
}
function paymentPolicyMode(value: string): PaymentPolicyMode {
  if (
    ![
      "invoice_only",
      "authorize_before_assignment_capture_after_invoice",
      "collect_after_invoice",
      "manual_collection"
    ].includes(value)
  ) throw new Error("Invalid payment policy mode.");
  return value as PaymentPolicyMode;
}
function paymentMethodKind(value: string) {
  if (value !== "mastercard" && value !== "acss_debit") {
    throw new Error("Invalid payment method kind.");
  }
  return value;
}
function paymentActor(value: string): PaymentEvent["actor"] {
  if (!["employer", "admin", "system", "provider"].includes(value)) {
    throw new Error("Invalid payment actor.");
  }
  return value as PaymentEvent["actor"];
}
function assertMoney(value: number) {
  if (!Number.isSafeInteger(value) || value <= 0) throw new Error("Payment requires positive CAD minor units.");
}
function assertOpaque(value: string) {
  if (!value || /\b(?:\d[ -]*?){13,19}\b/u.test(value)) {
    throw new Error("Payment references must be opaque and contain no raw payment data.");
  }
}
function digest(value: string) {
  if (!value) throw new Error("Payment idempotency key is required.");
  return createHash("sha256").update(value).digest("hex");
}
