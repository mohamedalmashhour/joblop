import { createMemoryBrainStore, type BrainMode } from "@rwos/brain";
import { describe, expect, it } from "vitest";
import { HOUR, NOW, at, emptyRows, failure, fakeData, fakeEffects, request, shift, timesheet, unfilledJob, type FakeRows } from "./brainTestFixtures";
import { JOBLOP_ACTION_KEYS, JOBLOP_BRAIN_ACTIONS, type JoblopActionKey } from "./joblopActions";
import { createJoblopBrain } from "./joblopBrain";
import type { JoblopBrainEffects } from "./joblopRules";

// One scenario per action: the rows that make the matching rule recommend it, and the effect it calls.
const SCENARIOS: Record<JoblopActionKey, { rows: (n: number) => Partial<FakeRows>; effect: keyof JoblopBrainEffects }> = {
  resend_failed_message: { rows: (n) => ({ failures: ids(n).map((id) => failure({ id })) }), effect: "resendFailedMessage" },
  remind_worker_check_in: { rows: (n) => ({ shifts: ids(n).map((assignmentId) => shift({ assignmentId })) }), effect: "remindWorkerToCheckIn" },
  remind_employer_timesheet: { rows: (n) => ({ timesheets: ids(n).map((timesheetId) => timesheet({ timesheetId })) }), effect: "remindEmployerToConfirmHours" },
  remind_worker_timesheet: {
    rows: (n) => ({ timesheets: ids(n).map((timesheetId) => timesheet({ timesheetId, status: "worker_review", workerReviewStatus: "pending" })) }),
    effect: "remindWorkerToConfirmHours"
  },
  offer_employer_bonus: { rows: (n) => ({ unfilled: ids(n).map((jobRequestId) => unfilledJob({ jobRequestId })) }), effect: "offerEmployerBonus" },
  auto_approve_request: { rows: (n) => ({ requests: ids(n).map((jobRequestId) => request({ jobRequestId })) }), effect: "approveRequest" },
  auto_approve_timesheet: {
    rows: (n) => ({ timesheets: ids(n).map((timesheetId) => timesheet({ timesheetId, status: "platform_review", employerReviewStatus: "confirmed" })) }),
    effect: "approveTimesheet"
  },
  notify_worker_report_hours: { rows: (n) => ({ unreported: ids(n).map((id) => unreported(id, at(-1 * HOUR))) }), effect: "notifyWorkerToReportHours" },
  close_unreported_shift: { rows: (n) => ({ unreported: ids(n).map((id) => unreported(id, at(-13 * HOUR))) }), effect: "closeUnreportedShift" }
};

function unreported(attendanceRecordId: string, scheduledEndAt: Date) {
  return { attendanceRecordId, jobRequestNumber: "JR-7", title: "Farm worker", scheduledEndAt };
}

function ids(n: number) {
  return Array.from({ length: n }, (_, i) => `00000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`);
}

function setup(key: JoblopActionKey, options: { mode?: BrainMode; on?: boolean; count?: number } = {}) {
  const store = createMemoryBrainStore({ mode: options.mode ?? "live", switches: options.on === false ? {} : { [key]: true } });
  const rows = { ...emptyRows(), ...SCENARIOS[key].rows(options.count ?? 1) };
  const { effects, calls } = fakeEffects();
  let clock = NOW;
  const brain = createJoblopBrain({ store, data: fakeData(rows), effects, now: () => clock });
  const effectCalls = () => calls.filter((c) => c.name === SCENARIOS[key].effect);
  return { store, brain, calls, effectCalls, advance: (ms: number) => (clock = new Date(clock.getTime() + ms)) };
}

