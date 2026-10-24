import { sessionBoundary, isSameOriginMutation, sessionFailure } from "../../sessionBoundary";

// Scoped proxy for the Worker Pro order review queue (/platform/cv-pro-orders/*). Session-gated; the
// API enforces admin authority. Confirming an e-transfer grants the entitlement (real admin action).
function targetPath(segments: string[], search: string): string {
  const safe = segments.map((s) => encodeURIComponent(s)).join("/");
  const base = segments.length > 0 ? `/platform/cv-pro-orders/${safe}` : "/platform/cv-pro-orders";
  return `${base}${search}`;
}

export async function GET(request: Request, context: Readonly<{ params: Promise<{ segments?: string[] }> }>) {
  const { segments } = await context.params;
  const { gateway, token } = await sessionBoundary();
  if (!token) return sessionFailure("denied");
  const url = new URL(request.url);
  const result = await gateway.request(targetPath(segments ?? [], url.search), "GET", token);
  if (result.status !== "ok") return sessionFailure(result.status);
  return Response.json(result.payload, { headers: { "cache-control": "private, no-store" } });
}

export async function POST(request: Request, context: Readonly<{ params: Promise<{ segments?: string[] }> }>) {
  if (!isSameOriginMutation(request)) return sessionFailure("denied");
  const { segments } = await context.params;
  const { gateway, token } = await sessionBoundary();
  if (!token) return sessionFailure("denied");
  const body = await request.json().catch(() => ({}));
  const result = await gateway.request(targetPath(segments ?? [], ""), "POST", token, body);
  if (result.status !== "ok") return sessionFailure(result.status);
  return Response.json(result.payload, { headers: { "cache-control": "private, no-store" } });
}
