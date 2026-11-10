import type {
  ActionKind,
  BrainAction,
  BrainLog,
  BrainMode,
  BrainRule,
  BrainSettings,
  BrainStore,
  StoredAction,
  StoredIssue
} from "./types";
import { isBrainMode } from "./types";

// The sweep orchestrator. One sweep:
//   1. reads the settings (master mode + switches);
//   2. runs every rule; each found issue is stored once (by fingerprint), and an open issue a rule no
//      longer finds is closed as cleared (a rule that throws closes nothing);
//   3. for each open issue found in this sweep that has a recommended action:
//        mode off   → nothing (kill switch);
//        mode watch → record "would have done X" (no action runs);
//        mode live  → run the action only when its own switch is on;
//      both watch and live respect the action's rolling 24 h cap, and both claim the
//      (issue, action, kind) slot first, so the same issue is never acted on twice.
// Staff can also "Do it" on an issue (a person decides: switches and caps do not apply, but the same
// once-only slot does), and undo an action that offers it.

const DAY_MS = 86_400_000;
const MAX_CAP = 10_000;

export class BrainSetupError extends Error {}

export type BrainSweepMetrics = {
  mode: BrainMode;
  rulesRun: number;
  rulesFailed: number;
  issuesFound: number;
  issuesCleared: number;
  actionsDone: number;
  actionsSkipped: number;
  actionsFailed: number;
  actionsSimulated: number;
  skippedSwitchOff: number;
  skippedCap: number;
  skippedAlreadyHandled: number;
};

export type DoNowResult =
  | Readonly<{ status: "done" | "skipped" | "failed"; action: StoredAction }>
  | Readonly<{ status: "not_found" | "not_open" | "no_action" | "already_handled" }>;

export type UndoResult =
  | Readonly<{ status: "undone"; detail: string }>
  | Readonly<{ status: "not_found" | "not_undoable" | "failed"; detail?: string }>;

export type Brain = ReturnType<typeof createBrain>;

