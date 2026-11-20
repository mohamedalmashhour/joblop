import { maskForAi, maskPersonalData, reportMasked, type PrivacyLogger } from "../aiPrivacyFilter";
import { callOutsideAi } from "../outsideAi";
import { stripForbidden } from "./assistantGuards";
import type { ActionCard, ActionTool, AssistantRole, AssistantTool, ToolContext } from "./assistantTypes";

// The Messages API tool-use loop, through the one outside-AI door (outsideAi.ts). Bounded: at most
// MAX_STEPS model calls and one overall deadline. Any refusal, cut-off, error, unknown stop or limit
// returns null, and the caller falls back to today's behaviour (the conversation goes to a person).
// Every tool result passes the role's rate/share strip and then the privacy filter before it is sent.

export const ASSISTANT_MAX_STEPS = 6;
export const ASSISTANT_DEADLINE_MS = 45_000;
const STEP_TIMEOUT_MS = 20_000;
const MAX_TOOL_CALLS_PER_STEP = 8;
const MAX_TOOL_RESULT_CHARS = 12_000;
const MAX_REPLY_CHARS = 2_500;
const MAX_INPUT_CHARS = 150_000;

export type LoopTurn = Readonly<{ role: "user" | "assistant"; text: string }>;

export type PendingProposal = Readonly<{ tool: ActionTool; args: Readonly<Record<string, unknown>>; card: ActionCard }>;

export type LoopAnswer = Readonly<{
  reply: string;
  handoff: boolean;
  urgent: boolean;
  summary: string;
  proposals: readonly PendingProposal[];
}>;

export type LoopFailure =
  | "ai_failed"
  | "refusal"
  | "cut_off"
  | "unexpected_stop"
  | "too_many_steps"
  | "deadline"
  | "empty_reply";

export type LoopInput = Readonly<{
  apiKey: string;
  model: string;
  role: AssistantRole;
  system: string;
  /** Short context for this turn (time, locale). No personal data. */
  context: string;
  turns: readonly LoopTurn[];
  tools: ReadonlyMap<string, AssistantTool>;
  /** True when an action's own switch is on (checked again at Confirm). */
  actionAllowed(tool: ActionTool): boolean;
  ctx: ToolContext;
  maxSteps?: number;
  deadlineMs?: number;
  fetchImpl?: typeof fetch;
  logger?: PrivacyLogger;
  env?: Readonly<Record<string, string | undefined>>;
  clock?: () => number;
  onFailure?: (reason: LoopFailure) => void;
}>;

const HAND_TO_STAFF = {
  name: "hand_to_staff",
  description: "Pass the conversation to the Joblop team when a person must decide or act (legal rights, disputes, complaints, safety, anything you cannot answer, or the person is unhappy).",
  input_schema: {
    type: "object",
    properties: {
      urgent: { type: "boolean", description: "True when a shift is happening now or about to start and the problem stops the work." },
      summary: { type: "string", description: "One short factual sentence for the team." }
    },
    required: ["urgent", "summary"],
    additionalProperties: false
  }
} as const;

type Block = Readonly<Record<string, unknown>>;
type Message = Readonly<{ role: "user" | "assistant"; content: string | readonly Block[] }>;

/** The privacy filter on a tool result: the role's strip first, then masking and personal-key drops. */
export function filterToolResult(role: AssistantRole, value: unknown, logger?: PrivacyLogger): string {
  const stripped = stripForbidden(role, value);
  const filtered = maskForAi(stripped);
  reportMasked("role_assistant_tool", filtered.masked, filtered.droppedKeys, logger);
  const text = JSON.stringify(filtered.value ?? null);
  return text.length > MAX_TOOL_RESULT_CHARS ? `${text.slice(0, MAX_TOOL_RESULT_CHARS)}…(cut)` : text;
}

