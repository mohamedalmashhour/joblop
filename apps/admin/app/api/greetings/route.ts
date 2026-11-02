import { sessionBoundary, isSameOriginMutation, sessionFailure } from "../sessionBoundary";

// Admin: list sent greetings / send a new greeting. Proxies to the platform API (authority enforced there).
export async function GET() {
  const { gateway, token } = await sessionBoundary();
  if (!token) return sessionFailure("denied");
  const result = await gateway.request("/platform/greetings", "GET", token);
  if (result.status !== "ok") return sessionFailure(result.status);
  return Response.json(result.payload, { headers: { "cache-control": "private, no-store" } });
}

export async function POST(request: Request) {
  if (!isSameOriginMutation(request)) return sessionFailure("denied");
  const { gateway, token } = await sessionBoundary();
  if (!token) return sessionFailure("denied");
  const body = await request.json().catch(() => ({}));
  const result = await gateway.request("/platform/greetings", "POST", token, body);
  if (result.status !== "ok") return sessionFailure(result.status);
  return Response.json(result.payload, { headers: { "cache-control": "private, no-store" } });
}
