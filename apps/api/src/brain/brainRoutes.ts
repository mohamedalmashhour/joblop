import type { Brain, BrainStore, StoredAction, StoredIssue } from "@rwos/brain";
import { buildBrainSummary, renderBrainSummaryText } from "@rwos/brain";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { EmailSender } from "../mailer/emailSender";
import { sendsEmail } from "../notifications/noticeChannels";
import { DAILY_SUMMARY_SWITCH } from "./joblopActions";
import { summaryCopy } from "./brainText";

// Brain routes.
//   POST /internal/brain/sweep            cron, x-sweep-token = BRAIN_SWEEP_TOKEN (16+ chars). Same
//                                         fail-closed shape as /internal/shift-reminders/sweep: 404 when
//                                         no token is configured, 401 on mismatch, 503 without a DB.
//   GET  /platform/brain                  staff: mode, switches, open issues, action log, summary
//   POST /platform/brain/mode             staff: { mode: "off" | "watch" | "live" }
//   POST /platform/brain/switches         staff: { key, enabled }
//   POST /platform/brain/issues/:id/do    staff: run the recommended action now ("Do it")
//   POST /platform/brain/issues/:id/dismiss  staff: close an issue by hand
//   POST /platform/brain/actions/:id/undo staff: undo an action that offers it

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type BrainRouteDeps = Readonly<{
  /** Null when there is no database: every route answers 503 (the sweep 404/401 checks come first). */
  brain: Brain | null;
  store: BrainStore | null;
  sweepToken: string;
  /** Platform administrators only. Sends the 401/403 itself and returns null. */
  requireStaff(request: FastifyRequest, reply: FastifyReply): Promise<string | null>;
  emailSender: EmailSender;
  staffEmail: string | null;
  /** The daily summary goes out on the first sweep at or after this UTC hour. */
  summaryHourUtc: number;
  actorConfigured: boolean;
  /** Housekeeping after each sweep (e.g. clearing old failed-message text). */
  afterSweep?: () => Promise<unknown>;
  now?: () => Date;
  log?: (event: string, fields?: Record<string, unknown>) => void;
}>;

export type DailySummaryResult = "sent" | "off" | "not_due" | "already_sent" | "no_recipient" | "failed";

/** Send the daily staff summary once per UTC day, when its switch is on and the brain is not OFF. */
export async function maybeSendDailySummary(input: {
  store: BrainStore;
  emailSender: EmailSender;
  staffEmail: string | null;
  summaryHourUtc: number;
  now: Date;
}): Promise<DailySummaryResult> {
  const settings = await input.store.loadSettings();
  if (settings.mode === "off" || settings.switches[DAILY_SUMMARY_SWITCH] !== true || !sendsEmail("staff_summary")) return "off";
  if (!input.staffEmail) return "no_recipient";
  if (input.now.getUTCHours() < input.summaryHourUtc) return "not_due";
  const day = input.now.toISOString().slice(0, 10);
  if (!(await input.store.claimMarker(`daily_summary:${day}`, input.now))) return "already_sent";
  const summary = await buildBrainSummary(input.store, input.now);
  // Phase 2 hook: an outside-AI narrative could be passed as the third argument, ONLY through the
  // privacy filter (apps/api/src/aiPrivacyFilter.ts). Phase 1 stays deterministic: no narrator.
  const [en, fr] = await Promise.all([renderBrainSummaryText(summary, summaryCopy("en")), renderBrainSummaryText(summary, summaryCopy("fr"))]);
  const result = await input.emailSender
    .send({ to: input.staffEmail, subject: `${summaryCopy("en").subject} / ${summaryCopy("fr").subject}`, text: `${en}\n\n——————\n\n${fr}` })
    .catch(() => ({ status: "error" as const }));
  return result.status === "sent" ? "sent" : result.status === "error" ? "failed" : "off";
}

const serializeIssue = (issue: StoredIssue) => ({
  id: issue.id,
  ruleKey: issue.ruleKey,
  subjectType: issue.subjectType,
  subjectId: issue.subjectId,
  severity: issue.severity,
  summary: issue.summary,
  inputs: issue.inputs,
  recommendedAction: issue.recommendedAction,
  detectedAt: issue.detectedAt.toISOString(),
  lastSeenAt: issue.lastSeenAt.toISOString()
});

const serializeAction = (action: StoredAction, canUndo: boolean) => ({
  id: action.id,
  issueId: action.issueId,
  actionKey: action.actionKey,
  kind: action.kind,
  actor: action.actor.type,
  ruleKey: action.ruleKey,
  reason: action.reason,
  inputs: action.inputs,
  status: action.status,
  detail: action.detail,
  undoHint: action.undoHint,
  canUndo: canUndo && action.status === "done" && action.undo !== null,
  createdAt: action.createdAt.toISOString(),
  finishedAt: action.finishedAt?.toISOString() ?? null,
  undoneAt: action.undoneAt?.toISOString() ?? null
});

