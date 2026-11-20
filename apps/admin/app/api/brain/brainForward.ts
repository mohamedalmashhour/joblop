import { isSameOriginMutation, sessionBoundary, sessionFailure } from "../sessionBoundary";

const privateHeaders = { "cache-control": "private, no-store" };

// Every Brain page change (mode, switch, Do it, close, undo) is a same-origin POST that forwards the
// staff session to the API, which checks platform administrator authority and validates the input.
export async function forwardBrainMutation(request: Request, path: string, body?: Record<string, unknown>): Promise<Response> {
  if (!isSameOriginMutation(request)) return sessionFailure("denied");
  const { gateway, token } = await sessionBoundary();
  if (!token) return sessionFailure("denied");
  const result = await gateway.request(path, "POST", token, body ?? {});
  if (result.status !== "ok") return sessionFailure(result.status);
  return Response.json(result.payload ?? {}, { headers: privateHeaders });
}

export async function readJson(request: Request): Promise<Record<string, unknown>> {
  const body = (await request.json().catch(() => null)) as unknown;
  return body && typeof body === "object" && !Array.isArray(body) ? (body as Record<string, unknown>) : {};
}
