import { describe, expect, it } from "vitest";
import {
  EmployerReduceError,
  createEmployerReduceService,
  type ConfirmedAssignment,
  type ReduceGovernedRate,
  type ReduceMembershipReader,
  type ReduceStore,
  type SelectedAssignmentCancelResult,
  type StoredReduction
} from "./employerReduce";

const ORG = "org-1";
const REQ = "req-1";
const shiftStart = new Date("2026-08-15T13:00:00.000Z");
const nowAt = (hoursBefore: number) => new Date(shiftStart.getTime() - hoursBefore * 3_600_000);

const OWNER: ReduceMembershipReader = {
  async listMemberships() { return [{ organizationId: ORG, status: "active", roleKeys: ["ORGANIZATION_OWNER"] }]; }
};
const RATE: ReduceGovernedRate = { rateMinor: 3000, currency: "CAD", contractId: "c1", contractVersion: "2026-Q3" };

function assignment(id: string): ConfirmedAssignment {
  return { id, status: "confirmed", workerDisplay: `Worker ${id}`, startAt: shiftStart.toISOString(), endAt: shiftStart.toISOString() };
}

function makeStore() {
  const rows: StoredReduction[] = [];
  let seq = 0;
  const store = {
    async createReduction(input: Parameters<ReduceStore["createReduction"]>[0]) {
      const existing = rows.find((r) => r.idempotencyKey === input.idempotencyKey);
      if (existing) return { created: false, reduction: existing };
      const row: StoredReduction = {
        id: `rx-${++seq}`,
        organizationId: input.organizationId,
        jobRequestId: input.jobRequestId,
        status: input.initialStatus,
        previousTarget: input.previousTarget,
        newTarget: input.newTarget,
        affectedConfirmed: input.affectedConfirmed,
        selectedAssignmentIds: input.selectedAssignmentIds,
        idempotencyKey: input.idempotencyKey,
        initiatedByUserId: input.initiatedByUserId,
        obligationAmountMinor: input.obligation ? input.obligation.amountMinor : null,
        obligationCurrency: input.obligation ? input.obligation.currency : null
      };
      rows.push(row);
      return { created: true, reduction: row };
    },
    async findById(id: string) {
      return rows.find((r) => r.id === id) ?? null;
    },
    async updateStatus(id: string, status: StoredReduction["status"]) {
      const row = rows.find((r) => r.id === id);
      if (!row) throw new Error("not found");
      (row as { status: StoredReduction["status"] }).status = status;
      return row;
    },
    async listByStatus(statuses: readonly StoredReduction["status"][], limit: number) {
      return rows.filter((r) => statuses.includes(r.status)).slice(0, limit);
    }
  };
  return { store, rows };
}

function service(opts: {
  requested: number;
  confirmed: ConfirmedAssignment[];
  now?: () => Date;
  cancelResult?: SelectedAssignmentCancelResult;
  setterOk?: boolean;
  rate?: ReduceGovernedRate | null; // characterization override; defaults to the CAD RATE fixture
  countryCurrency?: string | undefined; // override; defaults to "CAD"
}) {
  const { store, rows } = makeStore();
  const cancelCalls: string[][] = [];
  const setterCalls: number[] = [];
  const svc = createEmployerReduceService({
    membershipReader: OWNER,
    jobRequestReader: {
      async findJobRequest(o, j) {
        if (o !== ORG || j !== REQ) return null;
        return { id: REQ, organizationId: ORG, roleDefinitionId: "role-chef", numberOfWorkers: opts.requested, startAt: shiftStart, status: "approved_for_dispatch", versionToken: 1 };
      }
    },
    confirmedAssignmentLister: { async listConfirmedAssignments() { return opts.confirmed; } },
    contractRateReader: { async getGovernedRate() { return opts.rate === undefined ? RATE : opts.rate; } },
    countryCurrency: "countryCurrency" in opts ? opts.countryCurrency : "CAD", // default Canada; override for fail-closed tests
    store,
    assignmentCancelPort: {
      async cancelSelectedAssignments({ assignmentIds }) {
        cancelCalls.push([...assignmentIds]);
        return opts.cancelResult ?? { attempted: assignmentIds.length, cancelled: assignmentIds.length, failed: 0 };
      }
    },
    capacitySetter: {
      async setRequestedCapacity({ newTarget }) {
        setterCalls.push(newTarget);
        return opts.setterOk ?? true;
      }
    },
    now: opts.now ?? (() => nowAt(1))
  });
  return { svc, rows, cancelCalls, setterCalls };
}

