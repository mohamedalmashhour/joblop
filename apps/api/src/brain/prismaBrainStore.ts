import type { ActionActor, ActionKind, ActionStatus, BrainStore, IssueSeverity, StoredAction, StoredIssue, UndoTicket } from "@rwos/brain";
import { DEFAULT_BRAIN_MODE, isBrainMode } from "@rwos/brain";
import type { Prisma, PrismaClient } from "@rwos/database";

// BrainStore on Postgres (brain_settings, brain_issues, brain_actions, brain_markers). The unique
// fingerprint and the unique (issue, action, kind) are what make the brain act once per issue even
// when two sweeps run at the same time: the second insert hits the key and is treated as "taken".

type BrainPrisma = Pick<PrismaClient, "brainSetting" | "brainIssue" | "brainAction" | "brainMarker">;

const SWITCH_PREFIX = "switch:";

const isUniqueViolation = (error: unknown) =>
  typeof error === "object" && error !== null && (error as { code?: unknown }).code === "P2002";

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

type IssueRow = Prisma.BrainIssueGetPayload<object>;
type ActionRow = Prisma.BrainActionGetPayload<object>;

function toIssue(row: IssueRow): StoredIssue {
  return {
    id: row.id,
    ruleKey: row.ruleKey,
    fingerprint: row.fingerprint,
    subjectType: row.subjectType,
    subjectId: row.subjectId,
    severity: (row.severity === "urgent" || row.severity === "info" ? row.severity : "warning") as IssueSeverity,
    summary: row.summary,
    inputs: asRecord(row.inputs),
    recommendedAction: row.recommendedAction,
    status: row.status === "resolved" ? "resolved" : "open",
    detectedAt: row.detectedAt,
    lastSeenAt: row.lastSeenAt,
    resolvedAt: row.resolvedAt,
    resolution: row.resolution
  };
}

function toAction(row: ActionRow): StoredAction {
  const actor: ActionActor =
    (row.actorType === "staff" || row.actorType === "user") && row.actorUserId
      ? { type: row.actorType, userId: row.actorUserId }
      : { type: "brain" };
  const undo: UndoTicket | null = row.undoKind ? { kind: row.undoKind, data: asRecord(row.undoData) } : null;
  return {
    id: row.id,
    issueId: row.issueId,
    actionKey: row.actionKey,
    kind: (row.kind === "watch" ? "watch" : "live") as ActionKind,
    actor,
    ruleKey: row.ruleKey,
    reason: row.reason,
    inputs: asRecord(row.inputs),
    status: row.status as ActionStatus,
    detail: row.detail,
    undo,
    undoHint: row.undoHint,
    createdAt: row.createdAt,
    finishedAt: row.finishedAt,
    undoneAt: row.undoneAt,
    undoneByUserId: row.undoneByUserId
  };
}

const json = (value: unknown) => JSON.parse(JSON.stringify(value ?? {})) as Prisma.InputJsonValue;

