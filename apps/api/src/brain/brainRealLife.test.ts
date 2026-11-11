// Real-life checks on the Brain's decisions, at the rule and engine level (no database). Each one is a
// situation the Postgres suite (tests/integration/postgres-brain-real-life.test.ts) drives end to end;
// here it runs in milliseconds so a fix can be checked locally.
//
// Where today's behaviour looks wrong for real life, the test states the CORRECT behaviour and is
// marked `it.fails(...)` with a "BUG:" comment; the matching "ACTUAL:" test pins what the code does.
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

  it("ACTUAL: the Brain recommends emailing the employer", async () => {
    const [issue] = await timesheetUnconfirmedRule.detect(context({ ...emptyRows(), timesheets: [waitingForWorker] }), NOW);
    expect(issue?.recommendedAction).toBe("remind_employer_timesheet");
  });

  // BUG: the employer cannot confirm hours the worker has not confirmed yet (employerConfirm only
  // accepts "employer_review"), so the email asks for something they cannot do, and the worker, who
  // is the one holding things up, is never reminded. Correct: no employer email for worker_review.
  it.fails("does not ask the employer to confirm hours that are still waiting for the worker", async () => {
    const [issue] = await timesheetUnconfirmedRule.detect(context({ ...emptyRows(), timesheets: [waitingForWorker] }), NOW);
    expect(issue?.recommendedAction ?? null).not.toBe("remind_employer_timesheet");
  });
});

describe("a worker who has not checked in 10 minutes after the start", () => {
  const late = shift({ startAt: new Date(NOW.getTime() - 10 * MIN) });

  it("ACTUAL: a text that could not be sent (no phone) is skipped, and the issue is NOT listed as needing a person", async () => {
    const { store, brain } = liveBrain({ ...emptyRows(), shifts: [late] }, { status: "skipped", detail: "No phone number or texts not set up." });
    const metrics = await brain.sweep();
    expect(metrics.actionsSkipped).toBe(1);
    const summary = await buildBrainSummary(store, NOW);
    expect(summary.openIssues).toBe(1);
    expect(summary.needsPeople).toEqual([]);
  });

  // BUG: the summary's "needs a person" list only holds issues with no action or a switched-off
  // action. A no-show the Brain could not text (no phone, texts off) is open but nobody is pointed
  // at it, and staff "Do it" refuses it too (the once-only slot was used by the skipped run).
  it.fails("a no-show the Brain could not text is handed to a person", async () => {
    const { store, brain } = liveBrain({ ...emptyRows(), shifts: [late] }, { status: "skipped", detail: "No phone number or texts not set up." });
    await brain.sweep();
    const summary = await buildBrainSummary(store, NOW);
    expect(summary.needsPeople.map((i) => i.subjectId)).toContain(late.assignmentId);
  });

  it("ACTUAL: once the reminder text is sent, the no-show issue is closed", async () => {
    const { store, brain } = liveBrain({ ...emptyRows(), shifts: [late] });
    await brain.sweep();
    expect(await store.openIssues("worker_not_checked_in")).toEqual([]);
  });

  // BUG: a sent text is not a worker on site. The issue closes the moment the text goes out, so the
  // staff Brain page shows nothing while the worker is still missing. Correct: it stays open until the
  // worker checks in (or staff close it).
  it.fails("the no-show stays open for staff after the reminder text, until the worker checks in", async () => {
    const { store, brain } = liveBrain({ ...emptyRows(), shifts: [late] });
    await brain.sweep();
    expect((await store.openIssues("worker_not_checked_in")).map((i) => i.subjectId)).toEqual([late.assignmentId]);
  });
});

describe("money never moves through the Brain", () => {
  it("every Joblop action declares movesMoney: false, and the engine refuses one that does not", () => {
    expect(JOBLOP_BRAIN_ACTIONS.map((a) => a.movesMoney)).toEqual(JOBLOP_BRAIN_ACTIONS.map(() => false));
    const charge = { ...JOBLOP_BRAIN_ACTIONS[0]!, key: "charge_employer", movesMoney: true } as unknown as (typeof JOBLOP_BRAIN_ACTIONS)[number];
    expect(() => createBrain({ store: createMemoryBrainStore(), rules: [], actions: [charge], context: context(emptyRows()) })).toThrow(BrainSetupError);
  });
});