export function createBrain<C>(options: {
  store: BrainStore;
  rules: readonly BrainRule<C>[];
  actions: readonly BrainAction<C>[];
  context: C;
  /** Switches that are not actions (for example a daily summary email). */
  extraSwitches?: readonly string[];
  now?: () => Date;
  log?: BrainLog;
}) {
  const { store, context } = options;
  const now = options.now ?? (() => new Date());
  const log: BrainLog = options.log ?? (() => undefined);

  const actions = new Map<string, BrainAction<C>>();
  for (const action of options.actions) {
    // Runtime guard as well as the type: an action that moves money is never registered.
    if ((action as { movesMoney: unknown }).movesMoney !== false) {
      throw new BrainSetupError(`Action ${action.key} must declare movesMoney: false.`);
    }
    if (!Number.isInteger(action.dailyCap) || action.dailyCap < 0 || action.dailyCap > MAX_CAP) {
      throw new BrainSetupError(`Action ${action.key} needs a whole daily cap between 0 and ${MAX_CAP}.`);
    }
    if (actions.has(action.key)) throw new BrainSetupError(`Action ${action.key} is registered twice.`);
    actions.set(action.key, action);
  }
  const ruleKeys = new Set<string>();
  for (const rule of options.rules) {
    if (ruleKeys.has(rule.key)) throw new BrainSetupError(`Rule ${rule.key} is registered twice.`);
    ruleKeys.add(rule.key);
  }
  const switchKeys = [...actions.keys(), ...(options.extraSwitches ?? [])];

  async function finishRun(issue: StoredIssue, action: BrainAction<C>, claimed: StoredAction): Promise<StoredAction> {
    let outcome;
    try {
      outcome = await action.run(issue, context);
    } catch (error) {
      outcome = { status: "failed" as const, detail: error instanceof Error ? `Error: ${error.message}`.slice(0, 500) : "Error." };
    }
    const at = now();
    const finished = await store.finishAction(claimed.id, {
      status: outcome.status,
      detail: outcome.detail,
      undo: outcome.status === "done" ? (outcome.undo ?? null) : null,
      now: at
    });
    if (outcome.status === "done" && outcome.resolvesIssue !== false) {
      await store.resolveIssue(issue.id, `Done: ${outcome.detail}`.slice(0, 500), at);
    }
    return finished;
  }

  return {
    switchKeys,
    actionKeys: [...actions.keys()],
    ruleKeys: [...ruleKeys],

    hasUndo(actionKey: string): boolean {
      return typeof actions.get(actionKey)?.undo === "function";
    },

    async settings(): Promise<BrainSettings> {
      return store.loadSettings();
    },

    async setMode(mode: unknown, actorUserId: string): Promise<boolean> {
      if (!isBrainMode(mode)) return false;
      await store.saveMode(mode, actorUserId, now());
      log("brain.mode_changed", { mode });
      return true;
    },

    async setSwitch(key: unknown, enabled: unknown, actorUserId: string): Promise<boolean> {
      if (typeof key !== "string" || !switchKeys.includes(key) || typeof enabled !== "boolean") return false;
      await store.saveSwitch(key, enabled, actorUserId, now());
      log("brain.switch_changed", { key, enabled });
      return true;
    },

    async sweep(): Promise<BrainSweepMetrics> {
      const settings = await store.loadSettings();
      const metrics: BrainSweepMetrics = {
        mode: settings.mode,
        rulesRun: 0,
        rulesFailed: 0,
        issuesFound: 0,
        issuesCleared: 0,
        actionsDone: 0,
        actionsSkipped: 0,
        actionsFailed: 0,
        actionsSimulated: 0,
        skippedSwitchOff: 0,
        skippedCap: 0,
        skippedAlreadyHandled: 0
      };
      const candidates: StoredIssue[] = [];

      for (const rule of options.rules) {
        const at = now();
        let found;
        try {
          found = await rule.detect(context, at);
        } catch (error) {
          metrics.rulesFailed += 1;
          log("brain.rule_failed", { rule: rule.key, error: error instanceof Error ? error.message : "unknown" });
          continue;
        }
        metrics.rulesRun += 1;
        const seen = new Set<string>();
        for (const detected of found) {
          if (detected.ruleKey !== rule.key || seen.has(detected.fingerprint)) continue;
          seen.add(detected.fingerprint);
          const stored = await store.upsertIssue(detected, at);
          metrics.issuesFound += 1;
          if (stored.status === "open") candidates.push(stored);
        }
        for (const open of await store.openIssues(rule.key)) {
          if (!seen.has(open.fingerprint)) {
            await store.resolveIssue(open.id, "Cleared: the problem is no longer there.", at);
            metrics.issuesCleared += 1;
          }
        }
      }

      if (settings.mode === "off") return metrics;
      const kind: ActionKind = settings.mode === "watch" ? "watch" : "live";

      for (const issue of candidates) {
        const action = issue.recommendedAction ? actions.get(issue.recommendedAction) : undefined;
        if (!action) continue;
        if (kind === "live" && settings.switches[action.key] !== true) {
          metrics.skippedSwitchOff += 1;
          continue;
        }
        const at = now();
        const used = await store.countActionsSince(action.key, kind, new Date(at.getTime() - DAY_MS));
        if (used >= action.dailyCap) {
          metrics.skippedCap += 1;
          continue;
        }
        const claimed = await store.claimAction({ issue, actionKey: action.key, kind, actor: { type: "brain" }, undoHint: action.undoHint, now: at });
        if (!claimed) {
          metrics.skippedAlreadyHandled += 1;
          continue;
        }
        if (kind === "watch") {
          await store.finishAction(claimed.id, { status: "simulated", detail: `Would have: ${action.describe(issue)}`, undo: null, now: at });
          metrics.actionsSimulated += 1;
          continue;
        }
        const finished = await finishRun(issue, action, claimed);
        if (finished.status === "done") metrics.actionsDone += 1;
        else if (finished.status === "failed") metrics.actionsFailed += 1;
        else metrics.actionsSkipped += 1;
      }
      log("brain.sweep", { ...metrics });
      return metrics;
    },

    /** Staff "Do it": runs the recommended action now. A person decides, so switches and caps do not apply. */
    async doNow(issueId: string, staffUserId: string): Promise<DoNowResult> {
      const issue = await store.getIssue(issueId);
      if (!issue) return { status: "not_found" };
      if (issue.status !== "open") return { status: "not_open" };
      const action = issue.recommendedAction ? actions.get(issue.recommendedAction) : undefined;
      if (!action) return { status: "no_action" };
      const claimed = await store.claimAction({
        issue,
        actionKey: action.key,
        kind: "live",
        actor: { type: "staff", userId: staffUserId },
        undoHint: action.undoHint,
        now: now()
      });
      if (!claimed) return { status: "already_handled" };
      const finished = await finishRun(issue, action, claimed);
      const status = finished.status === "done" ? "done" : finished.status === "failed" ? "failed" : "skipped";
      return { status, action: finished };
    },

    async dismiss(issueId: string, staffUserId: string): Promise<boolean> {
      const issue = await store.getIssue(issueId);
      if (!issue || issue.status !== "open") return false;
      await store.resolveIssue(issueId, `Closed by staff (${staffUserId}).`, now());
      return true;
    },

    async undo(actionId: string, staffUserId: string): Promise<UndoResult> {
      const record = await store.getAction(actionId);
      if (!record) return { status: "not_found" };
      const action = actions.get(record.actionKey);
      if (record.status !== "done" || !record.undo || !action?.undo) return { status: "not_undoable" };
      let result;
      try {
        result = await action.undo(record.undo, context, { userId: staffUserId });
      } catch (error) {
        return { status: "failed", detail: error instanceof Error ? error.message : "Error." };
      }
      if (!result.ok) return { status: "failed", detail: result.detail };
      const marked = await store.markUndone(actionId, staffUserId, result.detail, now());
      return marked ? { status: "undone", detail: result.detail } : { status: "not_undoable" };
    }
  };
}
