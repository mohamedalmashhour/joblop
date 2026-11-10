import { randomUUID } from "node:crypto";
import type { PrismaClient } from "@rwos/database";
import { describe, expect, it } from "vitest";
import { createPrismaBrainStore } from "./prismaBrainStore";

// A tiny double of the four brain tables with the same unique keys as the migration
// (brain_settings.key, brain_issues.fingerprint, brain_actions (issue_id, action_key, kind),
// brain_markers.marker), so the store's once-only behaviour is checked without a database.

type Row = Record<string, unknown>;
const dup = () => Object.assign(new Error("unique"), { code: "P2002" });
const matches = (row: Row, where: Row) =>
  Object.entries(where).every(([k, v]) => {
    if (v && typeof v === "object" && !(v instanceof Date)) {
      const op = v as { gte?: Date; in?: unknown[] };
      if (op.gte) return (row[k] as Date).getTime() >= op.gte.getTime();
      if (op.in) return op.in.includes(row[k]);
    }
    return row[k] === v;
  });

function doubles() {
  const settings: Row[] = [];
  const issues: Row[] = [];
  const actions: Row[] = [];
  const markers: Row[] = [];
  const prisma = {
    brainSetting: {
      findMany: async () => settings,
      upsert: async ({ where, create, update }: { where: { key: string }; create: Row; update: Row }) => {
        const found = settings.find((s) => s.key === where.key);
        if (found) Object.assign(found, update);
        else settings.push({ ...create });
      }
    },
    brainIssue: {
      findUnique: async ({ where }: { where: Row }) => issues.find((i) => matches(i, where)) ?? null,
      findUniqueOrThrow: async ({ where }: { where: Row }) => issues.find((i) => matches(i, where))!,
      create: async ({ data }: { data: Row }) => {
        if (issues.some((i) => i.fingerprint === data.fingerprint)) throw dup();
        const row = { id: randomUUID(), resolution: null, resolvedAt: null, ...data };
        issues.push(row);
        return row;
      },
      update: async ({ where, data }: { where: { id: string }; data: Row }) => Object.assign(issues.find((i) => i.id === where.id)!, data),
      updateMany: async ({ where, data }: { where: Row; data: Row }) => {
        const hits = issues.filter((i) => matches(i, where));
        hits.forEach((h) => Object.assign(h, data));
        return { count: hits.length };
      },
      findMany: async ({ where }: { where: Row }) => issues.filter((i) => matches(i, where))
    },
    brainAction: {
      create: async ({ data }: { data: Row }) => {
        if (actions.some((a) => a.issueId === data.issueId && a.actionKey === data.actionKey && a.kind === data.kind)) throw dup();
        const row = { id: randomUUID(), detail: null, undoKind: null, undoData: null, finishedAt: null, undoneAt: null, undoneByUserId: null, actorUserId: null, ...data };
        actions.push(row);
        return row;
      },
      update: async ({ where, data }: { where: { id: string }; data: Row }) => Object.assign(actions.find((a) => a.id === where.id)!, data),
      count: async ({ where }: { where: Row }) => actions.filter((a) => matches(a, where)).length,
      findUnique: async ({ where }: { where: { id: string } }) => actions.find((a) => a.id === where.id) ?? null,
      updateMany: async ({ where, data }: { where: Row; data: Row }) => {
        const hits = actions.filter((a) => matches(a, where));
        hits.forEach((h) => Object.assign(h, data));
        return { count: hits.length };
      }
    },
    brainMarker: {
      create: async ({ data }: { data: Row }) => {
        if (markers.some((m) => m.marker === data.marker)) throw dup();
        markers.push(data);
      }
    }
  };
  return { store: createPrismaBrainStore(prisma as unknown as PrismaClient), settings, issues, actions };
}

const NOW = new Date("2026-11-10T15:00:00Z");
const detected = {
  ruleKey: "r",
  fingerprint: "r:1",
  subjectType: "thing",
  subjectId: "1",
  severity: "warning" as const,
  summary: "Thing 1",
  inputs: { a: 1 },
  recommendedAction: "fix"
};

describe("prisma brain store", () => {
  it("settings: no rows = OFF and every switch off; saved values read back", async () => {
    const { store } = doubles();
    expect(await store.loadSettings()).toEqual({ mode: "off", switches: {} });
    await store.saveMode("watch", "u", NOW);
    await store.saveSwitch("fix", true, "u", NOW);
    await store.saveSwitch("other", false, "u", NOW);
    expect(await store.loadSettings()).toEqual({ mode: "watch", switches: { fix: true, other: false } });
  });

  it("an issue is stored once and a resolved issue is never reopened", async () => {
    const { store, issues } = doubles();
    const first = await store.upsertIssue(detected, NOW);
    await store.upsertIssue({ ...detected, summary: "Updated" }, NOW);
    expect(issues).toHaveLength(1);
    expect(issues[0]?.summary).toBe("Updated");
    await store.resolveIssue(first.id, "done", NOW);
    const again = await store.upsertIssue({ ...detected, summary: "Back?" }, NOW);
    expect(again.status).toBe("resolved");
    expect(issues[0]?.summary).toBe("Updated");
  });

  it("the same (issue, action, kind) can be claimed only once; the audit row keeps why and how to undo", async () => {
    const { store } = doubles();
    const issue = await store.upsertIssue(detected, NOW);
    const input = { issue, actionKey: "fix", kind: "live" as const, actor: { type: "brain" as const }, undoHint: "Undo it.", now: NOW };
    const claimed = await store.claimAction(input);
    expect(claimed).toMatchObject({ status: "running", reason: "Thing 1", inputs: { a: 1 }, undoHint: "Undo it.", ruleKey: "r" });
    expect(await store.claimAction(input)).toBeNull();
    expect(await store.claimAction({ ...input, kind: "watch" })).not.toBeNull();
    const done = await store.finishAction(claimed!.id, { status: "done", detail: "fixed", undo: { kind: "unfix", data: { id: 1 } }, now: NOW });
    expect(done.undo).toEqual({ kind: "unfix", data: { id: 1 } });
    expect(await store.countActionsSince("fix", "live", new Date(NOW.getTime() - 1))).toBe(1);
    expect(await store.markUndone(claimed!.id, "staff", "ok", NOW)).toBe(true);
    expect(await store.markUndone(claimed!.id, "staff", "ok", NOW)).toBe(false);
  });

  it("a marker is claimed once", async () => {
    const { store } = doubles();
    expect(await store.claimMarker("daily_summary:2026-11-10", NOW)).toBe(true);
    expect(await store.claimMarker("daily_summary:2026-11-10", NOW)).toBe(false);
  });
});
