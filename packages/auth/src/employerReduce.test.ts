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
    async updateStatus(id: string, status: StoredReduction["status"]) {
      const row = rows.find((r) => r.id === id);
      if (!row) throw new Error("not found");
      (row as { status: StoredReduction["status"] }).status = status;
      return row;
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
    contractRateReader: { async getGovernedRate() { return RATE; } },
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

  it("confirmed-affecting reduction cancels ONLY the selected assignment then sets target; request stays active", async () => {
    const { svc, rows, cancelCalls, setterCalls } = service({ requested: 5, confirmed: three() });
    const { reduction } = await svc.reduceConfirm({
      actorUserId: "u1", organizationId: ORG, jobRequestId: REQ, newTarget: 2, selectedAssignmentIds: ["b"], expectedVersion: 1, idempotencyKey: "k2"
    });
    expect(reduction.status).toBe("completed");
    expect(reduction.obligationAmountMinor).toBe(18000);
    expect(cancelCalls).toEqual([["b"]]); // only the selected assignment
    expect(setterCalls).toEqual([2]); // new target
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

  it("partial handoff failure → requires_reconciliation, target NOT changed", async () => {
    const { svc, setterCalls } = service({ requested: 5, confirmed: three(), cancelResult: { attempted: 1, cancelled: 0, failed: 1 } });
    const { reduction } = await svc.reduceConfirm({
      actorUserId: "u1", organizationId: ORG, jobRequestId: REQ, newTarget: 2, selectedAssignmentIds: ["c"], expectedVersion: 1, idempotencyKey: "k5"
    });
    expect(reduction.status).toBe("requires_reconciliation");
    expect(setterCalls).toHaveLength(0); // target not changed on failure
  });

  it("is idempotent — repeated confirm returns the same reduction, one handoff", async () => {
    const { svc, rows, cancelCalls } = service({ requested: 5, confirmed: three() });
    const a = await svc.reduceConfirm({ actorUserId: "u1", organizationId: ORG, jobRequestId: REQ, newTarget: 2, selectedAssignmentIds: ["a"], expectedVersion: 1, idempotencyKey: "kdup" });
    const b = await svc.reduceConfirm({ actorUserId: "u1", organizationId: ORG, jobRequestId: REQ, newTarget: 2, selectedAssignmentIds: ["a"], expectedVersion: 1, idempotencyKey: "kdup" });
    expect(rows).toHaveLength(1);
    expect(a.reduction.id).toBe(b.reduction.id);
    expect(cancelCalls).toHaveLength(1);
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