export function createPrismaBrainStore(prisma: BrainPrisma): BrainStore {
  return {
    async loadSettings() {
      const rows = await prisma.brainSetting.findMany({ select: { key: true, value: true } });
      let mode = DEFAULT_BRAIN_MODE;
      const switches: Record<string, boolean> = {};
      for (const row of rows) {
        if (row.key === "mode" && isBrainMode(row.value)) mode = row.value;
        else if (row.key.startsWith(SWITCH_PREFIX)) switches[row.key.slice(SWITCH_PREFIX.length)] = row.value === "true";
      }
      return { mode, switches };
    },
    async saveMode(mode, actorUserId) {
      await prisma.brainSetting.upsert({
        where: { key: "mode" },
        create: { key: "mode", value: mode, updatedByUserId: actorUserId },
        update: { value: mode, updatedByUserId: actorUserId }
      });
    },
    async saveSwitch(key, enabled, actorUserId) {
      const id = `${SWITCH_PREFIX}${key}`;
      await prisma.brainSetting.upsert({
        where: { key: id },
        create: { key: id, value: enabled ? "true" : "false", updatedByUserId: actorUserId },
        update: { value: enabled ? "true" : "false", updatedByUserId: actorUserId }
      });
    },

    async upsertIssue(detected, now) {
      const existing = await prisma.brainIssue.findUnique({ where: { fingerprint: detected.fingerprint } });
      if (existing) {
        const row = await prisma.brainIssue.update({
          where: { id: existing.id },
          data:
            existing.status === "open"
              ? { summary: detected.summary, inputs: json(detected.inputs), severity: detected.severity, recommendedAction: detected.recommendedAction, lastSeenAt: now }
              : { lastSeenAt: now }
        });
        return toIssue(row);
      }
      try {
        const row = await prisma.brainIssue.create({
          data: {
            fingerprint: detected.fingerprint,
            ruleKey: detected.ruleKey,
            subjectType: detected.subjectType,
            subjectId: detected.subjectId,
            severity: detected.severity,
            summary: detected.summary,
            inputs: json(detected.inputs),
            recommendedAction: detected.recommendedAction,
            status: "open",
            detectedAt: now,
            lastSeenAt: now
          }
        });
        return toIssue(row);
      } catch (error) {
        if (!isUniqueViolation(error)) throw error;
        // A concurrent sweep stored it first.
        return toIssue(await prisma.brainIssue.findUniqueOrThrow({ where: { fingerprint: detected.fingerprint } }));
      }
    },
    async resolveIssue(issueId, resolution, now) {
      await prisma.brainIssue.updateMany({ where: { id: issueId, status: "open" }, data: { status: "resolved", resolution: resolution.slice(0, 1000), resolvedAt: now } });
    },
    async getIssue(issueId) {
      const row = await prisma.brainIssue.findUnique({ where: { id: issueId } });
      return row ? toIssue(row) : null;
    },
    async openIssues(ruleKey, limit = 500) {
      const rows = await prisma.brainIssue.findMany({
        where: { status: "open", ...(ruleKey ? { ruleKey } : {}) },
        orderBy: [{ detectedAt: "desc" }],
        take: limit
      });
      return rows.map(toIssue);
    },
    async issuesDetectedSince(since) {
      const rows = await prisma.brainIssue.findMany({ where: { detectedAt: { gte: since } }, take: 5000 });
      return rows.map(toIssue);
    },

    async claimAction(input) {
      try {
        const row = await prisma.brainAction.create({
          data: {
            issueId: input.issue.id,
            actionKey: input.actionKey,
            kind: input.kind,
            actorType: input.actor.type,
            actorUserId: input.actor.type === "brain" ? null : input.actor.userId,
            ruleKey: input.issue.ruleKey,
            reason: input.issue.summary.slice(0, 1000),
            inputs: json(input.issue.inputs),
            status: "running",
            undoHint: input.undoHint,
            createdAt: input.now
          }
        });
        return toAction(row);
      } catch (error) {
        if (isUniqueViolation(error)) return null;
        throw error;
      }
    },
    async reopenAction(input) {
      const existing = await prisma.brainAction.findUnique({
        where: { issueId_actionKey_kind: { issueId: input.issue.id, actionKey: input.actionKey, kind: input.kind } }
      });
      if (!existing || (existing.status !== "skipped" && existing.status !== "failed")) return null;
      // Guarded on the status just read, so two people retrying at once run it once.
      const updated = await prisma.brainAction.updateMany({
        where: { id: existing.id, status: existing.status },
        data: {
          status: "running",
          actorType: input.actor.type,
          actorUserId: input.actor.type === "brain" ? null : input.actor.userId,
          undoKind: null,
          finishedAt: null
        }
      });
      if (updated.count !== 1) return null;
      return toAction(await prisma.brainAction.findUniqueOrThrow({ where: { id: existing.id } }));
    },
    async finishAction(actionId, input) {
      const row = await prisma.brainAction.update({
        where: { id: actionId },
        data: {
          status: input.status,
          detail: input.detail.slice(0, 1000),
          undoKind: input.undo?.kind ?? null,
          ...(input.undo ? { undoData: json(input.undo.data) } : {}),
          finishedAt: input.now
        }
      });
      return toAction(row);
    },
    async countActionsSince(actionKey, kind, since) {
      return prisma.brainAction.count({ where: { actionKey, kind, createdAt: { gte: since } } });
    },
    async getAction(actionId) {
      const row = await prisma.brainAction.findUnique({ where: { id: actionId } });
      return row ? toAction(row) : null;
    },
    async listActions(limit) {
      const rows = await prisma.brainAction.findMany({ orderBy: [{ createdAt: "desc" }], take: limit });
      return rows.map(toAction);
    },
    async actionsSince(since) {
      const rows = await prisma.brainAction.findMany({ where: { createdAt: { gte: since } }, take: 5000 });
      return rows.map(toAction);
    },
    async markUndone(actionId, actorUserId, detail, now) {
      const existing = await prisma.brainAction.findUnique({ where: { id: actionId }, select: { detail: true } });
      const updated = await prisma.brainAction.updateMany({
        where: { id: actionId, status: "done" },
        data: { status: "undone", undoneAt: now, undoneByUserId: actorUserId, detail: `${existing?.detail ?? ""} | Undone: ${detail}`.slice(0, 1000) }
      });
      return updated.count === 1;
    },

    async claimMarker(marker, now) {
      try {
        await prisma.brainMarker.create({ data: { marker, createdAt: now } });
        return true;
      } catch (error) {
        if (isUniqueViolation(error)) return false;
        throw error;
      }
    }
  };
}
