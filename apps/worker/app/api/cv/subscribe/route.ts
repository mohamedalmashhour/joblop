import { sessionBoundary, isSameOriginMutation, sessionFailure } from "../../sessionBoundary";

// Start a Worker Pro purchase. Records a pending order + how to pay (e-transfer / card). No charge.
export async function POST(request: Request) {
  if (!isSameOriginMutation(request)) return sessionFailure("denied");
  const { gateway, token } = await sessionBoundary();
  if (!token) return sessionFailure("denied");
  const body = await request.json().catch(() => ({}));
  // Forward this app's own origin so the API can build the Stripe Checkout return URLs on our domain.
  const origin = new URL(request.url).origin;
  const result = await gateway.request("/worker/cv/subscribe", "POST", token, { ...(typeof body === "object" && body ? body : {}), origin });
  if (result.status !== "ok") return sessionFailure(result.status);
  return Response.json(result.payload, { headers: { "cache-control": "private, no-store" } });
}
