import type { BrainSettings, BrainStore, StoredIssue } from "@rwos/brain";
import type { PrivacyLogger } from "../aiPrivacyFilter";
import { guardMoneyRoutes, registerAssistantTools } from "./assistantGuards";
import { runAssistantLoop, type LoopFailure, type LoopTurn } from "./assistantLoop";
import { assistantSystemPrompt, cancelledText, resultText } from "./assistantText";
import {
  ASSISTANT_MASTER_SWITCH, ASSISTANT_ROLES, roleSwitch,
  type ActionCard, type ActionTool, type ApiCaller, type AssistantLocale, type AssistantRole, type AssistantTool, type ToolContext
} from "./assistantTypes";
import { EMPLOYER_TOOLS } from "./employerTools";
import { newProposalId, PROPOSAL_TTL_MS, type ProposalSigner } from "./proposalToken";
import { STAFF_TOOLS } from "./staffTools";
import { WORKER_TOOLS } from "./workerTools";

// The assistant service: switches, rate limits, the model turn, and the confirm / cancel path.
//
// Switches (stored with the phase-1 brain settings, shown on the admin Brain page, all OFF by default):
//   assistant                 master switch; off = the chat behaves exactly as before
//   assistant.<role>          worker / employer / staff
//   <tool.switchKey>          one per action (e.g. assistant.worker.claim_job)
// Audit (brain tables): each proposal is a brain issue (rule "assistant", resolved at once so it never
// shows as an open problem); the Confirm or Cancel is a brain action on that issue. The unique
// (issue, action, kind) key makes a proposal usable once: a replay finds the slot taken.

export const ASSISTANT_RULE_KEY = "assistant";

export const ASSISTANT_TOOLS: Readonly<Record<AssistantRole, ReadonlyMap<string, AssistantTool>>> = {
  worker: registerAssistantTools("worker", WORKER_TOOLS),
  employer: registerAssistantTools("employer", EMPLOYER_TOOLS),
  staff: registerAssistantTools("staff", STAFF_TOOLS)
};

/** Every assistant switch, master first. Registered as extra brain switches (Brain page). */
export function assistantSwitchKeys(tools: Readonly<Record<AssistantRole, ReadonlyMap<string, AssistantTool>>> = ASSISTANT_TOOLS): string[] {
  const keys = [ASSISTANT_MASTER_SWITCH, ...ASSISTANT_ROLES.map(roleSwitch)];
  for (const role of ASSISTANT_ROLES) {
    for (const tool of tools[role].values()) if (tool.kind === "action" && !keys.includes(tool.switchKey)) keys.push(tool.switchKey);
  }
  return keys;
}

export type AssistantCard = Readonly<{
  proposalId: string;
  token: string;
  tool: string;
  card: ActionCard;
  expiresAt: string;
}>;

export type AssistantAnswer = Readonly<{
  reply: string;
  handoff: boolean;
  urgent: boolean;
  summary: string;
  cards: readonly AssistantCard[];
}>;

export type ConfirmOutcome = Readonly<{
  status: "done" | "failed" | "cancelled" | "rejected";
  /** For "rejected": invalid | expired | not_yours | switched_off | already_used | rate_limited | unknown_tool */
  reason?: string;
  code?: string;
  tool?: string;
  proposalId?: string;
  text: string;
}>;

type Who = Readonly<{ role: AssistantRole; userId: string; organizationId: string | null; locale: AssistantLocale }>;

/** A small per-user sliding window. In memory: it resets on a restart, the monthly AI limit does not. */
export function createRateLimiter(limit: number, windowMs: number, clock: () => number = Date.now) {
  const hits = new Map<string, number[]>();
  return (key: string): boolean => {
    const now = clock();
    const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
    if (recent.length >= limit) {
      hits.set(key, recent);
      return false;
    }
    recent.push(now);
    hits.set(key, recent);
    if (hits.size > 10_000) hits.clear();
    return true;
  };
}

export type AssistantServiceDeps = Readonly<{
  store: BrainStore;
  signer: ProposalSigner;
  /** Null when there is no key or the outside-AI kill switch is on: the assistant is then off. */
  apiKey(): string | null;
  model: string;
  /** The guide the plain chat already uses for this audience. */
  guideFor(role: AssistantRole): string;
  /** An API caller acting as the signed-in person (their own bearer token). */
  callerFor(authorization: string): ApiCaller;
  tools?: Readonly<Record<AssistantRole, ReadonlyMap<string, AssistantTool>>>;
  now?: () => Date;
  turnsPerTenMinutes?: number;
  confirmsPerTenMinutes?: number;
  fetchImpl?: typeof fetch;
  logger?: PrivacyLogger;
  env?: Readonly<Record<string, string | undefined>>;
  log?: (event: string, fields: Readonly<Record<string, string | number | boolean | null>>) => void;
}>;

const TEN_MINUTES = 10 * 60_000;

