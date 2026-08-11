import { sessionBoundary, isSameOriginMutation, sessionFailure } from "../../sessionBoundary";

// Start a verification (identity | background_check). The server begins the provider flow →
// pending. The worker can never mark themselves verified.
export async function POST(request: Request) {
  if (!isSameOriginMutation(request)) return sessionFailure("denied");
  const { gateway, token } = await sessionBoundary();
  if (!token) return sessionFailure("denied");
  const body = (await request.json().catch(() => null)) as { verificationType?: string } | null;
  const verificationType = body?.verificationType;
  if (verificationType !== "identity" && verificationType !== "background_check") {
    return Response.json({ status: "invalid", message: "A valid verificationType is required." }, { status: 400, headers: { "cache-control": "private, no-store" } });
  }
  const result = await gateway.request("/verification/worker/request", "POST", token, { verificationType });
  if (result.status !== "ok") return sessionFailure(result.status);
  return Response.json(result.payload, { headers: { "cache-control": "private, no-store" } });
}
