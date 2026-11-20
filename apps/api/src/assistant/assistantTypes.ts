// Joblop Brain phase 2: the AI assistant for each role, inside the existing "Contact Joblop" chat.
//
// Tools call the SAME routes the apps already use (through Fastify inject, with the signed-in person's
// own session), so every permission check, cut-off and validation the apps go through applies. Read
// tools run straight away; action tools only PROPOSE: the person must press Confirm, and the confirm
// endpoint re-checks everything before the tool runs. No tool moves money.

export type AssistantRole = "worker" | "employer" | "staff";
export const ASSISTANT_ROLES: readonly AssistantRole[] = ["worker", "employer", "staff"];
export type AssistantLocale = "en" | "fr" | "ar";

/** One internal call to an existing API route, as the signed-in person. */
export type ApiRequest = Readonly<{ method: "GET" | "POST"; url: string; body?: Readonly<Record<string, unknown>> }>;
export type ApiResponse = Readonly<{ status: number; body: unknown }>;
export type ApiCaller = (request: ApiRequest) => Promise<ApiResponse>;

export type ToolContext = Readonly<{
  role: AssistantRole;
  userId: string;
  /** Employer only: the organization of the person's active membership. */
  organizationId: string | null;
  call: ApiCaller;
  now: Date;
  locale: AssistantLocale;
}>;

/** JSON schema for a tool's input (Messages API `input_schema`). */
export type ToolSchema = Readonly<{
  type: "object";
  properties: Readonly<Record<string, unknown>>;
  required?: readonly string[];
  additionalProperties: false;
}>;

export type ToolError = Readonly<{ ok: false; error: string }>;

export type ReadTool = Readonly<{
  kind: "read";
  name: string;
  role: AssistantRole;
  description: string;
  inputSchema: ToolSchema;
  /** Returns a plain projection: only the fields the person's own app shows them. */
  run(input: Readonly<Record<string, unknown>>, ctx: ToolContext): Promise<unknown>;
}>;

/** What the person sees on the card before pressing Confirm. Plain data; the app adds the words. */
export type ActionCard = Readonly<{
  /** The thing acted on, e.g. "Kitchen helper" or "JR-2026-000123". */
  subject: string;
  /** ISO start/end of the shift or request, when there is one. */
  startAt?: string | null;
  endAt?: string | null;
  timezone?: string | null;
  /** City or site name. Never an exact address. */
  place?: string | null;
  /** Short extra lines (e.g. "3 workers"). */
  details?: readonly string[];
  /** A warning key the app explains, e.g. "late_cancel" (within 24 h of the start). */
  warning?: "late_cancel" | null;
}>;

export type PreparedAction = Readonly<{ ok: true; args: Readonly<Record<string, unknown>>; card: ActionCard }>;

export type ActionResult = Readonly<{
  ok: boolean;
  /** Plain, short result for the audit log (no personal data). */
  detail: string;
  /** A short code the app turns into words, e.g. "claimed", "full", "not_allowed". */
  code: string;
  /** How to undo, in plain words, when possible. */
  undoNote?: string;
}>;

export type ActionTool = Readonly<{
  kind: "action";
  name: string;
  role: AssistantRole;
  /** The per-action switch on the Brain page. */
  switchKey: string;
  /** Must be the literal false: the registry refuses anything else. */
  movesMoney: false;
  description: string;
  inputSchema: ToolSchema;
  undoHint: string;
  /** Runs when the model proposes: validates the input and reads what the card shows. Changes nothing. */
  prepare(input: Readonly<Record<string, unknown>>, ctx: ToolContext): Promise<PreparedAction | ToolError>;
  /** Runs only after the person's Confirm, with the args from the signed proposal. */
  execute(args: Readonly<Record<string, unknown>>, ctx: ToolContext): Promise<ActionResult>;
}>;

export type AssistantTool = ReadTool | ActionTool;

/** The master switch, the role switches and the action switches. All live with the brain settings. */
export const ASSISTANT_MASTER_SWITCH = "assistant";
export const roleSwitch = (role: AssistantRole) => `assistant.${role}`;
