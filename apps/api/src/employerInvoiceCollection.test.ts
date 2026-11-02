import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Unit tests for the employer-invoice Stripe TEST collection orchestration. Stripe is mocked (no
// network): we assert the GATING, the never-trust-the-client verify step, the governed invoice
// transition, and idempotency under concurrent completion. No money moves; TEST path only.

const createInvoiceCheckoutSession = vi.fn();
const verifyInvoiceCheckoutPaid = vi.fn();
const isStripeTestConfigured = vi.fn();

vi.mock("./employerInvoiceStripeCheckout", () => ({
  createInvoiceCheckoutSession: (...a: unknown[]) => createInvoiceCheckoutSession(...a),
  verifyInvoiceCheckoutPaid: (...a: unknown[]) => verifyInvoiceCheckoutPaid(...a)
}));
vi.mock("./stripeEnvironment", () => ({
  isStripeCollectionConfigured: () => isStripeTestConfigured()
}));

import {
  startInvoiceCheckout,
  completeInvoiceCheckout,
  reconcileInvoiceCheckoutPaid,
  recordInvoiceCheckoutAdjustment,
  isInvoiceCollectionEnabled
} from "./employerInvoiceCollection";
import type { PrismaClient } from "@rwos/database";
import type { DurableInvoice, InvoiceRepository } from "./invoiceRepository";

const ORG = "00000000-0000-4000-8000-0000000000aa";
const INVOICE = "00000000-0000-4000-8000-0000000000bb";

function invoice(overrides: Partial<DurableInvoice> = {}): DurableInvoice {
  return {
    id: INVOICE,
    organizationId: ORG,
    timesheetId: "00000000-0000-4000-8000-0000000000cc",
    timesheetVersion: 1,
    status: "issued",
    invoiceNumber: "JL-2026-000001",
    currency: "CAD",
    calculationSnapshot: {} as DurableInvoice["calculationSnapshot"],
    subtotalMinor: 10_000,
    taxMinor: 1_497,
    creditMinor: 0,
    totalMinor: 11_497,
    version: 3,
    issuedAt: new Date().toISOString(),
    dueAt: null,
    createdAt: new Date().toISOString(),
    ...overrides
  };
}

function fakeInvoiceRepository(initial: DurableInvoice) {
  const state = { current: initial };
  const repo = {
    get: vi.fn(async () => state.current),
    transition: vi.fn(async (input: { toStatus: DurableInvoice["status"]; expectedVersion: number }) => {
      if (input.expectedVersion !== state.current.version) throw new Error("Invoice version conflict.");
      state.current = { ...state.current, status: input.toStatus, version: state.current.version + 1 };
      return state.current;
    })
  } as unknown as InvoiceRepository & {
    get: ReturnType<typeof vi.fn>;
    transition: ReturnType<typeof vi.fn>;
  };
  return { repo, state };
}

function fakePrisma() {
  const rows = new Map<string, Record<string, unknown>>();
  const key = (o: string, i: string) => `${o}:${i}`;
  return {
    rows,
    employerInvoiceCheckout: {
      findUnique: async ({ where }: { where: { organizationId_invoiceId: { organizationId: string; invoiceId: string } } }) =>
        rows.get(key(where.organizationId_invoiceId.organizationId, where.organizationId_invoiceId.invoiceId)) ?? null,
      findFirst: async ({ where }: { where: { paymentRef: string } }) =>
        [...rows.values()].find((r) => r.paymentRef === where.paymentRef) ?? null,
      create: async ({ data }: { data: Record<string, unknown> }) => {
        const row: Record<string, unknown> = { id: `chk-${rows.size + 1}`, createdAt: new Date(), paidAt: null, checkoutSessionId: null, paymentRef: null, ...data };
        rows.set(key(row.organizationId as string, row.invoiceId as string), row);
        return row;
      },
      update: async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const row = [...rows.values()].find((r) => r.id === where.id)!;
        Object.assign(row, data);
        return row;
      }
    }
  } as unknown as PrismaClient & { rows: Map<string, Record<string, unknown>> };
}

beforeEach(() => {
  process.env.INVOICE_TEST_MODE_ENABLED = "enabled";
  isStripeTestConfigured.mockReturnValue(true);
  createInvoiceCheckoutSession.mockResolvedValue({ id: "cs_test_123", url: "https://checkout.stripe.test/cs_test_123" });
  verifyInvoiceCheckoutPaid.mockResolvedValue({ paid: true, paymentRef: "pi_test_456" });
});

afterEach(() => {
  vi.clearAllMocks();
  delete process.env.INVOICE_TEST_MODE_ENABLED;
});

describe("isInvoiceCollectionEnabled", () => {
  it("is false unless the flag is enabled", () => {
    process.env.INVOICE_TEST_MODE_ENABLED = "disabled";
    expect(isInvoiceCollectionEnabled()).toBe(false);
    process.env.INVOICE_TEST_MODE_ENABLED = "enabled";
    expect(isInvoiceCollectionEnabled()).toBe(true);
  });
});

