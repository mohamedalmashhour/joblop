import { randomUUID } from "node:crypto";
import type { BrainMode, BrainSettings, BrainStore, StoredAction, StoredIssue } from "./types";
import { DEFAULT_BRAIN_MODE } from "./types";

// In-memory BrainStore: the reference behaviour every database store must match, and the store the
// engine tests use. Not for production (nothing survives a restart).

export type MemoryBrainStore = BrainStore & {
  readonly issues: StoredIssue[];
  readonly actions: StoredAction[];
};

export function createMemoryBrainStore(initial?: Partial<{ mode: BrainMode; switches: Record<string, boolean> }>): MemoryBrainStore {
  let mode: BrainMode = initial?.mode ?? DEFAULT_BRAIN_MODE;
  const switches: Record<string, boolean> = { ...(initial?.switches ?? {}) };
  const issues: StoredIssue[] = [];
  const actions: StoredAction[] = [];
  const markers = new Set<string>();

  const replaceIssue = (next: StoredIssue) => {
    const index = issues.findIndex((i) => i.id === next.id);
    issues[index] = next;
  };
  const replaceAction = (next: StoredAction) => {
    const index = actions.findIndex((a) => a.id === next.id);
    actions[index] = next;
  };
  const newestFirst = <T extends { createdAt?: Date; detectedAt?: Date }>(a: T, b: T) =>
    ((b.createdAt ?? b.detectedAt)?.getTime() ?? 0) - ((a.createdAt ?? a.detectedAt)?.getTime() ?? 0);

  return {
    issues,
    actions,

    async loadSettings(): Promise<BrainSettings> {
      return { mode, switches: { ...switches } };
    },
    async saveMode(next) {
      mode = next;
    },
    async saveSwitch(key, enabled) {
      switches[key] = enabled;
    },

    async upsertIssue(detected, now) {
      const existing = issues.find((i) => i.fingerprint === detected.fingerprint);
      if (existing) {
        const next: StoredIssue =
          existing.status === "open"
            ? { ...existing, summary: detected.summary, inputs: detected.inputs, severity: detected.severity, recommendedAction: detected.recommendedAction, lastSeenAt: now }
            : { ...existing, lastSeenAt: now };
        replaceIssue(next);
        return next;
      }
      const created: StoredIssue = { ...detected, id: randomUUID(), status: "open", detectedAt: now, lastSeenAt: now, resolvedAt: null, resolution: null };
      issues.push(created);
      return created;
    },
    async resolveIssue(issueId, resolution, now) {
      const existing = issues.find((i) => i.id === issueId);
      if (existing && existing.status === "open") replaceIssue({ ...existing, status: "resolved", resolvedAt: now, resolution });
    },
    async getIssue(issueId) {
      return issues.find((i) => i.id === issueId) ?? null;
    },
    async openIssues(ruleKey, limit = 500) {
      return issues
        .filter((i) => i.status === "open" && (ruleKey === undefined || i.ruleKey === ruleKey))
        .sort(newestFirst)
        .slice(0, limit);
    },
    async issuesDetectedSince(since) {
      return issues.filter((i) => i.detectedAt.getTime() >= since.getTime());
    },

    async claimAction(input) {
      const taken = actions.some((a) => a.issueId === input.issue.id && a.actionKey === input.actionKey && a.kind === input.kind);
      if (taken) return null;
      const created: StoredAction = {
        id: randomUUID(),
        issueId: input.issue.id,
        actionKey: input.actionKey,
        kind: input.kind,
        actor: input.actor,
        ruleKey: input.issue.ruleKey,
        reason: input.issue.summary,
        inputs: input.issue.inputs,
        status: "running",
        detail: null,
        undo: null,
        undoHint: input.undoHint,
        createdAt: input.now,
        finishedAt: null,
        undoneAt: null,
        undoneByUserId: null
      };
      actions.push(created);
      return created;
    },
    async reopenAction(input) {
      const existing = actions.find((a) => a.issueId === input.issue.id && a.actionKey === input.actionKey && a.kind === input.kind);
      if (!existing || (existing.status !== "skipped" && existing.status !== "failed")) return null;
      // The earlier result stays in `detail` while running; the engine keeps it in the final detail.
      const next: StoredAction = { ...existing, status: "running", actor: input.actor, undo: null, finishedAt: null };
      replaceAction(next);
      return next;
    },
    async finishAction(actionId, input) {
      const existing = actions.find((a) => a.id === actionId);
      if (!existing) throw new Error("action not found");
      const next: StoredAction = { ...existing, status: input.status, detail: input.detail, undo: input.undo, finishedAt: input.now };
      replaceAction(next);
      return next;
    },
    async countActionsSince(actionKey, kind, since) {
      return actions.filter((a) => a.actionKey === actionKey && a.kind === kind && a.createdAt.getTime() >= since.getTime()).length;
    },
    async getAction(actionId) {
      return actions.find((a) => a.id === actionId) ?? null;
    },
    async listActions(limit) {
      return [...actions].sort(newestFirst).slice(0, limit);
    },
    async actionsSince(since) {
      return actions.filter((a) => a.createdAt.getTime() >= since.getTime());
    },
    async markUndone(actionId, actorUserId, detail, now) {
      const existing = actions.find((a) => a.id === actionId);
      if (!existing || existing.status !== "done") return false;
      replaceAction({ ...existing, status: "undone", undoneAt: now, undoneByUserId: actorUserId, detail: `${existing.detail ?? ""} | Undone: ${detail}` });
      return true;
    },

    async claimMarker(marker) {
      if (markers.has(marker)) return false;
      markers.add(marker);
      return true;
    }
  };
}
