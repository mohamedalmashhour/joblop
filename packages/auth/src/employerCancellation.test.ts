import { describe, expect, it } from "vitest";
import {
  EmployerCancellationError,
  createEmployerCancellationService,
  type AssignmentCancelPort,
  type AssignmentCancelResult,
  type CancellationJobRequest,
  type CancellationMembershipReader,
  type CancellationStore,
  type ContractRateReader,
  type EmployerCancellationCause,
  type GovernedRate,
  type RequestBillRate,
  type StoredCancellation
} from "./employerCancellation";

const ORG = "org-1";
const REQ = "req-1";
const shiftStart = new Date("2026-08-15T13:00:00.000Z");
const nowAtHoursBefore = (h: number) => new Date(shiftStart.getTime() - h * 3_600_000);

function membership(roleKeys: readonly string[], status = "active"): CancellationMembershipReader {
  return { async listMemberships() { return [{ organizationId: ORG, status, roleKeys }]; } };
}
const OWNER = membership(["ORGANIZATION_OWNER"]);

function jobRequestReader(status = "approved_for_dispatch"): {
  findJobRequest: (o: string, j: string) => Promise<CancellationJobRequest | null>;
} {
  return {
    async findJobRequest(o, j) {
      if (o !== ORG || j !== REQ) return null;
      return { id: REQ, organizationId: ORG, roleDefinitionId: "role-chef", startAt: shiftStart, status };
    }
  };
}

function rateReader(rate: GovernedRate | null): ContractRateReader {
  return { async getGovernedRate() { return rate; } };
}
const RATE_30: GovernedRate = { rateMinor: 3000, currency: "CAD", contractId: "c1", contractVersion: "2026-Q3" };

// In-memory store honoring idempotency by (jobRequestId) and by idempotencyKey.
function makeStore() {
  const rows: Array<StoredCancellation & { idempotencyKey: string; obligationAmount: number | null }> = [];
  let seq = 0;
  const store = {
    async createCancellation(input: Parameters<CancellationStore["createCancellation"]>[0]) {
      const existing = rows.find(
        (r) => r.jobRequestId === input.jobRequestId || r.idempotencyKey === input.idempotencyKey
      );
      if (existing) return { created: false, cancellation: existing };
      const row = {
        id: `cx-${++seq}`,
        organizationId: input.organizationId,
        jobRequestId: input.jobRequestId,
        cause: input.cause,
        status: input.initialStatus,
        affectedConfirmedWorkers: input.affectedConfirmedWorkers,
        idempotencyKey: input.idempotencyKey,
        initiatedByUserId: input.initiatedByUserId,
        obligationAmount: input.obligation ? input.obligation.amountMinor : null,
        obligation: input.obligation
          ? { id: `ob-${seq}`, amountMinor: input.obligation.amountMinor, currency: input.obligation.currency, status: "RECORDED" as const }
          : null
      };
      rows.push(row);
      return { created: true, cancellation: row };
    },
    async findById(id: string) {
      return rows.find((r) => r.id === id) ?? null;
    },
    async updateStatus(id: string, status: StoredCancellation["status"]) {
      const row = rows.find((r) => r.id === id);
      if (!row) throw new Error("not found");
      (row as { status: StoredCancellation["status"] }).status = status;
      return row;
    },
    async listByStatus(statuses: readonly StoredCancellation["status"][], limit: number) {
      return rows
        .filter((r) => statuses.includes(r.status))
        .slice(0, limit)
        .map((r) => ({
          id: r.id,
          organizationId: r.organizationId,
          jobRequestId: r.jobRequestId,
          cause: r.cause,
          status: r.status,
          affectedConfirmedWorkers: r.affectedConfirmedWorkers,
          initiatedByUserId: r.initiatedByUserId,
          initiatedAt: "2026-08-10T00:00:00.000Z",
          handoffAttempts: 0,
          reconciliationNote: null,
          obligationAmountMinor: r.obligation ? r.obligation.amountMinor : null,
          obligationCurrency: r.obligation ? r.obligation.currency : null
        }));
    }
  };
  return { store, rows };
}

