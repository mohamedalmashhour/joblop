import { describe, expect, it } from "vitest";
import { BrainSetupError, createBrain } from "./engine";
import { createMemoryBrainStore } from "./memoryStore";
import { buildBrainSummary, renderBrainSummaryText } from "./summary";
import type { BrainAction, BrainRule, DetectedIssue } from "./types";

type Ctx = { subjects: string[]; ran: string[]; undone: string[]; fail?: boolean };

const issueFor = (subject: string, action: string | null = "fix"): DetectedIssue => ({
  ruleKey: "broken",
  fingerprint: `broken:${subject}`,
  subjectType: "thing",
  subjectId: subject,
  severity: "warning",
  summary: `Thing ${subject} is broken`,
  inputs: { subject },
  recommendedAction: action
});

const rule: BrainRule<Ctx> = {
  key: "broken",
  async detect(ctx) {
    return ctx.subjects.map((s) => issueFor(s));
  }
};

const fix = (cap = 5): BrainAction<Ctx> => ({
  key: "fix",
  movesMoney: false,
  dailyCap: cap,
  undoHint: "Break it again.",
  describe: (issue) => `fix ${issue.subjectId}`,
  async run(issue, ctx) {
    if (ctx.fail) throw new Error("boom");
    ctx.ran.push(issue.subjectId);
    return { status: "done", detail: `fixed ${issue.subjectId}`, undo: { kind: "unfix", data: { subject: issue.subjectId } } };
  },
  async undo(ticket, ctx) {
    ctx.undone.push(String(ticket.data.subject));
    return { ok: true, detail: "unfixed" };
  }
});

function setup(options: { mode?: "off" | "watch" | "live"; on?: boolean; cap?: number; subjects?: string[] } = {}) {
  const store = createMemoryBrainStore({ mode: options.mode ?? "live", switches: { fix: options.on ?? true } });
  const ctx: Ctx = { subjects: options.subjects ?? ["a"], ran: [], undone: [] };
  let clock = new Date("2026-11-10T12:00:00Z");
  const brain = createBrain({ store, rules: [rule], actions: [fix(options.cap)], context: ctx, extraSwitches: ["daily_summary_email"], now: () => clock });
  return { store, ctx, brain, advance: (ms: number) => (clock = new Date(clock.getTime() + ms)) };
}

