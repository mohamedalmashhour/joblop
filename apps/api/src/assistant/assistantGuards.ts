import type { ApiCaller, AssistantRole, AssistantTool } from "./assistantTypes";

// The assistant's hard limits, enforced in code (not only in the prompt):
//   1. No tool moves money. A tool must declare movesMoney: false, and a tool whose name says it
//      charges, pays, settles or marks paid is refused at registration. On top of that, the API caller
//      the tools get refuses every money route, so a tool cannot reach one even by mistake.
//   2. Each side sees only its own money: a worker never sees employer rates or Joblop's share; an
//      employer never sees worker pay or Joblop's share. Tool results are projections of the fields the
//      apps already show, and this file strips any rate/share key that slips through, by role.

export class AssistantSetupError extends Error {}

const MONEY_TOOL_NAME = /(charge|payout|pay_out|settle|mark_?paid|refund|transfer|checkout|withdraw_?funds|pay_invoice|collect)/i;

/** Builds the tool list for one role. Throws on any tool that could move money or is listed twice. */
export function registerAssistantTools(role: AssistantRole, tools: readonly AssistantTool[]): ReadonlyMap<string, AssistantTool> {
  const map = new Map<string, AssistantTool>();
  for (const tool of tools) {
    if (tool.role !== role) throw new AssistantSetupError(`Tool ${tool.name} belongs to ${tool.role}, not ${role}.`);
    if (MONEY_TOOL_NAME.test(tool.name)) throw new AssistantSetupError(`Tool ${tool.name} looks like it moves money; it cannot be registered.`);
    if (tool.kind === "action" && (tool as { movesMoney: unknown }).movesMoney !== false) {
      throw new AssistantSetupError(`Action ${tool.name} must declare movesMoney: false.`);
    }
    if (!/^[a-z][a-z0-9_]{2,63}$/.test(tool.name)) throw new AssistantSetupError(`Tool name ${tool.name} is not valid.`);
    if (map.has(tool.name)) throw new AssistantSetupError(`Tool ${tool.name} is registered twice.`);
    map.set(tool.name, tool);
  }
  return map;
}

// Routes that move or record money. A POST to any of these is refused before it reaches the API.
const MONEY_ROUTES: readonly RegExp[] = [
  /\/payments(\/|$|\?)/,
  /\/payment-methods/,
  /\/payouts?(\/|$|\?)/,
  /\/worker-payouts/,
  /mark-paid/,
  /execute-test-payout/,
  /\/checkout/,
  /\/invoices(\/|$|\?)/,
  /\/credit-notes/,
  /\/settlements?/,
  /\/payroll\//,
  /claim-etransfer/,
  /\/subscribe/,
  /\/plan\/(trial|subscribe|cancel)/,
  /\/job-listings\/[^/]+\/(pay|trial)/,
  /\/bonuses/,
  /apply-cancellation-penalty/,
  /\/cv\/(orders|subscribe|trial)/
];

export function isMoneyRoute(method: string, url: string): boolean {
  if (method === "GET") return false;
  const path = url.split("?")[0] ?? url;
  return MONEY_ROUTES.some((pattern) => pattern.test(path));
}

/** Wraps the API caller so a tool can never write to a money route. Reads stay allowed. */
export function guardMoneyRoutes(call: ApiCaller): ApiCaller {
  return async (request) => {
    if (isMoneyRoute(request.method, request.url)) {
      return { status: 403, body: { error: "RWOS_ASSISTANT_MONEY_BLOCKED", message: "The assistant cannot move money." } };
    }
    return call(request);
  };
}

// Keys (lower-cased, separators removed) that name the other side's rate or Joblop's share.
const SHARE_KEYS = ["margin", "markup", "platformfee", "joblopshare", "joblopfee", "commission", "spread", "takerate"];
const EMPLOYER_RATE_KEYS = ["employerhourlyrate", "employerrate", "billrate", "billingrate", "clientrate", "chargerate", "hourlyratebill", "invoicetotal", "subtotal"];
const WORKER_PAY_KEYS = ["workerhourlyrate", "workerrate", "workerpay", "payrate", "wage", "grosspay", "netpay", "earning", "deduction"];

function forbiddenFor(role: AssistantRole): readonly string[] {
  if (role === "worker") return [...SHARE_KEYS, ...EMPLOYER_RATE_KEYS];
  if (role === "employer") return [...SHARE_KEYS, ...WORKER_PAY_KEYS];
  return [];
}

export function isForbiddenKey(role: AssistantRole, key: string): boolean {
  const k = key.toLowerCase().replace(/[^a-z0-9]/g, "");
  return forbiddenFor(role).some((part) => k.includes(part));
}

/** Deep-copies a value and drops every key the role may not see. Staff see everything. */
export function stripForbidden(role: AssistantRole, value: unknown): unknown {
  if (role === "staff") return value;
  const walk = (v: unknown, depth: number): unknown => {
    if (depth > 12 || v === null || typeof v !== "object") return typeof v === "bigint" ? Number(v) : v;
    if (Array.isArray(v)) return v.map((x) => walk(x, depth + 1));
    const out: Record<string, unknown> = {};
    for (const [key, inner] of Object.entries(v)) {
      if (isForbiddenKey(role, key)) continue;
      out[key] = walk(inner, depth + 1);
    }
    return out;
  };
  return walk(value, 0);
}
