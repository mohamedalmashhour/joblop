import { isSameOriginMutation, sessionBoundary, sessionFailure } from "../../sessionBoundary";

// Scoped CRM proxy: forwards ONLY the /platform/crm/* namespace. Session-gated here; the API enforces
// platform-administrator authority and validates every input. Mutations require same-origin (CSRF).
// Nothing in this phase sends marketing email or moves money.
function targetPath(segments: string[], search: string): string {
  const safe = segments.map((s) => encodeURIComponent(s)).join("/");
  return `/platform/crm/${safe}${search}`;
}

type Ctx = Readonly<{ params: Promise<{ segments: string[] }> }>;

export async function GET(request: Request, context: Ctx) {
  const { segments } = await context.params;
  const { gateway, token } = await sessionBoundary();
  if (!token) return sessionFailure("denied");
  const url = new URL(request.url);
  const result = await gateway.request(targetPath(segments, url.search), "GET", token);
  if (result.status !== "ok") return sessionFailure(result.status);
  return Response.json(result.payload, { headers: { "cache-control": "private, no-store" } });
}

export async function POST(request: Request, context: Ctx) {
  if (!isSameOriginMutation(request)) return sessionFailure("denied");
  const { segments } = await context.params;
  const { gateway, token } = await sessionBoundary();
  if (!token) return sessionFailure("denied");
  const body = await request.json().catch(() => ({}));
  const result = await gateway.request(targetPath(segments, ""), "POST", token, body);
  if (result.status !== "ok") return sessionFailure(result.status);
  return Response.json(result.payload ?? {}, { headers: { "cache-control": "private, no-store" } });
}

export async function PATCH(request: Request, context: Ctx) {
  if (!isSameOriginMutation(request)) return sessionFailure("denied");
  const { segments } = await context.params;
  const { gateway, token } = await sessionBoundary();
  if (!token) return sessionFailure("denied");
  const body = await request.json().catch(() => ({}));
  const result = await gateway.request(targetPath(segments, ""), "PATCH", token, body);
  if (result.status !== "ok") return sessionFailure(result.status);
  return Response.json(result.payload ?? {}, { headers: { "cache-control": "private, no-store" } });
}