function assignmentPort(result: AssignmentCancelResult | (() => Promise<AssignmentCancelResult>)): {
  port: AssignmentCancelPort;
  calls: number;
} {
  const state = { calls: 0 };
  const port: AssignmentCancelPort = {
    async cancelConfirmedAssignments() {
      state.calls += 1;
      return typeof result === "function" ? result() : result;
    }
  };
  return { port, get calls() { return state.calls; } } as { port: AssignmentCancelPort; calls: number };
}

function service(opts: {
  confirmed: number;
  rate?: GovernedRate | null;
  membershipReader?: CancellationMembershipReader;
  now?: () => Date;
  port?: AssignmentCancelPort;
  requestStatus?: string;
  requestCancelOk?: boolean; // whether the job-request cancel succeeds (default true)
  billRate?: RequestBillRate | null;
}) {
  const { store, rows } = makeStore();
  const requestCancels: string[] = [];
  const svc = createEmployerCancellationService({
    membershipReader: opts.membershipReader ?? OWNER,
    jobRequestReader: jobRequestReader(opts.requestStatus),
    confirmedAssignmentReader: { async countConfirmedAssignments() { return opts.confirmed; } },
    contractRateReader: rateReader(opts.rate === undefined ? RATE_30 : opts.rate),
    ...(opts.billRate !== undefined ? { billRateReader: { async getBillRate() { return opts.billRate ?? null; } } } : {}),
    store,
    countryCurrency: "CAD", // Stage 2b.3b-2: Canada value; keeps null-rate preview label byte-identical
    assignmentCancelPort:
      opts.port ?? { async cancelConfirmedAssignments() { return { attempted: opts.confirmed, cancelled: opts.confirmed, failed: 0 }; } },
    requestCancellerPort: {
      async cancelJobRequest({ actorUserId }) {
        requestCancels.push(actorUserId);
        return opts.requestCancelOk ?? true;
      }
    },
    now: opts.now ?? (() => nowAtHoursBefore(1))
  });
  return { svc, rows, requestCancels };
}

describe("employer cancellation — bill rate from the pricing snapshot", () => {
  const snap = (jobLength: string | null): RequestBillRate => ({ rateMinor: 3450, currency: "CAD", contractId: "c1", contractVersion: "v1", jobLength });

  it("bills the snapshot rate (what the invoice uses) over the contract rate", async () => {
    const { svc } = service({ confirmed: 2, billRate: snap("short_term"), now: () => nowAtHoursBefore(2) });
    const p = await svc.previewCancellation({ actorUserId: "u1", organizationId: ORG, jobRequestId: REQ });
    expect(p.obligationApplies).toBe(true);
    expect(p.obligationAmountMinor).toBe(6 * 3450 * 2);
  });

  it("never charges a long-term job", async () => {
    const { svc } = service({ confirmed: 2, billRate: snap("long_term"), now: () => nowAtHoursBefore(2) });
    const p = await svc.previewCancellation({ actorUserId: "u1", organizationId: ORG, jobRequestId: REQ });
    expect(p.obligationApplies).toBe(false);
    expect(p.obligationAmountMinor).toBe(0);
  });

  it("falls back to the contract rate when the request has no snapshot", async () => {
    const { svc } = service({ confirmed: 1, billRate: null, now: () => nowAtHoursBefore(2) });
    const p = await svc.previewCancellation({ actorUserId: "u1", organizationId: ORG, jobRequestId: REQ });
    expect(p.obligationAmountMinor).toBe(6 * 3000);
  });
});