export function registerBrainRoutes(app: FastifyInstance, deps: BrainRouteDeps) {
  const now = deps.now ?? (() => new Date());
  const log = deps.log ?? (() => undefined);
  const unavailable = (reply: FastifyReply) => reply.code(503).send({ error: "RWOS_BRAIN_UNAVAILABLE", message: "Database unavailable." });
  const param = (params: unknown, key: string) => {
    const v = params && typeof params === "object" ? (params as Record<string, unknown>)[key] : undefined;
    return typeof v === "string" ? v : "";
  };
  const body = (request: FastifyRequest) => (request.body && typeof request.body === "object" ? (request.body as Record<string, unknown>) : {});

  app.post("/internal/brain/sweep", async (request, reply) => {
    if (deps.sweepToken.length < 16) return reply.code(404).send({ error: "RWOS_NOT_FOUND", message: "Not found." });
    const provided = request.headers["x-sweep-token"];
    if (typeof provided !== "string" || provided !== deps.sweepToken) {
      return reply.code(401).send({ error: "RWOS_SWEEP_DENIED", message: "Sweep token required." });
    }
    if (!deps.brain || !deps.store) return unavailable(reply);
    const metrics = await deps.brain.sweep();
    let summary: DailySummaryResult = "off";
    try {
      summary = await maybeSendDailySummary({ store: deps.store, emailSender: deps.emailSender, staffEmail: deps.staffEmail, summaryHourUtc: deps.summaryHourUtc, now: now() });
    } catch (error) {
      log("api.brain.summary_failed", { error: error instanceof Error ? error.message : "unknown" });
    }
    await deps.afterSweep?.().catch(() => undefined);
    log("api.brain.sweep", { ...metrics, summary });
    return reply.code(200).send({ status: "completed", ...metrics, dailySummary: summary });
  });

  app.get("/platform/brain", async (request, reply) => {
    const actor = await deps.requireStaff(request, reply);
    if (!actor) return;
    if (!deps.brain || !deps.store) return unavailable(reply);
    const brain = deps.brain;
    const [settings, issues, actions, summary] = await Promise.all([
      deps.store.loadSettings(),
      deps.store.openIssues(undefined, 200),
      deps.store.listActions(100),
      buildBrainSummary(deps.store, now())
    ]);
    return reply
      .code(200)
      .header("cache-control", "no-store")
      .send({
        mode: settings.mode,
        actorConfigured: deps.actorConfigured,
        switches: brain.switchKeys.map((key) => ({ key, enabled: settings.switches[key] === true })),
        issues: issues.map(serializeIssue),
        actions: actions.map((a) => serializeAction(a, brain.hasUndo(a.actionKey))),
        summary: {
          since: summary.since.toISOString(),
          found: summary.found,
          done: summary.done,
          simulated: summary.simulated,
          failed: summary.failed,
          undone: summary.undone,
          openIssues: summary.openIssues,
          needsPeople: summary.needsPeople.length
        }
      });
  });

  app.post("/platform/brain/mode", async (request, reply) => {
    const actor = await deps.requireStaff(request, reply);
    if (!actor) return;
    if (!deps.brain) return unavailable(reply);
    if (!(await deps.brain.setMode(body(request).mode, actor))) {
      return reply.code(400).send({ error: "RWOS_BRAIN_INVALID_MODE", message: "mode must be off, watch or live." });
    }
    return reply.code(200).send({ ok: true });
  });

  app.post("/platform/brain/switches", async (request, reply) => {
    const actor = await deps.requireStaff(request, reply);
    if (!actor) return;
    if (!deps.brain) return unavailable(reply);
    const { key, enabled } = body(request);
    if (!(await deps.brain.setSwitch(key, enabled, actor))) {
      return reply.code(400).send({ error: "RWOS_BRAIN_INVALID_SWITCH", message: "Unknown switch, or enabled is not true/false." });
    }
    return reply.code(200).send({ ok: true });
  });

  app.post("/platform/brain/issues/:issueId/do", async (request, reply) => {
    const actor = await deps.requireStaff(request, reply);
    if (!actor) return;
    if (!deps.brain) return unavailable(reply);
    const issueId = param(request.params, "issueId");
    if (!UUID.test(issueId)) return reply.code(404).send({ error: "RWOS_BRAIN_ISSUE_NOT_FOUND", message: "Issue not found." });
    const result = await deps.brain.doNow(issueId, actor);
    if (result.status === "not_found") return reply.code(404).send({ error: "RWOS_BRAIN_ISSUE_NOT_FOUND", message: "Issue not found." });
    if (!("action" in result)) {
      return reply.code(409).send({ error: `RWOS_BRAIN_${result.status.toUpperCase()}`, message: "This issue cannot be acted on now." });
    }
    return reply.code(200).send({ status: result.status, detail: result.action.detail });
  });

  app.post("/platform/brain/issues/:issueId/dismiss", async (request, reply) => {
    const actor = await deps.requireStaff(request, reply);
    if (!actor) return;
    if (!deps.brain) return unavailable(reply);
    const issueId = param(request.params, "issueId");
    if (!UUID.test(issueId) || !(await deps.brain.dismiss(issueId, actor))) {
      return reply.code(404).send({ error: "RWOS_BRAIN_ISSUE_NOT_FOUND", message: "Open issue not found." });
    }
    return reply.code(200).send({ ok: true });
  });

  app.post("/platform/brain/actions/:actionId/undo", async (request, reply) => {
    const actor = await deps.requireStaff(request, reply);
    if (!actor) return;
    if (!deps.brain) return unavailable(reply);
    const actionId = param(request.params, "actionId");
    if (!UUID.test(actionId)) return reply.code(404).send({ error: "RWOS_BRAIN_ACTION_NOT_FOUND", message: "Action not found." });
    const result = await deps.brain.undo(actionId, actor);
    if (result.status === "not_found") return reply.code(404).send({ error: "RWOS_BRAIN_ACTION_NOT_FOUND", message: "Action not found." });
    if (result.status === "not_undoable") return reply.code(409).send({ error: "RWOS_BRAIN_NOT_UNDOABLE", message: "This action cannot be undone." });
    if (result.status === "failed") return reply.code(409).send({ error: "RWOS_BRAIN_UNDO_FAILED", message: result.detail ?? "Undo failed." });
    return reply.code(200).send({ ok: true, detail: result.detail });
  });
}
