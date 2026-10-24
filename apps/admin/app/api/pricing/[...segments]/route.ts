import { sessionBoundary, isSameOriginMutation, sessionFailure } from "../../sessionBoundary";

// Scoped pricing proxy: forwards ONLY the /platform/pricing/* namespace. Session-gated here; the API
// enforces admin authority. Mutations require same-origin (CSRF). No pricing logic lives in the BFF.
// Quote is computation only — no invoice, no money (FINANCE_LIVE gated downstream).
function targetPath(segments: string[], search: string): string {
  const safe = segments.map((s) => encodeURIComponent(s)).join("/");
  return `/platform/pricing/${safe}${search}`;
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