describe("brain engine", () => {
  it("defaults: a fresh store is OFF with every switch off", async () => {
    const store = createMemoryBrainStore();
    const settings = await store.loadSettings();
    expect(settings.mode).toBe("off");
    expect(settings.switches).toEqual({});
  });

  it("kill switch (mode off): issues are recorded but nothing runs or is simulated", async () => {
    const { brain, ctx, store } = setup({ mode: "off" });
    const m = await brain.sweep();
    expect(m.issuesFound).toBe(1);
    expect(ctx.ran).toEqual([]);
    expect(store.actions).toHaveLength(0);
    expect(store.issues[0]?.status).toBe("open");
  });

  it("switch off in live mode: no action", async () => {
    const { brain, ctx, store } = setup({ on: false });
    const m = await brain.sweep();
    expect(m.skippedSwitchOff).toBe(1);
    expect(ctx.ran).toEqual([]);
    expect(store.actions).toHaveLength(0);
  });

  it("switch on: exactly one action, the issue closes, and a second sweep does nothing more", async () => {
    const { brain, ctx, store } = setup();
    await brain.sweep();
    await brain.sweep();
    expect(ctx.ran).toEqual(["a"]);
    expect(store.actions).toHaveLength(1);
    const action = store.actions[0]!;
    expect(action).toMatchObject({ status: "done", kind: "live", actor: { type: "brain" }, ruleKey: "broken", reason: "Thing a is broken", inputs: { subject: "a" }, undoHint: "Break it again." });
    expect(store.issues[0]?.status).toBe("resolved");
  });

  it("idempotent: an issue still detected after a failed run is not retried by the brain", async () => {
    const { brain, ctx, store } = setup();
    ctx.fail = true;
    const first = await brain.sweep();
    expect(first.actionsFailed).toBe(1);
    ctx.fail = false;
    const second = await brain.sweep();
    expect(second.skippedAlreadyHandled).toBe(1);
    expect(ctx.ran).toEqual([]);
    expect(store.actions).toHaveLength(1);
  });

  it("daily cap: never more than the cap in 24 hours, then resumes", async () => {
    const { brain, ctx, advance } = setup({ cap: 2, subjects: ["a", "b", "c"] });
    const m = await brain.sweep();
    expect(m.actionsDone).toBe(2);
    expect(m.skippedCap).toBe(1);
    await brain.sweep();
    expect(ctx.ran).toHaveLength(2);
    advance(24 * 3_600_000 + 1);
    await brain.sweep();
    expect(ctx.ran).toHaveLength(3);
  });

  it("watch mode: records 'would have' for every action, runs nothing, ignores switches", async () => {
    const { brain, ctx, store } = setup({ mode: "watch", on: false });
    const m = await brain.sweep();
    expect(m.actionsSimulated).toBe(1);
    expect(ctx.ran).toEqual([]);
    expect(store.actions[0]).toMatchObject({ kind: "watch", status: "simulated", detail: "Would have: fix a" });
    expect(store.issues[0]?.status).toBe("open");
    await brain.sweep();
    expect(store.actions).toHaveLength(1);
  });

  it("going live after watching acts exactly once on the same issue", async () => {
    const { brain, ctx, store } = setup({ mode: "watch" });
    await brain.sweep();
    await store.saveMode("live", "staff", new Date());
    await brain.sweep();
    await brain.sweep();
    expect(ctx.ran).toEqual(["a"]);
  });

  it("an issue the rule stops finding is closed as cleared; a closed issue never reopens", async () => {
    const { brain, ctx, store } = setup({ on: false });
    await brain.sweep();
    ctx.subjects = [];
    const m = await brain.sweep();
    expect(m.issuesCleared).toBe(1);
    ctx.subjects = ["a"];
    await store.saveSwitch("fix", true, "staff", new Date());
    await brain.sweep();
    expect(ctx.ran).toEqual([]);
    expect(store.issues).toHaveLength(1);
  });

  it("a rule that throws closes nothing and does not stop the others", async () => {
    const { store, ctx } = setup({ on: false });
    const bad: BrainRule<Ctx> = { key: "bad", detect: async () => { throw new Error("db down"); } };
    const brain = createBrain({ store, rules: [rule, bad], actions: [fix()], context: ctx });
    await brain.sweep();
    const m = await brain.sweep();
    expect(m.rulesFailed).toBe(1);
    expect(m.rulesRun).toBe(1);
    expect(store.issues[0]?.status).toBe("open");
  });

  it("refuses an action that moves money or has a bad cap", () => {
    const store = createMemoryBrainStore();
    const money = { ...fix(), key: "charge", movesMoney: true } as unknown as BrainAction<Ctx>;
    expect(() => createBrain({ store, rules: [], actions: [money], context: {} as Ctx })).toThrow(BrainSetupError);
    expect(() => createBrain({ store, rules: [], actions: [fix(-1)], context: {} as Ctx })).toThrow(BrainSetupError);
  });

  it("staff Do it: runs once even with switches off, and blocks a second run", async () => {
    const { brain, ctx, store } = setup({ mode: "off", on: false });
    await brain.sweep();
    const issueId = store.issues[0]!.id;
    const first = await brain.doNow(issueId, "staff-1");
    expect(first.status).toBe("done");
    expect(ctx.ran).toEqual(["a"]);
    expect(store.actions[0]?.actor).toEqual({ type: "staff", userId: "staff-1" });
    expect((await brain.doNow(issueId, "staff-1")).status).toBe("not_open");
  });

  it("staff Do it after the brain already got it done is refused", async () => {
    const { brain, store } = setup();
    await brain.sweep();
    const issue = store.issues[0]!;
    // The done action resolved the issue; even if it were still open, the slot is taken.
    expect(["not_open", "already_handled"]).toContain((await brain.doNow(issue.id, "staff-1")).status);
  });

  it("staff Do it retries a run that did not get it done (failed or skipped), once, keeping the earlier result", async () => {
    const { brain, ctx, store } = setup();
    ctx.fail = true;
    await brain.sweep();
    expect(store.actions.map((a) => a.status)).toEqual(["failed"]);
    ctx.fail = false;
    const retried = await brain.doNow(store.issues[0]!.id, "staff-1");
    expect(retried.status).toBe("done");
    expect(store.actions).toHaveLength(1);
    expect(store.actions[0]).toMatchObject({ status: "done", actor: { type: "staff", userId: "staff-1" } });
    expect(store.actions[0]!.detail).toContain("Retried by staff. Earlier:");
    expect((await brain.doNow(store.issues[0]!.id, "staff-2")).status).not.toBe("done");
  });

  it("undo: reverses a done action once", async () => {
    const { brain, ctx, store } = setup();
    await brain.sweep();
    const id = store.actions[0]!.id;
    expect((await brain.undo(id, "staff-1")).status).toBe("undone");
    expect(ctx.undone).toEqual(["a"]);
    expect(store.actions[0]).toMatchObject({ status: "undone", undoneByUserId: "staff-1" });
    expect((await brain.undo(id, "staff-1")).status).toBe("not_undoable");
  });

  it("switches: only known keys, booleans only", async () => {
    const { brain, store } = setup({ on: false });
    expect(await brain.setSwitch("fix", true, "s")).toBe(true);
    expect(await brain.setSwitch("daily_summary_email", true, "s")).toBe(true);
    expect(await brain.setSwitch("charge_card", true, "s")).toBe(false);
    expect(await brain.setSwitch("fix", "yes", "s")).toBe(false);
    expect(await brain.setMode("turbo", "s")).toBe(false);
    expect((await store.loadSettings()).switches).toEqual({ fix: true, daily_summary_email: true });
  });

  it("summary: counts found, done, simulated and what needs people", async () => {
    const { brain, store } = setup({ subjects: ["a"] });
    await brain.sweep();
    store.issues.push({ ...issueFor("z", null), fingerprint: "broken:z", id: "z", status: "open", detectedAt: new Date("2026-11-10T12:00:00Z"), lastSeenAt: new Date("2026-11-10T12:00:00Z"), resolvedAt: null, resolution: null });
    const summary = await buildBrainSummary(store, new Date("2026-11-10T13:00:00Z"));
    expect(summary.found).toEqual({ broken: 2 });
    expect(summary.done).toEqual({ fix: 1 });
    expect(summary.needsPeople.map((i) => i.subjectId)).toEqual(["z"]);
    const text = await renderBrainSummaryText(summary, {
      subject: "s",
      intro: "Hello",
      modeLine: (m) => `Mode: ${m}`,
      foundHeading: "Found",
      doneHeading: "Done",
      simulatedHeading: "Would have",
      failedHeading: "Failed",
      needsHeading: "Needs you",
      none: "nothing",
      openLine: (n) => `${n} open`,
      ruleTitle: (k) => k.toUpperCase(),
      actionTitle: (k) => k.toUpperCase(),
      closing: "Bye"
    }, { narrate: async () => "A calm day." });
    expect(text).toContain("Mode: live");
    expect(text).toContain("- BROKEN: 2");
    expect(text).toContain("- FIX: 1");
    expect(text).toContain("A calm day.");
    expect(text).toContain("- Thing z is broken");
  });
});