describe("employer cancellation — preview (authoritative consequence)", () => {
  it("charges nothing at exactly 24h before start", async () => {
    const { svc } = service({ confirmed: 2, now: () => nowAtHoursBefore(24) });
    const p = await svc.previewCancellation({ actorUserId: "u1", organizationId: ORG, jobRequestId: REQ });
    expect(p.obligationApplies).toBe(false);
    expect(p.obligationAmountMinor).toBe(0);
    expect(p.requiresPlatformHandoff).toBe(true); // confirmed workers still need transition
  });

  it("charges 6h × rate × workers at 23h59m", async () => {
    const { svc } = service({ confirmed: 2, now: () => nowAtHoursBefore(23 + 59 / 60) });
    const p = await svc.previewCancellation({ actorUserId: "u1", organizationId: ORG, jobRequestId: REQ });
    expect(p.obligationApplies).toBe(true);
    expect(p.obligationAmountMinor).toBe(36000); // 6×3000×2 = $360 (client billed)
    expect(p.affectedConfirmedWorkers).toBe(2);
    // Owner decision 2026-11-09: no automatic worker pay on a late employer cancellation.
    expect(p.workerCompensationHours).toBe(0);
    expect(p.workerCompensationMinor).toBe(0);
  });

  it("zero confirmed workers → $0 and no handoff", async () => {
    const { svc } = service({ confirmed: 0, now: () => nowAtHoursBefore(1) });
    const p = await svc.previewCancellation({ actorUserId: "u1", organizationId: ORG, jobRequestId: REQ });
    expect(p.obligationApplies).toBe(false);
    expect(p.requiresPlatformHandoff).toBe(false);
  });

  // CHARACTERIZATION (Stage 2b.3b-A): the `rate?.currency ?? "CAD"` at employerCancellation.ts:303.
  // Obligation AMOUNT is pure integer math (governedRateMinor only); currency only LABELS it and,
  // on confirm, is persisted to EmployerCancellationObligation.currency (no DB CHECK). Documents that
  // a USD governed rate persists its currency and that the CAD fallback only labels a non-applying one.
  it("[characterization] obligation currency follows the governed rate (USD persists), CAD fallback only when no rate", async () => {
    const usd: GovernedRate = { rateMinor: 3000, currency: "USD", contractId: "c1", contractVersion: "2026-Q3" };
    const { svc } = service({ confirmed: 2, rate: usd, now: () => nowAtHoursBefore(1) });
    const { cancellation, preview } = await svc.confirmCancellation({
      actorUserId: "u1", organizationId: ORG, jobRequestId: REQ, idempotencyKey: "k-usd"
    });
    expect(preview.currency).toBe("USD");
    expect(cancellation.obligation).toMatchObject({ amountMinor: 36000, currency: "USD", status: "RECORDED" }); // amount unchanged; persisted label = USD

    const { svc: svcNull } = service({ confirmed: 2, rate: null, now: () => nowAtHoursBefore(1) });
    const pNull = await svcNull.previewCancellation({ actorUserId: "u1", organizationId: ORG, jobRequestId: REQ });
    expect(pNull.obligationApplies).toBe(false); // no governed rate → obligation cannot apply
    expect(pNull.currency).toBe("CAD"); // the CAD fallback labels a non-applying obligation only
  });

  it("denies a non-owner and a cross-org request", async () => {
    const staff = service({ confirmed: 1, membershipReader: membership(["ORGANIZATION_STAFF"]) });
    await expect(
      staff.svc.previewCancellation({ actorUserId: "u1", organizationId: ORG, jobRequestId: REQ })
    ).rejects.toMatchObject({ code: "denied" });

    const { svc } = service({ confirmed: 1 });
    await expect(
      svc.previewCancellation({ actorUserId: "u1", organizationId: ORG, jobRequestId: "other-req" })
    ).rejects.toMatchObject({ code: "not_found" });
  });
});

