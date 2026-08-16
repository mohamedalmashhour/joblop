import type { PaymentRecord } from "@rwos/shared";

// Stage 2b.4-C3-F1 — bounded aged-`processing` reconciliation sweeper (NO scheduler/cron; that is F2).
//
// It selects only `processing` attempts older than a minimum age, oldest-first, up to a hard batch cap,
// and invokes the already-approved PaymentRepository.reconcile() for each — the query-only, guarded
// finalize. It NEVER calls provider execute/authorize/capture/refund/void and never retries money
// movement. Each attempt is handled independently (one failure does not abort the batch). Results are
// structured and safe: only opaque ids, the resulting state, and a coarse error CATEGORY — never raw
// error messages, idempotency keys, or payment details.

export type AgedProcessingCandidate = Readonly<{ id: string; organizationId: string }>;

export type SweepConfig = Readonly<{ minAgeMs: number; maxBatchSize: number }>;

// Coarse, non-sensitive outcome buckets. No raw provider/error text is ever surfaced.
export type SweepItemOutcome = "resolved" | "still_processing" | "error";

export type SweepItemResult = Readonly<{
  paymentId: string;
  organizationId: string;
  outcome: SweepItemOutcome;
  state: PaymentRecord["state"] | null; // resulting attempt state, or null when reconcile threw
}>;

export type SweepResult = Readonly<{
  selected: number;
  resolved: number;
  stillProcessing: number;
  errored: number;
  items: readonly SweepItemResult[];
}>;

export interface AgedProcessingSweeper {
  sweep(config: SweepConfig): Promise<SweepResult>;
}

export function createAgedProcessingSweeper(deps: {
  // Selects up to `limit` `processing` attempts whose updatedAt is strictly before `olderThan`,
  // oldest-first, tenant-agnostic (each candidate carries its own organizationId).
  selectAgedProcessing(input: { olderThan: Date; limit: number }): Promise<readonly AgedProcessingCandidate[]>;
  // The approved, org-scoped, query-only reconcile finalize.
  reconcile(input: { paymentId: string; organizationId: string }): Promise<PaymentRecord>;
  now?: () => Date;
}): AgedProcessingSweeper {
  const now = deps.now ?? (() => new Date());
  return {
    async sweep(config) {
      // Fail closed on invalid safety limits — never sweep with a bad age/batch bound.
      if (!Number.isFinite(config.minAgeMs) || config.minAgeMs < 0) {
        throw new Error("Sweeper minimum age must be a non-negative finite number of milliseconds.");
      }
      if (!Number.isInteger(config.maxBatchSize) || config.maxBatchSize < 1) {
        throw new Error("Sweeper maximum batch size must be a positive integer.");
      }

      const olderThan = new Date(now().getTime() - config.minAgeMs);
      const candidates = await deps.selectAgedProcessing({ olderThan, limit: config.maxBatchSize });

      const items: SweepItemResult[] = [];
      let resolved = 0;
      let stillProcessing = 0;
      let errored = 0;

      // Process each attempt INDEPENDENTLY — one failure must not abort the rest. No immediate retry.
      for (const candidate of candidates) {
        try {
          const record = await deps.reconcile({ paymentId: candidate.id, organizationId: candidate.organizationId });
          if (record.state === "processing") {
            stillProcessing += 1; // indeterminate/unknown → left safely unresolved
            items.push({ paymentId: candidate.id, organizationId: candidate.organizationId, outcome: "still_processing", state: "processing" });
          } else {
            resolved += 1; // reconcile verified a terminal (or next) state
            items.push({ paymentId: candidate.id, organizationId: candidate.organizationId, outcome: "resolved", state: record.state });
          }
        } catch {
          // Provider unavailable / reconcile error → leave the payment safely UNRESOLVED (still processing).
          // We do NOT guess an outcome and do NOT surface the raw error (which may carry sensitive detail).
          errored += 1;
          items.push({ paymentId: candidate.id, organizationId: candidate.organizationId, outcome: "error", state: null });
        }
      }

      return { selected: candidates.length, resolved, stillProcessing, errored, items };
    }
  };
}

// Prisma-backed selector: only `processing`, only aged, oldest-first, hard-capped.
export function createPrismaAgedProcessingSelector(prismaClient: unknown) {
  const prisma = prismaClient as {
    employerPaymentAttempt: { findMany(input: unknown): Promise<readonly AgedProcessingCandidate[]> };
  };
  return {
    async selectAgedProcessing(input: { olderThan: Date; limit: number }): Promise<readonly AgedProcessingCandidate[]> {
      const rows = await prisma.employerPaymentAttempt.findMany({
        where: { state: "processing", updatedAt: { lt: input.olderThan } },
        orderBy: { updatedAt: "asc" }, // deterministic, oldest first
        take: input.limit, // explicit hard cap
        select: { id: true, organizationId: true }
      });
      return rows.map((row) => ({ id: row.id, organizationId: row.organizationId }));
    }
  };
}
