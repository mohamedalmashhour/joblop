import { sessionBoundary, isSameOriginMutation, sessionFailure } from "../../../../sessionBoundary";

// Finalize a Stripe (card) Pro order after returning from hosted Checkout. The API verifies the
// Checkout Session was actually PAID (test mode) before granting Pro — the client is never trusted.
export async function POST(request: Request, context: Readonly<{ params: Promise<{ id: string }> }>) {
  if (!isSameOriginMutation(request)) return sessionFailure("denied");
  const { id } = await context.params;
  const { gateway, token } = await sessionBoundary();
  if (!token) return sessionFailure("denied");
  const result = await gateway.request(`/worker/cv/orders/${encodeURIComponent(id)}/complete`, "POST", token, {});
  if (result.status !== "ok") return sessionFailure(result.status);
  return Response.json(result.payload, { headers: { "cache-control": "private, no-store" } });
}