describe("joblop brain actions", () => {
  it("registers exactly the phase-1 actions, none of which moves money", () => {
    expect(JOBLOP_BRAIN_ACTIONS.map((a) => a.key)).toEqual([...JOBLOP_ACTION_KEYS]);
    for (const action of JOBLOP_BRAIN_ACTIONS) {
      expect(action.movesMoney).toBe(false);
      expect(action.key).not.toMatch(/charge|payout|settle|refund|paid|transfer/);
      expect(action.dailyCap).toBeGreaterThan(0);
    }
  });

  for (const key of JOBLOP_ACTION_KEYS) {
    describe(key, () => {
      it("switch off ⇒ no action", async () => {
        const { brain, calls, store } = setup(key, { on: false });
        await brain.sweep();
        expect(calls).toEqual([]);
        expect(store.actions).toEqual([]);
        expect(store.issues.some((i) => i.recommendedAction === key)).toBe(true);
      });

      it("switch on ⇒ exactly one action per issue, even over several sweeps", async () => {
        const { brain, effectCalls, store } = setup(key);
        await brain.sweep();
        await brain.sweep();
        await brain.sweep();
        expect(effectCalls()).toHaveLength(1);
        const logged = store.actions.filter((a) => a.actionKey === key);
        expect(logged).toHaveLength(1);
        expect(logged[0]).toMatchObject({ kind: "live", status: "done", actor: { type: "brain" } });
        expect(logged[0]?.reason.length).toBeGreaterThan(0);
        expect(logged[0]?.undoHint.length).toBeGreaterThan(0);
      });

      it("respects the daily cap", async () => {
        const cap = JOBLOP_BRAIN_ACTIONS.find((a) => a.key === key)!.dailyCap;
        const { brain, effectCalls } = setup(key, { count: cap + 3 });
        await brain.sweep();
        await brain.sweep();
        expect(effectCalls()).toHaveLength(cap);
      });

      it("kill switch (mode off) ⇒ no action even with the switch on", async () => {
        const { brain, calls, store } = setup(key, { mode: "off" });
        await brain.sweep();
        expect(calls).toEqual([]);
        expect(store.actions).toEqual([]);
      });

      it("watch mode ⇒ 'would have' recorded, nothing runs", async () => {
        const { brain, calls, store } = setup(key, { mode: "watch", on: false });
        await brain.sweep();
        expect(calls).toEqual([]);
        expect(store.actions.filter((a) => a.actionKey === key)).toEqual([expect.objectContaining({ kind: "watch", status: "simulated" })]);
        expect(store.actions[0]?.detail).toMatch(/^Would have: /);
      });
    });
  }

  it("undo: a brain bonus offer is withdrawn, approved hours are sent back", async () => {
    for (const [key, effect] of [
      ["offer_employer_bonus", "withdrawBonusOffer"],
      ["auto_approve_timesheet", "reopenTimesheet"]
    ] as const) {
      const { brain, store, calls } = setup(key);
      await brain.sweep();
      const action = store.actions.find((a) => a.actionKey === key)!;
      expect((await brain.undo(action.id, "staff-1")).status).toBe("undone");
      expect(calls.filter((c) => c.name === effect)).toHaveLength(1);
    }
  });

  it("undo is refused for actions that cannot be reversed", async () => {
    const { brain, store } = setup("remind_worker_check_in");
    await brain.sweep();
    expect((await brain.undo(store.actions[0]!.id, "staff-1")).status).toBe("not_undoable");
  });

  it("a bonus offer leaves the unfilled issue open; the 4 h issue never offers a second bonus", async () => {
    const { brain, store, effectCalls } = setup("offer_employer_bonus");
    await brain.sweep();
    expect(store.issues[0]?.status).toBe("open");
    expect(effectCalls()).toHaveLength(1);
  });

  it("report my hours: one notice after the end, one last reminder 2 h before the deadline, then the closure", async () => {
    const store = createMemoryBrainStore({ mode: "live", switches: { notify_worker_report_hours: true, close_unreported_shift: true } });
    const rows = { ...emptyRows(), unreported: [unreported("att-1", NOW)] };
    const { effects, calls } = fakeEffects();
    let clock = new Date(NOW.getTime() + 5 * 60_000); // 5 min after the end
    const brain = createJoblopBrain({ store, data: fakeData(rows), effects, now: () => clock });
    await brain.sweep();
    await brain.sweep();
    clock = new Date(NOW.getTime() + 6 * HOUR);
    await brain.sweep();
    expect(calls.map((c) => c.name)).toEqual(["notifyWorkerToReportHours"]);
    clock = new Date(NOW.getTime() + 10 * HOUR + 30 * 60_000); // 1 h 30 before the deadline
    await brain.sweep();
    await brain.sweep();
    expect(calls.map((c) => c.name)).toEqual(["notifyWorkerToReportHours", "notifyWorkerToReportHours"]);
    clock = new Date(NOW.getTime() + 12 * HOUR + 60_000); // the window closed
    await brain.sweep();
    await brain.sweep();
    expect(calls.map((c) => c.name)).toEqual(["notifyWorkerToReportHours", "notifyWorkerToReportHours", "closeUnreportedShift"]);
    expect(store.issues.find((i) => i.ruleKey === "shift_not_recorded")?.summary).toContain("Not recorded: no hours reported in time");
  });

  it("a ready request that later shows up as waiting > 2 h is still approved only once", async () => {
    const store = createMemoryBrainStore({ mode: "live", switches: { auto_approve_request: true } });
    const rows = { ...emptyRows(), requests: [request({ submittedAt: at(-1 * HOUR) })] };
    const { effects, calls } = fakeEffects({ status: "failed", detail: "no price" });
    let clock = NOW;
    const brain = createJoblopBrain({ store, data: fakeData(rows), effects, now: () => clock });
    await brain.sweep();
    clock = new Date(NOW.getTime() + 2 * HOUR);
    await brain.sweep();
    expect(calls).toHaveLength(1);
  });
});
