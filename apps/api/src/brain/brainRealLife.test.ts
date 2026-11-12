// Real-life checks on the Brain's decisions, at the rule and engine level (no database). Each one is a
// situation the Postgres suite (tests/integration/postgres-brain-real-life.test.ts) drives end to end;
// here it runs in milliseconds.
import { BrainSetupError, buildBrainSummary, createBrain, createMemoryBrainStore } from "@rwos/brain";
import { describe, expect, it } from "vitest";
import { context, emptyRows, fakeEffects, MIN, NOW, shift, timesheet } from "./brainTestFixtures";
import { JOBLOP_ACTION_KEYS, JOBLOP_BRAIN_ACTIONS } from "./joblopActions";
import { createJoblopBrain } from "./joblopBrain";
import { timesheetUnconfirmedRule } from "./joblopRules";

const ALL_ON = Object.fromEntries([...JOBLOP_ACTION_KEYS, "daily_summary_email"].map((k) => [k, true]));

function liveBrain(rows: ReturnType<typeof emptyRows>, outcome?: Parameters<typeof fakeEffects>[0]) {
  const store = createMemoryBrainStore({ mode: "live", switches: ALL_ON });
  const { effects, calls } = fakeEffects(outcome);
  const ctx = context(rows, effects);
  const brain = createJoblopBrain({ store, data: ctx.data, effects: ctx.effects, now: () => NOW });
  return { store, brain, calls };
}

describe("hours waiting for the WORKER (status worker_review), 24 h after the shift", () => {
  const waitingForWorker = timesheet({ status: "worker_review", workerReviewStatus: "pending", employerReviewStatus: "pending" });

  it("reminds the worker, and does not ask the employer to confirm hours they cannot confirm yet", async () => {
    const [issue] = await timesheetUnconfirmedRule.detect(context({ ...emptyRows(), timesheets: [waitingForWorker] }), NOW);
    expect(issue?.recommendedAction).toBe("remind_worker_timesheet");
  });
});

describe("a worker who has not checked in 10 minutes after the start", () => {
  const late = shift({ startAt: new Date(NOW.getTime() - 10 * MIN) });

  it("a no-show the Brain could not text (no phone) is handed to a person, and staff 'Do it' can retry it", async () => {
    const { store, brain } = liveBrain({ ...emptyRows(), shifts: [late] }, { status: "skipped", detail: "No phone number or texts not set up." });
    expect((await brain.sweep()).actionsSkipped).toBe(1);
    const summary = await buildBrainSummary(store, NOW);
    expect(summary.needsPeople.map((i) => i.subjectId)).toContain(late.assignmentId);
    const [issue] = await store.openIssues("worker_not_checked_in");
    // Staff add the number and press Do it: the action runs again (the fake still answers "skipped").
    expect((await brain.doNow(issue!.id, "staff-1")).status).toBe("skipped");
  });

  it("the no-show stays open for staff after the reminder text, until the worker checks in", async () => {
    const { store, brain } = liveBrain({ ...emptyRows(), shifts: [late] }, { status: "done", detail: "Texted.", resolvesIssue: false });
    await brain.sweep();
    expect((await store.openIssues("worker_not_checked_in")).map((i) => i.subjectId)).toEqual([late.assignmentId]);
    // A second sweep does not text again (handled once).
    expect((await brain.sweep()).actionsDone).toBe(0);
  });
});

describe("money never moves through the Brain", () => {
  it("every Joblop action declares movesMoney: false, and the engine refuses one that does not", () => {
    expect(JOBLOP_BRAIN_ACTIONS.map((a) => a.movesMoney)).toEqual(JOBLOP_BRAIN_ACTIONS.map(() => false));
    const charge = { ...JOBLOP_BRAIN_ACTIONS[0]!, key: "charge_employer", movesMoney: true } as unknown as (typeof JOBLOP_BRAIN_ACTIONS)[number];
    expect(() => createBrain({ store: createMemoryBrainStore(), rules: [], actions: [charge], context: context(emptyRows()) })).toThrow(BrainSetupError);
  });
});
