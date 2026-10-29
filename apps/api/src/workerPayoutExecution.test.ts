import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Unit tests for the worker-payout Stripe TEST execution orchestration. No network and no money: the
// gate + Stripe-configured checks are driven by env, and with NO connected account configured the
// execution takes the SYNTHETIC path (never calls Stripe). We assert the gating, the released-only
// precondition, the recorded TEST reference, and idempotency under a concurrent paid race.

import { executeTestWorkerPayout, isPayoutTestExecutionEnabled } from "./workerPayoutExecution";
import type { PrismaClient } from "@rwos/database";

const PAYOUT = "00000000-0000-4000-8000-0000000000dd";
const WORKER = "00000000-0000-4000-8000-0000000000ee";

type Row = {
  id: string;
  workerIdentityId: string;
  amountMinor: number;
  currency: string;
  status: string;
  paymentRef: string | null;
  paidAt: Date | null;
};

function fakePrisma(initial: Row, opts: { updateCount?: number } = {}) {
  const state = { row: initial };
  return {
    workerPayout: {
      findUnique: vi.fn(async () => ({ ...state.row })),
      updateMany: vi.fn(async ({ where, data }: { where: { id: string; status: string }; data: Partial<Row> }) => {
        const count = opts.updateCount ?? (state.row.status === where.status ? 1 : 0);
        if (count > 0) state.row = { ...state.row, ...data };
        return { count };
      })
    },
    __state: state
  } as unknown as PrismaClient & { __state: { row: Row } };
}

function row(overrides: Partial<Row> = {}): Row {
  return {
    id: PAYOUT,
    workerIdentityId: WORKER,
    amountMinor: 12_345,
    currency: "CAD",
    status: "released",
    paymentRef: null,
    paidAt: null,
    ...overrides
  };
}

const ORIGINAL_ENV = { ...process.env };

function enableTestMode() {
  process.env.PAYOUT_TEST_MODE_ENABLED = "enabled";
  process.env.STRIPE_TEST_MODE_ENABLED = "enabled";
  process.env.STRIPE_TEST_SECRET_KEY = "sk_test_synthetic_reference";
  process.env.STRIPE_TEST_WEBHOOK_SECRET = "whsec_synthetic_reference";
  process.env.STRIPE_TEST_ACCOUNT_REFERENCE = "acct_test_synthetic";
  delete process.env.STRIPE_TEST_PAYOUT_CONNECTED_ACCOUNT; // synthetic path, no network
}

beforeEach(() => {
  vi.clearAllMocks();
  enableTestMode();
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("worker payout TEST execution", () => {
  it("is gated: disabled when PAYOUT_TEST_MODE_ENABLED is off, and never reads the payout", async () => {
    process.env.PAYOUT_TEST_MODE_ENABLED = "disabled";
    expect(isPayoutTestExecutionEnabled()).toBe(false);
    const prisma = fakePrisma(row());
    const result = await executeTestWorkerPayout(prisma, { payoutId: PAYOUT });
    expect(result).toEqual({ ok: false, reason: "execution_disabled" });
    expect(prisma.workerPayout.findUnique).not.toHaveBeenCalled();
  });

  it("refuses when Stripe TEST keys are not configured", async () => {
    delete process.env.STRIPE_TEST_SECRET_KEY;
    const prisma = fakePrisma(row());
    const result = await executeTestWorkerPayout(prisma, { payoutId: PAYOUT });
    expect(result).toEqual({ ok: false, reason: "stripe_unconfigured" });
  });

  it("refuses a missing payout", async () => {
    const prisma = fakePrisma(row());
    (prisma.workerPayout.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);
    const result = await executeTestWorkerPayout(prisma, { payoutId: PAYOUT });
    expect(result).toEqual({ ok: false, reason: "payout_not_found" });
  });

  it.each(["pending", "held", "cancelled"])(
    "refuses to pay a payout that is not released (%s)",
    async (status) => {
      const prisma = fakePrisma(row({ status }));
      const result = await executeTestWorkerPayout(prisma, { payoutId: PAYOUT });
      expect(result).toEqual({ ok: false, reason: "payout_not_released" });
      expect(prisma.workerPayout.updateMany).not.toHaveBeenCalled();
    }
  );

  it("pays a released payout via the SYNTHETIC path and records a TEST reference", async () => {
    const prisma = fakePrisma(row());
    const result = await executeTestWorkerPayout(prisma, { payoutId: PAYOUT });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.payout.status).toBe("paid");
    expect(result.payout.mode).toBe("synthetic");
    expect(result.payout.paymentRef).toBe(`payout-test-synthetic-${PAYOUT}`);
    expect(result.payout.paidAt).not.toBeNull();
    expect(prisma.__state.row.status).toBe("paid");
    expect(prisma.__state.row.paymentRef).toBe(`payout-test-synthetic-${PAYOUT}`);
  });

  it("is idempotent: an already-paid payout returns success with its reference and no second write", async () => {
    const prisma = fakePrisma(row({ status: "paid", paymentRef: "payout-test-synthetic-prior", paidAt: new Date() }));
    const result = await executeTestWorkerPayout(prisma, { payoutId: PAYOUT });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.payout.mode).toBe("already_paid");
    expect(result.payout.paymentRef).toBe("payout-test-synthetic-prior");
    expect(prisma.workerPayout.updateMany).not.toHaveBeenCalled();
  });

  it("treats a lost status-guard race (a concurrent executor won) as idempotent success", async () => {
    // Row reads as released, but the guarded updateMany matches 0 rows (someone paid it first); the
    // re-read then shows paid.
    const prisma = fakePrisma(row(), { updateCount: 0 });
    const findUnique = prisma.workerPayout.findUnique as ReturnType<typeof vi.fn>;
    findUnique.mockResolvedValueOnce(row()); // initial read: released
    findUnique.mockResolvedValueOnce(row({ status: "paid", paymentRef: "payout-test-synthetic-other", paidAt: new Date() })); // re-read: paid
    const result = await executeTestWorkerPayout(prisma, { payoutId: PAYOUT });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.payout.mode).toBe("already_paid");
    expect(result.payout.paymentRef).toBe("payout-test-synthetic-other");
  });

  it("reports a conflict when the guard matched nothing and the row is not paid afterward", async () => {
    const prisma = fakePrisma(row(), { updateCount: 0 });
    const findUnique = prisma.workerPayout.findUnique as ReturnType<typeof vi.fn>;
    findUnique.mockResolvedValueOnce(row()); // released
    findUnique.mockResolvedValueOnce(row({ status: "held" })); // re-read: not paid
    const result = await executeTestWorkerPayout(prisma, { payoutId: PAYOUT });
    expect(result).toEqual({ ok: false, reason: "conflict" });
  });
});
