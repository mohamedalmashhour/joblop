import { sessionBoundary, isSameOriginMutation, sessionFailure } from "../../sessionBoundary";

// Scoped JobScanner proxy: forwards ONLY the /platform/jobscanner/* namespace. Session-gated here; the
// API enforces admin authority. Mutations require same-origin (CSRF). External job leads + CV drafts
// only — no money, no Joblop governance, nothing sent on anyone's behalf.
function targetPath(segments: string[], search: string): string {
  const safe = segments.map((s) => encodeURIComponent(s)).join("/");
  return `/platform/jobscanner/${safe}${search}`;
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

export async function DELETE(request: Request, context: Readonly<{ params: Promise<{ segments: string[] }> }>) {
  if (!isSameOriginMutation(request)) return sessionFailure("denied");
  const { segments } = await context.params;
  const { gateway, token } = await sessionBoundary();
  if (!token) return sessionFailure("denied");
  const url = new URL(request.url);
  const result = await gateway.request(targetPath(segments, url.search), "DELETE", token);
  if (result.status !== "ok") return sessionFailure(result.status);
  return Response.json(result.payload, { headers: { "cache-control": "private, no-store" } });
}