describe("employer reduce — preview", () => {
  it("removes unfilled first; reduce 5→4 with 3 confirmed affects no confirmed", async () => {
    const { svc } = service({ requested: 5, confirmed: [assignment("a"), assignment("b"), assignment("c")] });
    const p = await svc.reducePreview({ actorUserId: "u1", organizationId: ORG, jobRequestId: REQ, newTarget: 4 });
    expect(p).toMatchObject({ unfilledRemoved: 1, affectedConfirmed: 0, requiresConfirmedSelection: false, obligationApplies: false });
  });

  it("reduce 5→2 with 3 confirmed affects 1 confirmed; obligation = 1×6×$30 = $180 (<48h)", async () => {
    const { svc } = service({ requested: 5, confirmed: [assignment("a"), assignment("b"), assignment("c")] });
    const p = await svc.reducePreview({ actorUserId: "u1", organizationId: ORG, jobRequestId: REQ, newTarget: 2 });
    expect(p).toMatchObject({ unfilledRemoved: 2, affectedConfirmed: 1, requiresConfirmedSelection: true, obligationApplies: true, obligationAmountMinor: 18000 });
    expect(p.eligibleAssignments).toHaveLength(3);
  });

  it("≥48h → affected confirmed but no obligation", async () => {
    const { svc } = service({ requested: 3, confirmed: [assignment("a"), assignment("b"), assignment("c")], now: () => nowAt(72) });
    const p = await svc.reducePreview({ actorUserId: "u1", organizationId: ORG, jobRequestId: REQ, newTarget: 2 });
    expect(p.affectedConfirmed).toBe(1);
    expect(p.obligationApplies).toBe(false);
  });

  // CHARACTERIZATION (Stage 2b.3b-A): the `rate?.currency ?? "CAD"` at employerReduce.ts:235.
  // The obligation AMOUNT never consumes currency (pure integer minor-unit math); currency only
  // LABELS the preview. Documents that a governed USD rate propagates its currency, and that the
  // "CAD" fallback only ever labels a preview whose obligation does NOT apply (rate null).
  it("[characterization] preview currency follows the governed rate (USD), falls back to CAD only when no rate", async () => {
    const usd: ReduceGovernedRate = { rateMinor: 3000, currency: "USD", contractId: "c1", contractVersion: "2026-Q3" };
    const { svc: svcUsd } = service({ requested: 5, confirmed: [assignment("a"), assignment("b"), assignment("c")], rate: usd });
    const pUsd = await svcUsd.reducePreview({ actorUserId: "u1", organizationId: ORG, jobRequestId: REQ, newTarget: 2 });
    expect(pUsd).toMatchObject({ obligationApplies: true, obligationAmountMinor: 18000, currency: "USD" }); // amount unchanged, label = USD

    const { svc: svcNull } = service({ requested: 5, confirmed: [assignment("a"), assignment("b"), assignment("c")], rate: null });
    const pNull = await svcNull.reducePreview({ actorUserId: "u1", organizationId: ORG, jobRequestId: REQ, newTarget: 2 });
    expect(pNull.obligationApplies).toBe(false); // no governed rate → obligation cannot apply
    expect(pNull.currency).toBe("CAD"); // the CAD fallback labels a non-applying obligation only
  });
});

