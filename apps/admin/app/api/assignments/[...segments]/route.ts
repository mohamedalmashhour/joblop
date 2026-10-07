import { sessionBoundary, isSameOriginMutation, sessionFailure } from "../../sessionBoundary";

// Scoped proxy: forwards ONLY the /platform/assignments/* namespace. Session-gated here; the API enforces
// the governed authority + state machine. Mutations require same-origin (CSRF). No domain logic in
// the BFF, no privileged credential reaches the browser. TEST/SYNTHETIC — no money moves.
function targetPath(segments: string[], search: string): string {
  const safe = segments.map((s) => encodeURIComponent(s)).join("/");
  return `/platform/assignments/${safe}${search}`;
}

export async function GET(request: Request, context: Readonly<{ params: Promise<{ segments: string[] }> }>) {
  const { segments } = await context.params;
  const { gateway, token } = await sessionBoundary();
  if (!token) return sessionFailure("denied");
  const url = new URL(request.url);
  const result = await gateway.request(targetPath(segments, url.search), "GET", token);
  if (result.status !== "ok") return sessionFailure(result.status);
  return Response.json(result.payload, { headers: { "cache-control": "private, no-store" } });
}

export async function POST(request: Request, context: Readonly<{ params: Promise<{ segments: string[] }> }>) {
  if (!isSameOriginMutation(request)) return sessionFailure("denied");
  const { segments } = await context.params;
  const { gateway, token } = await sessionBoundary();
  if (!token) return sessionFailure("denied");
  const body = await request.json().catch(() => ({}));
  const result = await gateway.request(targetPath(segments, ""), "POST", token, body);
  if (result.status !== "ok") return sessionFailure(result.status);
  return Response.json(result.payload, { headers: { "cache-control": "private, no-store" } });
}