export function createAssistantService(deps: AssistantServiceDeps) {
  const tools = deps.tools ?? ASSISTANT_TOOLS;
  const now = deps.now ?? (() => new Date());
  const log = deps.log ?? (() => undefined);
  const turnAllowed = createRateLimiter(deps.turnsPerTenMinutes ?? 10, TEN_MINUTES, () => now().getTime());
  const confirmAllowed = createRateLimiter(deps.confirmsPerTenMinutes ?? 10, TEN_MINUTES, () => now().getTime());

  const roleOn = (settings: BrainSettings, role: AssistantRole) =>
    settings.switches[ASSISTANT_MASTER_SWITCH] === true && settings.switches[roleSwitch(role)] === true;

  const contextFor = (who: Who, authorization: string): ToolContext => ({
    role: who.role,
    userId: who.userId,
    organizationId: who.role === "employer" ? who.organizationId : null,
    // A tool can never reach a money route, whatever it asks for.
    call: guardMoneyRoutes(deps.callerFor(authorization)),
    now: now(),
    locale: who.locale
  });

  async function recordProposal(who: Who, tool: ActionTool, args: Readonly<Record<string, unknown>>, card: ActionCard): Promise<StoredIssue> {
    const pid = newProposalId();
    const at = now();
    const issue = await deps.store.upsertIssue(
      {
        ruleKey: ASSISTANT_RULE_KEY,
        fingerprint: `assistant:${pid}`,
        subjectType: who.role === "staff" ? "staff_user" : `${who.role}_user`,
        subjectId: who.userId,
        severity: "info",
        summary: `Assistant proposed to a ${who.role}: ${tool.name} (${card.subject})`.slice(0, 300),
        inputs: { role: who.role, tool: tool.name, args, card, proposalId: pid },
        recommendedAction: null
      },
      at
    );
    // Recorded, not an open problem: it never shows in the open list or in "needs a person".
    await deps.store.resolveIssue(issue.id, "Shown to the person as a card; waiting for Confirm or Cancel.", at);
    return issue;
  }

  async function verified(who: Who, token: unknown) {
    const checked = deps.signer.verify(token, now().getTime());
    if (!checked.ok) return { ok: false as const, reason: checked.reason === "expired" ? "expired" : "invalid" };
    const p = checked.payload;
    if (p.uid !== who.userId || p.role !== who.role || (who.role === "employer" && p.org !== who.organizationId)) {
      return { ok: false as const, reason: "not_yours" };
    }
    const tool = tools[who.role].get(p.tool);
    if (!tool || tool.kind !== "action") return { ok: false as const, reason: "unknown_tool" };
    const issue = await deps.store.getIssue(p.iid);
    if (!issue || issue.ruleKey !== ASSISTANT_RULE_KEY || issue.fingerprint !== `assistant:${p.pid}` || issue.subjectId !== who.userId) {
      return { ok: false as const, reason: "invalid" };
    }
    return { ok: true as const, payload: p, tool, issue };
  }

  const rejected = (who: Who, reason: string): ConfirmOutcome => ({
    status: "rejected",
    reason,
    text:
      reason === "expired"
        ? { en: "This card has expired. Ask again and I will make a new one.", fr: "Cette carte a expiré. Redemandez et j'en ferai une nouvelle.", ar: "انتهت صلاحية هذه البطاقة. اطلب مرة أخرى وسأعد بطاقة جديدة." }[who.locale]
        : reason === "already_used"
          ? { en: "This card was already used.", fr: "Cette carte a déjà été utilisée.", ar: "استُخدمت هذه البطاقة من قبل." }[who.locale]
          : reason === "switched_off"
            ? { en: "This action is not available in chat right now. Use the page in the app.", fr: "Cette action n'est pas disponible dans le clavardage pour l'instant. Utilisez la page de l'app.", ar: "هذا الإجراء غير متاح في المحادثة الآن. استخدم الصفحة في التطبيق." }[who.locale]
            : reason === "rate_limited"
              ? { en: "Too many actions in a short time. Please wait a few minutes.", fr: "Trop d'actions en peu de temps. Attendez quelques minutes.", ar: "إجراءات كثيرة في وقت قصير. انتظر بضع دقائق." }[who.locale]
              : { en: "This card is not valid. Nothing was done.", fr: "Cette carte n'est pas valide. Rien n'a été fait.", ar: "هذه البطاقة غير صالحة. لم يُنفَّذ شيء." }[who.locale]
  });

  return {
    tools,
    switchKeys: assistantSwitchKeys(tools),

    /** On only with a key, the master switch and the role switch. Off = the chat is exactly as before. */
    async enabled(role: AssistantRole): Promise<boolean> {
      if (!deps.apiKey()) return false;
      return roleOn(await deps.store.loadSettings(), role);
    },

    /** One assistant turn. Null on any failure or limit: the caller then does what it did before. */
    async answer(input: Who & { turns: readonly LoopTurn[]; authorization: string }): Promise<AssistantAnswer | null> {
      const apiKey = deps.apiKey();
      if (!apiKey) return null;
      const settings = await deps.store.loadSettings();
      if (!roleOn(settings, input.role)) return null;
      if (!turnAllowed(`${input.role}:${input.userId}`)) {
        log("assistant.turn", { role: input.role, outcome: "rate_limited" });
        return null;
      }
      let failure: LoopFailure | null = null;
      const answer = await runAssistantLoop({
        apiKey,
        model: deps.model,
        role: input.role,
        system: `${assistantSystemPrompt(input.role)}\n\n${deps.guideFor(input.role)}`,
        context: `Role: ${input.role}. Language of the app: ${input.locale}. Current time: ${now().toISOString()}.`,
        turns: input.turns,
        tools: tools[input.role],
        actionAllowed: (tool) => settings.switches[tool.switchKey] === true,
        ctx: contextFor(input, input.authorization),
        ...(deps.fetchImpl ? { fetchImpl: deps.fetchImpl } : {}),
        ...(deps.logger ? { logger: deps.logger } : {}),
        ...(deps.env ? { env: deps.env } : {}),
        clock: () => now().getTime(),
        onFailure: (reason) => {
          failure = reason;
        }
      });
      if (!answer) {
        log("assistant.turn", { role: input.role, outcome: failure ?? "failed" });
        return null;
      }
      const cards: AssistantCard[] = [];
      for (const proposal of answer.proposals) {
        const issue = await recordProposal(input, proposal.tool, proposal.args, proposal.card);
        const pid = String(issue.inputs.proposalId);
        const exp = now().getTime() + PROPOSAL_TTL_MS;
        const token = deps.signer.sign({
          v: 1, pid, iid: issue.id, uid: input.userId, role: input.role,
          org: input.role === "employer" ? input.organizationId : null,
          tool: proposal.tool.name, args: proposal.args, exp
        });
        cards.push({ proposalId: pid, token, tool: proposal.tool.name, card: proposal.card, expiresAt: new Date(exp).toISOString() });
      }
      log("assistant.turn", { role: input.role, outcome: "ok", proposals: cards.length, handoff: answer.handoff });
      return { reply: answer.reply, handoff: answer.handoff, urgent: answer.urgent, summary: answer.summary, cards };
    },

    /** The person pressed Confirm. Everything is checked again before the tool runs. */
    async confirm(input: Who & { token: unknown; authorization: string }): Promise<ConfirmOutcome> {
      const check = await verified(input, input.token);
      if (!check.ok) return rejected(input, check.reason);
      const settings = await deps.store.loadSettings();
      if (!roleOn(settings, input.role) || settings.switches[check.tool.switchKey] !== true) return rejected(input, "switched_off");
      if (!confirmAllowed(`${input.role}:${input.userId}`)) return rejected(input, "rate_limited");
      const claimed = await deps.store.claimAction({
        issue: check.issue,
        actionKey: `assistant.${check.tool.name}`,
        kind: "live",
        actor: input.role === "staff" ? { type: "staff", userId: input.userId } : { type: "user", userId: input.userId },
        undoHint: check.tool.undoHint,
        now: now()
      });
      if (!claimed) return rejected(input, "already_used");
      let result;
      try {
        result = await check.tool.execute(check.payload.args, contextFor(input, input.authorization));
      } catch {
        result = { ok: false, code: "failed", detail: "The action threw an error." };
      }
      await deps.store.finishAction(claimed.id, {
        status: result.ok ? "done" : "failed",
        detail: `Confirmed by the ${input.role}. ${result.detail}${result.undoNote ? ` Undo: ${result.undoNote}` : ""}`.slice(0, 1000),
        undo: null,
        now: now()
      });
      log("assistant.confirm", { role: input.role, tool: check.tool.name, ok: result.ok, code: result.code });
      return {
        status: result.ok ? "done" : "failed",
        code: result.code,
        tool: check.tool.name,
        proposalId: check.payload.pid,
        text: resultText(input.locale, result.ok, result.code)
      };
    },

    /** The person pressed Cancel. Logged; the card can no longer be confirmed. */
    async cancel(input: Who & { token: unknown }): Promise<ConfirmOutcome> {
      const check = await verified(input, input.token);
      if (!check.ok) return rejected(input, check.reason);
      const claimed = await deps.store.claimAction({
        issue: check.issue,
        actionKey: `assistant.${check.tool.name}`,
        kind: "live",
        actor: input.role === "staff" ? { type: "staff", userId: input.userId } : { type: "user", userId: input.userId },
        undoHint: check.tool.undoHint,
        now: now()
      });
      if (!claimed) return rejected(input, "already_used");
      await deps.store.finishAction(claimed.id, { status: "skipped", detail: `Cancelled by the ${input.role}. Nothing was done.`, undo: null, now: now() });
      return { status: "cancelled", tool: check.tool.name, proposalId: check.payload.pid, text: cancelledText(input.locale) };
    }
  };
}

export type AssistantService = ReturnType<typeof createAssistantService>;