export async function runAssistantLoop(input: LoopInput): Promise<LoopAnswer | null> {
  const clock = input.clock ?? Date.now;
  const started = clock();
  const deadline = started + (input.deadlineMs ?? ASSISTANT_DEADLINE_MS);
  const maxSteps = input.maxSteps ?? ASSISTANT_MAX_STEPS;
  const failWith = (reason: LoopFailure): null => {
    input.onFailure?.(reason);
    return null;
  };

  // The person's text and the history pass the privacy filter too.
  const turns = input.turns.map((t) => ({ role: t.role, text: maskPersonalData(t.text).text }));
  while (turns[0]?.role === "assistant") turns.shift();
  if (turns.length === 0) return failWith("empty_reply");
  const messages: Message[] = turns.map((t) => ({ role: t.role, content: t.text }));
  const userContent: string[] = turns.filter((t) => t.role === "user").map((t) => t.text);

  const toolDefs = [
    ...[...input.tools.values()].map((t) => ({ name: t.name, description: t.description, input_schema: t.inputSchema })),
    HAND_TO_STAFF
  ];

  let handoff = false;
  let urgent = false;
  let summary = "";
  const proposals: PendingProposal[] = [];

  for (let step = 0; step < maxSteps; step++) {
    const remaining = deadline - clock();
    if (remaining <= 0) return failWith("deadline");
    const result = await callOutsideAi({
      feature: "role_assistant",
      apiKey: input.apiKey,
      extraHeaders: { "anthropic-beta": "server-side-fallback-2026-07-01" },
      maxInputChars: MAX_INPUT_CHARS,
      timeoutMs: Math.min(STEP_TIMEOUT_MS, remaining),
      userContent,
      ...(input.fetchImpl ? { fetchImpl: input.fetchImpl } : {}),
      ...(input.logger ? { logger: input.logger } : {}),
      ...(input.env ? { env: input.env } : {}),
      body: {
        model: input.model,
        max_tokens: 4000,
        fallbacks: "default",
        output_config: { effort: "low" },
        tools: toolDefs,
        tool_choice: { type: "auto" },
        system: [
          { type: "text", text: input.system, cache_control: { type: "ephemeral" } },
          { type: "text", text: input.context }
        ],
        messages
      }
    });
    if (!result.ok) return failWith(result.outcome === "timeout" && clock() >= deadline ? "deadline" : "ai_failed");
    const data = result.data as { stop_reason?: unknown; content?: unknown } | null;
    const content = Array.isArray(data?.content) ? (data!.content as Block[]) : [];
    const stop = data?.stop_reason;

    if (stop === "end_turn") {
      const reply = content
        .filter((b) => b.type === "text" && typeof b.text === "string")
        .map((b) => String(b.text))
        .join("\n")
        .trim();
      if (!reply) return failWith("empty_reply");
      return { reply: reply.slice(0, MAX_REPLY_CHARS), handoff, urgent, summary, proposals };
    }
    if (stop === "refusal") return failWith("refusal");
    if (stop === "max_tokens" || stop === "model_context_window_exceeded") return failWith("cut_off");
    if (stop !== "tool_use") return failWith("unexpected_stop");

    // Pass the assistant turn back unchanged (thinking blocks included), then every result in ONE turn.
    messages.push({ role: "assistant", content });
    const calls = content.filter((b) => b.type === "tool_use" && typeof b.id === "string" && typeof b.name === "string");
    if (calls.length === 0) return failWith("unexpected_stop");
    const results: Block[] = [];
    for (const [index, call] of calls.entries()) {
      const id = String(call.id);
      const name = String(call.name);
      const args = call.input && typeof call.input === "object" && !Array.isArray(call.input) ? (call.input as Record<string, unknown>) : {};
      const respond = (text: string, isError = false) => {
        results.push({ type: "tool_result", tool_use_id: id, content: text, ...(isError ? { is_error: true } : {}) });
        userContent.push(text);
      };
      if (index >= MAX_TOOL_CALLS_PER_STEP) {
        respond(JSON.stringify({ error: "too_many_tool_calls" }), true);
        continue;
      }
      if (name === HAND_TO_STAFF.name) {
        handoff = true;
        urgent = urgent || args.urgent === true;
        summary = typeof args.summary === "string" ? maskPersonalData(args.summary).text.slice(0, 300) : summary;
        respond(JSON.stringify({ handedToStaff: true, tellThePerson: "The Joblop team will read this and reply here." }));
        continue;
      }
      const tool = input.tools.get(name);
      if (!tool) {
        respond(JSON.stringify({ error: "unknown_tool" }), true);
        continue;
      }
      try {
        if (tool.kind === "read") {
          const value = await tool.run(args, input.ctx);
          const isError = !!value && typeof value === "object" && (value as { ok?: unknown }).ok === false;
          respond(filterToolResult(input.role, value, input.logger), isError);
          continue;
        }
        if (!input.actionAllowed(tool)) {
          respond(JSON.stringify({ error: "switched_off", tellThePerson: "This action is not available in chat yet; use the page in the app." }), true);
          continue;
        }
        if (proposals.length > 0) {
          respond(JSON.stringify({ error: "one_action_at_a_time" }), true);
          continue;
        }
        const prepared = await tool.prepare(args, input.ctx);
        if (!prepared.ok) {
          respond(filterToolResult(input.role, { error: prepared.error }, input.logger), true);
          continue;
        }
        proposals.push({ tool, args: prepared.args, card: prepared.card });
        respond(
          filterToolResult(input.role, {
            proposal: "shown_to_the_person_as_a_card",
            card: prepared.card,
            next: "The person must press Confirm on the card. Nothing has happened yet; do not say it is done."
          }, input.logger)
        );
      } catch {
        respond(JSON.stringify({ error: "tool_failed" }), true);
      }
    }
    messages.push({ role: "user", content: results });
  }
  return failWith("too_many_steps");
}