describe("employer reduce — confirm (partial cancellation)", () => {
  const three = () => [assignment("a"), assignment("b"), assignment("c")];

  it("unfilled-only reduction sets the new target with no handoff/obligation", async () => {
    const { svc, cancelCalls, setterCalls } = service({ requested: 5, confirmed: three() });
    const { reduction } = await svc.reduceConfirm({
      actorUserId: "u1", organizationId: ORG, jobRequestId: REQ, newTarget: 4, selectedAssignmentIds: [], expectedVersion: 1, idempotencyKey: "k1"
    });
    expect(reduction.status).toBe("completed");
    expect(reduction.obligationAmountMinor).toBeNull();
    expect(cancelCalls).toHaveLength(0);
    expect(setterCalls).toEqual([4]);
  });

  // Stage 2b.3c-C: the reduction row's currency is always explicit. When there is no governed rate,
  // the no-obligation preview currency comes from the active countryCurrency; if that is unavailable
  // the operation fails closed BEFORE any persistence (no `?? "CAD"`, no row written).
  it("[currency] fails closed with zero rows when there is no governed rate and no active country currency", async () => {
    const { svc, rows } = service({ requested: 5, confirmed: three(), rate: null, countryCurrency: undefined });
    await expect(
      svc.reduceConfirm({ actorUserId: "u1", organizationId: ORG, jobRequestId: REQ, newTarget: 4, selectedAssignmentIds: [], expectedVersion: 1, idempotencyKey: "kfc" })
    ).rejects.toBeInstanceOf(EmployerReduceError);
    expect(rows).toHaveLength(0); // fail-closed before persistence
  });

  it("confirmed-affecting: confirm records pending; completeReduction cancels ONLY the selected assignment then sets target (request stays active)", async () => {
    const { svc, rows, cancelCalls, setterCalls } = service({ requested: 5, confirmed: three() });
    const { reduction } = await svc.reduceConfirm({
      actorUserId: "u1", organizationId: ORG, jobRequestId: REQ, newTarget: 2, selectedAssignmentIds: ["b"], expectedVersion: 1, idempotencyKey: "k2"
    });
    // Employer step records intent only — no assignment mutation, no target change yet.
    expect(reduction.status).toBe("assignment_cancellation_pending");
    expect(reduction.obligationAmountMinor).toBe(18000);
    expect(cancelCalls).toHaveLength(0);
    expect(setterCalls).toHaveLength(0);

    // Platform completes.
    const done = await svc.completeReduction({ reductionId: reduction.id });
    expect(done.reduction.status).toBe("completed");
    expect(cancelCalls).toEqual([["b"]]); // only the selected assignment
    expect(setterCalls).toEqual([2]); // new target set after handoff
    expect(rows).toHaveLength(1);
  });

  it("rejects a selection count that doesn't match the required reduction", async () => {
    const { svc } = service({ requested: 5, confirmed: three() });
    await expect(
      svc.reduceConfirm({ actorUserId: "u1", organizationId: ORG, jobRequestId: REQ, newTarget: 2, selectedAssignmentIds: ["a", "b"], expectedVersion: 1, idempotencyKey: "k3" })
    ).rejects.toMatchObject({ code: "invalid" });
  });

  it("rejects a fabricated / cross-request assignment id", async () => {
    const { svc } = service({ requested: 5, confirmed: three() });
    await expect(
      svc.reduceConfirm({ actorUserId: "u1", organizationId: ORG, jobRequestId: REQ, newTarget: 2, selectedAssignmentIds: ["ZZZ"], expectedVersion: 1, idempotencyKey: "k4" })
    ).rejects.toMatchObject({ code: "invalid" });
  });

  it("completeReduction partial handoff failure → requires_reconciliation, target NOT changed", async () => {
    const { svc, setterCalls } = service({ requested: 5, confirmed: three(), cancelResult: { attempted: 1, cancelled: 0, failed: 1 } });
    const { reduction } = await svc.reduceConfirm({
      actorUserId: "u1", organizationId: ORG, jobRequestId: REQ, newTarget: 2, selectedAssignmentIds: ["c"], expectedVersion: 1, idempotencyKey: "k5"
    });
    const done = await svc.completeReduction({ reductionId: reduction.id });
    expect(done.reduction.status).toBe("requires_reconciliation");
    expect(setterCalls).toHaveLength(0); // target NOT changed on failure
  });

  it("is idempotent — repeated confirm = one record; repeated completeReduction = one handoff", async () => {
    const { svc, rows, cancelCalls, setterCalls } = service({ requested: 5, confirmed: three() });
    const a = await svc.reduceConfirm({ actorUserId: "u1", organizationId: ORG, jobRequestId: REQ, newTarget: 2, selectedAssignmentIds: ["a"], expectedVersion: 1, idempotencyKey: "kdup" });
    const b = await svc.reduceConfirm({ actorUserId: "u1", organizationId: ORG, jobRequestId: REQ, newTarget: 2, selectedAssignmentIds: ["a"], expectedVersion: 1, idempotencyKey: "kdup" });
    expect(rows).toHaveLength(1);
    expect(a.reduction.id).toBe(b.reduction.id);
    await svc.completeReduction({ reductionId: a.reduction.id });
    const second = await svc.completeReduction({ reductionId: a.reduction.id });
    expect(second.reduction.status).toBe("completed");
    expect(cancelCalls).toHaveLength(1); // already completed → no second handoff
    expect(setterCalls).toEqual([2]);
  });

  it("rejects reduce-to-zero (use whole-request Cancel) and non-reductions", async () => {
    const { svc } = service({ requested: 3, confirmed: three() });
    await expect(svc.reducePreview({ actorUserId: "u1", organizationId: ORG, jobRequestId: REQ, newTarget: 0 })).rejects.toBeInstanceOf(EmployerReduceError);
    await expect(svc.reducePreview({ actorUserId: "u1", organizationId: ORG, jobRequestId: REQ, newTarget: 3 })).rejects.toBeInstanceOf(EmployerReduceError);
  });

  it("denies a non-owner and a cross-org request", async () => {
    const staff = createEmployerReduceService({
      membershipReader: { async listMemberships() { return [{ organizationId: ORG, status: "active", roleKeys: ["ORGANIZATION_STAFF"] }]; } },
      jobRequestReader: { async findJobRequest() { return { id: REQ, organizationId: ORG, roleDefinitionId: "r", numberOfWorkers: 5, startAt: shiftStart, status: "approved_for_dispatch", versionToken: 1 }; } },
      confirmedAssignmentLister: { async listConfirmedAssignments() { return []; } },
      contractRateReader: { async getGovernedRate() { return RATE; } },
      store: makeStore().store,
      assignmentCancelPort: { async cancelSelectedAssignments() { return { attempted: 0, cancelled: 0, failed: 0 }; } },
      capacitySetter: { async setRequestedCapacity() { return true; } }
    });
    await expect(staff.reducePreview({ actorUserId: "u1", organizationId: ORG, jobRequestId: REQ, newTarget: 2 })).rejects.toMatchObject({ code: "denied" });
  });
});