describe("employer cancellation — confirm (record intent) + completeHandoff (platform)", () => {
  it("confirm records intent; completeHandoff cancels assignments then the request", async () => {
    const p = assignmentPort({ attempted: 2, cancelled: 2, failed: 0 });
    const { svc, rows, requestCancels } = service({ confirmed: 2, port: p.port, now: () => nowAtHoursBefore(1) });
    const { cancellation, preview } = await svc.confirmCancellation({
      actorUserId: "u1", organizationId: ORG, jobRequestId: REQ, idempotencyKey: "k1"
    });
    expect(preview.obligationAmountMinor).toBe(36000);
    // Employer step records only — assignments not transitioned, request not cancelled.
    expect(cancellation.status).toBe("assignment_cancellation_pending");
    expect(cancellation.obligation).toMatchObject({ amountMinor: 36000, currency: "CAD", status: "RECORDED" });
    expect(p.calls).toBe(0);
    expect(requestCancels).toHaveLength(0);

    // Platform completes: assignments cancelled, THEN request cancelled (initiator).
    const done = await svc.completeHandoff({ cancellationId: cancellation.id });
    expect(done.cancellation.status).toBe("completed");
    expect(p.calls).toBe(1);
    expect(requestCancels).toEqual(["u1"]); // request cancelled under the initiator's authority
    expect(rows).toHaveLength(1);
  });

  it("does NOT cancel the request when an assignment fails (reconciliation, obligation intact)", async () => {
    const p = assignmentPort({ attempted: 3, cancelled: 2, failed: 1 });
    const { svc, requestCancels } = service({ confirmed: 3, port: p.port, now: () => nowAtHoursBefore(1) });
    const { cancellation } = await svc.confirmCancellation({
      actorUserId: "u1", organizationId: ORG, jobRequestId: REQ, idempotencyKey: "kf"
    });
    const done = await svc.completeHandoff({ cancellationId: cancellation.id });
    expect(done.cancellation.status).toBe("requires_reconciliation");
    expect(requestCancels).toHaveLength(0); // request stays active until assignments resolve
    expect(done.cancellation.obligation?.amountMinor).toBe(6 * 3000 * 3); // obligation preserved
  });

  it("assignments succeed but request cancel fails → requires_reconciliation", async () => {
    const p = assignmentPort({ attempted: 2, cancelled: 2, failed: 0 });
    const { svc } = service({ confirmed: 2, port: p.port, requestCancelOk: false, now: () => nowAtHoursBefore(1) });
    const { cancellation } = await svc.confirmCancellation({
      actorUserId: "u1", organizationId: ORG, jobRequestId: REQ, idempotencyKey: "kr"
    });
    const done = await svc.completeHandoff({ cancellationId: cancellation.id });
    expect(done.cancellation.status).toBe("requires_reconciliation");
  });

  it("surfaces requires_reconciliation to the admin reconciliation queue", async () => {
    const p = assignmentPort({ attempted: 3, cancelled: 2, failed: 1 });
    const { svc } = service({ confirmed: 3, port: p.port, now: () => nowAtHoursBefore(1) });
    const { cancellation } = await svc.confirmCancellation({
      actorUserId: "u1", organizationId: ORG, jobRequestId: REQ, idempotencyKey: "kq"
    });
    await svc.completeHandoff({ cancellationId: cancellation.id });
    const queue = await svc.listReconciliation();
    expect(queue).toHaveLength(1);
    expect(queue[0]).toMatchObject({
      status: "requires_reconciliation",
      obligationAmountMinor: 6 * 3000 * 3,
      affectedConfirmedWorkers: 3
    });
  });

  it("is idempotent — repeated confirm = ONE record; repeated completeHandoff = ONE transition", async () => {
    const p = assignmentPort({ attempted: 2, cancelled: 2, failed: 0 });
    const { svc, rows, requestCancels } = service({ confirmed: 2, port: p.port, now: () => nowAtHoursBefore(1) });
    const a = await svc.confirmCancellation({ actorUserId: "u1", organizationId: ORG, jobRequestId: REQ, idempotencyKey: "k1" });
    const b = await svc.confirmCancellation({ actorUserId: "u1", organizationId: ORG, jobRequestId: REQ, idempotencyKey: "k1" });
    expect(rows).toHaveLength(1);
    expect(a.cancellation.id).toBe(b.cancellation.id);
    await svc.completeHandoff({ cancellationId: a.cancellation.id });
    const second = await svc.completeHandoff({ cancellationId: a.cancellation.id });
    expect(second.cancellation.status).toBe("completed");
    expect(p.calls).toBe(1); // already completed → no second assignment transition
    expect(requestCancels).toEqual(["u1"]); // request cancelled exactly once
  });

  it("zero confirmed workers → confirm cancels the request directly ($0, no handoff)", async () => {
    const p = assignmentPort({ attempted: 0, cancelled: 0, failed: 0 });
    const { svc, requestCancels } = service({ confirmed: 0, port: p.port, now: () => nowAtHoursBefore(1) });
    const { cancellation } = await svc.confirmCancellation({
      actorUserId: "u1", organizationId: ORG, jobRequestId: REQ, idempotencyKey: "k0"
    });
    expect(cancellation.status).toBe("completed");
    expect(cancellation.obligation).toBeNull();
    expect(p.calls).toBe(0);
    expect(requestCancels).toEqual(["u1"]); // request cancelled under the confirming employer
  });

  it("zero-worker request-cancel failure → requires_reconciliation", async () => {
    const { svc } = service({ confirmed: 0, requestCancelOk: false, now: () => nowAtHoursBefore(1) });
    const { cancellation } = await svc.confirmCancellation({
      actorUserId: "u1", organizationId: ORG, jobRequestId: REQ, idempotencyKey: "kz"
    });
    expect(cancellation.status).toBe("requires_reconciliation");
  });

  it("completeHandoff marks requires_reconciliation on partial failure — never fakes success", async () => {
    const p = assignmentPort({ attempted: 3, cancelled: 2, failed: 1 });
    const { svc } = service({ confirmed: 3, port: p.port, now: () => nowAtHoursBefore(1) });
    const { cancellation } = await svc.confirmCancellation({
      actorUserId: "u1", organizationId: ORG, jobRequestId: REQ, idempotencyKey: "kx"
    });
    expect(cancellation.obligation?.amountMinor).toBe(6 * 3000 * 3); // recorded truthfully
    const done = await svc.completeHandoff({ cancellationId: cancellation.id });
    expect(done.cancellation.status).toBe("requires_reconciliation");
  });

  it("completeHandoff marks requires_reconciliation when the platform handoff throws", async () => {
    const throwingPort: AssignmentCancelPort = {
      async cancelConfirmedAssignments() { throw new Error("dispatch unavailable"); }
    };
    const { svc } = service({ confirmed: 2, port: throwingPort, now: () => nowAtHoursBefore(1) });
    const { cancellation } = await svc.confirmCancellation({
      actorUserId: "u1", organizationId: ORG, jobRequestId: REQ, idempotencyKey: "kt"
    });
    const done = await svc.completeHandoff({ cancellationId: cancellation.id });
    expect(done.cancellation.status).toBe("requires_reconciliation");
  });

  it("re-derives the obligation at confirm time (ignores any stale/browser value)", async () => {
    // Worker count changes between preview and confirm; confirm uses the live count.
    const { svc } = service({ confirmed: 4, now: () => nowAtHoursBefore(2) });
    const { preview } = await svc.confirmCancellation({
      actorUserId: "u1", organizationId: ORG, jobRequestId: REQ, idempotencyKey: "kd"
    });
    expect(preview.affectedConfirmedWorkers).toBe(4);
    expect(preview.obligationAmountMinor).toBe(6 * 3000 * 4);
  });

  it("applies NO obligation for non-employer causes", async () => {
    const causes: EmployerCancellationCause[] = [
      "MUTUALLY_CANCELLED", "WORKER_CANCELLED", "WORKER_NO_SHOW", "PLATFORM_UNABLE_TO_FILL", "PLATFORM_CANCELLED"
    ];
    for (const cause of causes) {
      const { svc } = service({ confirmed: 2, now: () => nowAtHoursBefore(1) });
      const { preview } = await svc.confirmCancellation({
        actorUserId: "u1", organizationId: ORG, jobRequestId: REQ, idempotencyKey: `kc-${cause}`, cause
      });
      expect(preview.obligationApplies).toBe(false);
      expect(preview.obligationAmountMinor).toBe(0);
    }
  });

  it("requires an idempotency key", async () => {
    const { svc } = service({ confirmed: 1 });
    await expect(
      svc.confirmCancellation({ actorUserId: "u1", organizationId: ORG, jobRequestId: REQ, idempotencyKey: "  " })
    ).rejects.toBeInstanceOf(EmployerCancellationError);
  });

  it("uses $0 obligation when the role has no governed rate (unpriced)", async () => {
    const { svc } = service({ confirmed: 2, rate: null, now: () => nowAtHoursBefore(1) });
    const { preview, cancellation } = await svc.confirmCancellation({
      actorUserId: "u1", organizationId: ORG, jobRequestId: REQ, idempotencyKey: "kn"
    });
    expect(preview.obligationApplies).toBe(false);
    expect(cancellation.obligation).toBeNull();
    // still needs the platform handoff for the confirmed workers
    expect(cancellation.status).toBe("assignment_cancellation_pending");
  });
});
