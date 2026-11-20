import { isSameOriginMutation, sessionBoundary, sessionFailure } from "../../../sessionBoundary";

// Sends one released payout through test mode. Same-origin only; the API enforces authority and
// refuses anything but a released payout. This path cannot move real money.
export async function POST(request: Request, context: Readonly<{ params: Promise<{ payoutId: string }> }>) {
  if (!isSameOriginMutation(request)) return sessionFailure("denied");
  const { payoutId } = await context.params;
  const { gateway, token } = await sessionBoundary();
  if (!token) return sessionFailure("denied");
  const result = await gateway.request(
    `/platform/worker-payouts/${encodeURIComponent(payoutId)}/execute-test-payout`,
    "POST",
    token,
    {}
  );
  if (result.status !== "ok") return sessionFailure(result.status);
  return Response.json(result.payload, { headers: { "cache-control": "private, no-store" } });
}
