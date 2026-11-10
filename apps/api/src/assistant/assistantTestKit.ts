// Test kit for the role assistant: a scripted fake model (no real outside-AI call ever) and a fake
// API caller standing in for the existing routes.
import { vi } from "vitest";
import type { ApiCaller, ApiRequest, ApiResponse, ToolContext } from "./assistantTypes";

export const WORKER_ID = "11111111-1111-4111-8111-111111111111";
export const EMPLOYER_ID = "22222222-2222-4222-8222-222222222222";
export const STAFF_ID = "33333333-3333-4333-8333-333333333333";
export const ORG_ID = "44444444-4444-4444-8444-444444444444";
export const OTHER_ORG_ID = "55555555-5555-4555-8555-555555555555";
export const JOB_ID = "66666666-6666-4666-8666-666666666666";
export const ASSIGNMENT_ID = "77777777-7777-4777-8777-777777777777";
export const TIMESHEET_ID = "88888888-8888-4888-8888-888888888888";
export const ISSUE_ID = "99999999-9999-4999-8999-999999999999";

export type Route = (request: ApiRequest) => ApiResponse | Promise<ApiResponse>;

/** A fake of the existing API: `METHOD path-without-query` → handler. Unknown routes answer 404. */
export function fakeApi(routes: Record<string, Route>) {
  const calls: ApiRequest[] = [];
  const call: ApiCaller = vi.fn(async (request: ApiRequest) => {
    calls.push(request);
    const key = `${request.method} ${request.url.split("?")[0]}`;
    const route = routes[key];
    return route ? route(request) : { status: 404, body: { error: "RWOS_NOT_FOUND" } };
  });
  return { call, calls };
}

export const ok = (body: unknown, status = 200): ApiResponse => ({ status, body });

export function context(over: Partial<ToolContext> & Pick<ToolContext, "call">): ToolContext {
  return { role: "worker", userId: WORKER_ID, organizationId: null, now: new Date("2026-11-10T12:00:00Z"), locale: "en", ...over };
}

type Block = Record<string, unknown>;
export const toolUse = (id: string, name: string, input: Record<string, unknown>): Block => ({ type: "tool_use", id, name, input });
export const text = (value: string): Block => ({ type: "text", text: value });
export const thinking = (): Block => ({ type: "thinking", thinking: "", signature: "S".repeat(4000) });

/** A scripted model: each call returns the next response. Records every request body sent. */
export function fakeModel(script: ReadonlyArray<{ stop: string; content: Block[] } | { status: number }>) {
  const bodies: Record<string, unknown>[] = [];
  let index = 0;
  const fetchImpl = vi.fn(async (_url: unknown, init?: { body?: unknown }) => {
    bodies.push(JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>);
    const step = script[index % script.length]!;
    index += 1;
    if ("status" in step) return new Response("{}", { status: step.status });
    return new Response(JSON.stringify({ stop_reason: step.stop, content: step.content }), { status: 200 });
  });
  return { fetchImpl: fetchImpl as unknown as typeof fetch, bodies, calls: () => fetchImpl.mock.calls.length };
}

export const silentLogger = { info: vi.fn() };