describe("startInvoiceCheckout", () => {
  it("refuses when the collection flag is off", async () => {
    process.env.INVOICE_TEST_MODE_ENABLED = "disabled";
    const { repo } = fakeInvoiceRepository(invoice());
    const result = await startInvoiceCheckout(fakePrisma(), repo, { organizationId: ORG, invoiceId: INVOICE, origin: "https://app.test" });
    expect(result).toEqual({ ok: false, reason: "collection_disabled" });
  });

  it("refuses when Stripe test keys are not configured", async () => {
    isStripeTestConfigured.mockReturnValue(false);
    const { repo } = fakeInvoiceRepository(invoice());
    const result = await startInvoiceCheckout(fakePrisma(), repo, { organizationId: ORG, invoiceId: INVOICE, origin: "https://app.test" });
    expect(result).toEqual({ ok: false, reason: "stripe_unconfigured" });
  });

  it("refuses a draft (not yet issued) invoice", async () => {
    const { repo } = fakeInvoiceRepository(invoice({ status: "draft", invoiceNumber: null }));
    const result = await startInvoiceCheckout(fakePrisma(), repo, { organizationId: ORG, invoiceId: INVOICE, origin: "https://app.test" });
    expect(result).toEqual({ ok: false, reason: "invoice_not_found" });
  });

  it("refuses an already-paid invoice", async () => {
    const { repo } = fakeInvoiceRepository(invoice({ status: "paid" }));
    const result = await startInvoiceCheckout(fakePrisma(), repo, { organizationId: ORG, invoiceId: INVOICE, origin: "https://app.test" });
    expect(result).toEqual({ ok: false, reason: "already_paid" });
  });

  it("opens a hosted Checkout Session for an issued invoice and persists its id", async () => {
    const prisma = fakePrisma();
    const { repo } = fakeInvoiceRepository(invoice());
    const result = await startInvoiceCheckout(prisma, repo, { organizationId: ORG, invoiceId: INVOICE, origin: "https://app.test/" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.checkoutUrl).toContain("checkout.stripe.test");
    expect(result.checkout.status).toBe("pending_payment");
    expect(result.checkout.amountMinor).toBe(11_497);
    expect(createInvoiceCheckoutSession).toHaveBeenCalledWith(
      expect.objectContaining({ invoiceId: INVOICE, organizationId: ORG, amountMinor: 11_497, successUrl: expect.stringContaining("https://app.test/employer/invoices?pay=success") })
    );
    const row = [...prisma.rows.values()][0]!;
    expect(row.checkoutSessionId).toBe("cs_test_123");
  });

  it("reuses the pending checkout row on a second start (no duplicate)", async () => {
    const prisma = fakePrisma();
    const { repo } = fakeInvoiceRepository(invoice());
    await startInvoiceCheckout(prisma, repo, { organizationId: ORG, invoiceId: INVOICE, origin: "https://app.test" });
    await startInvoiceCheckout(prisma, repo, { organizationId: ORG, invoiceId: INVOICE, origin: "https://app.test" });
    expect(prisma.rows.size).toBe(1);
  });
});

describe("completeInvoiceCheckout", () => {
  async function started() {
    const prisma = fakePrisma();
    const { repo, state } = fakeInvoiceRepository(invoice());
    await startInvoiceCheckout(prisma, repo, { organizationId: ORG, invoiceId: INVOICE, origin: "https://app.test" });
    return { prisma, repo, state };
  }

  it("flips the invoice to paid after Stripe confirms the session was paid", async () => {
    const { prisma, repo, state } = await started();
    const result = await completeInvoiceCheckout(prisma, repo, { organizationId: ORG, invoiceId: INVOICE, actorReference: "u1", actorRole: "finance_reviewer" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.invoice.status).toBe("paid");
    expect(result.checkout.status).toBe("paid");
    expect(result.checkout.paymentRef).toBe("pi_test_456");
    expect(state.current.status).toBe("paid");
  });

  it("never trusts the client — a not-paid Stripe session leaves the invoice unchanged", async () => {
    verifyInvoiceCheckoutPaid.mockResolvedValue({ paid: false, paymentRef: null });
    const { prisma, repo, state } = await started();
    const result = await completeInvoiceCheckout(prisma, repo, { organizationId: ORG, invoiceId: INVOICE, actorReference: "u1", actorRole: "finance_reviewer" });
    expect(result).toEqual({ ok: false, reason: "payment_incomplete" });
    expect(state.current.status).toBe("issued");
  });

  it("is idempotent — a second complete after paid returns success without re-transitioning", async () => {
    const { prisma, repo } = await started();
    await completeInvoiceCheckout(prisma, repo, { organizationId: ORG, invoiceId: INVOICE, actorReference: "u1", actorRole: "finance_reviewer" });
    (repo.transition as ReturnType<typeof vi.fn>).mockClear();
    const again = await completeInvoiceCheckout(prisma, repo, { organizationId: ORG, invoiceId: INVOICE, actorReference: "u1", actorRole: "finance_reviewer" });
    expect(again.ok).toBe(true);
    expect(repo.transition).not.toHaveBeenCalled();
  });

  it("reports checkout_not_found when no checkout was ever started", async () => {
    const prisma = fakePrisma();
    const { repo } = fakeInvoiceRepository(invoice());
    const result = await completeInvoiceCheckout(prisma, repo, { organizationId: ORG, invoiceId: INVOICE, actorReference: "u1", actorRole: "finance_reviewer" });
    expect(result).toEqual({ ok: false, reason: "checkout_not_found" });
  });
});

describe("reconcileInvoiceCheckoutPaid (webhook path)", () => {
  it("reconciles a started checkout to paid", async () => {
    const prisma = fakePrisma();
    const { repo, state } = fakeInvoiceRepository(invoice());
    await startInvoiceCheckout(prisma, repo, { organizationId: ORG, invoiceId: INVOICE, origin: "https://app.test" });
    const result = await reconcileInvoiceCheckoutPaid(prisma, repo, { organizationId: ORG, invoiceId: INVOICE, paymentRef: "pi_webhook_1" });
    expect(result.status).toBe("reconciled");
    expect(state.current.status).toBe("paid");
  });

  it("is a no-op for an unknown invoice", async () => {
    const prisma = fakePrisma();
    const { repo } = fakeInvoiceRepository(invoice());
    const result = await reconcileInvoiceCheckoutPaid(prisma, repo, { organizationId: ORG, invoiceId: INVOICE, paymentRef: "pi_x" });
    expect(result.status).toBe("unknown");
  });

  it("reports already_paid when the invoice is already settled", async () => {
    const prisma = fakePrisma();
    const { repo } = fakeInvoiceRepository(invoice());
    await startInvoiceCheckout(prisma, repo, { organizationId: ORG, invoiceId: INVOICE, origin: "https://app.test" });
    await reconcileInvoiceCheckoutPaid(prisma, repo, { organizationId: ORG, invoiceId: INVOICE, paymentRef: "pi_1" });
    const again = await reconcileInvoiceCheckoutPaid(prisma, repo, { organizationId: ORG, invoiceId: INVOICE, paymentRef: "pi_1" });
    expect(again.status).toBe("already_paid");
  });
});

describe("recordInvoiceCheckoutAdjustment (refunds and disputes)", () => {
  async function paidCheckout() {
    const prisma = fakePrisma();
    const { repo, state } = fakeInvoiceRepository(invoice());
    await startInvoiceCheckout(prisma, repo, { organizationId: ORG, invoiceId: INVOICE, origin: "https://app.test" });
    await reconcileInvoiceCheckoutPaid(prisma, repo, { organizationId: ORG, invoiceId: INVOICE, paymentRef: "pi_paid" });
    const row = () => [...prisma.rows.values()][0]!;
    return { prisma, repo, state, row };
  }

  it("records a refund without reopening the invoice", async () => {
    const { prisma, state, row } = await paidCheckout();
    const result = await recordInvoiceCheckoutAdjustment(prisma, { paymentRef: "pi_paid", adjustment: "refunded" });
    expect(result).toEqual({ status: "adjusted", invoiceId: INVOICE });
    expect(row().status).toBe("refunded");
    expect(state.current.status).toBe("paid");
  });

  it("keeps a full refund final against later events", async () => {
    const { prisma, row } = await paidCheckout();
    await recordInvoiceCheckoutAdjustment(prisma, { paymentRef: "pi_paid", adjustment: "refunded" });
    await recordInvoiceCheckoutAdjustment(prisma, { paymentRef: "pi_paid", adjustment: "disputed" });
    expect(row().status).toBe("refunded");
  });

  it("is not reverted to paid by a replayed paid event", async () => {
    const { prisma, repo, row } = await paidCheckout();
    await recordInvoiceCheckoutAdjustment(prisma, { paymentRef: "pi_paid", adjustment: "disputed" });
    const replay = await reconcileInvoiceCheckoutPaid(prisma, repo, { organizationId: ORG, invoiceId: INVOICE, paymentRef: "pi_paid" });
    expect(replay.status).toBe("already_paid");
    expect(row().status).toBe("disputed");
  });

  it("reports unknown for a PaymentIntent we never recorded", async () => {
    const { prisma } = await paidCheckout();
    await expect(
      recordInvoiceCheckoutAdjustment(prisma, { paymentRef: "pi_other", adjustment: "refunded" })
    ).resolves.toEqual({ status: "unknown" });
  });
});
