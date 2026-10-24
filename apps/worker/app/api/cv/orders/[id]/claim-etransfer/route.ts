import { sessionBoundary, isSameOriginMutation, sessionFailure } from "../../../../sessionBoundary";

// Worker marks their e-transfer as sent (awaiting admin confirmation).
export async function POST(request: Request, context: Readonly<{ params: Promise<{ id: string }> }>) {
  if (!isSameOriginMutation(request)) return sessionFailure("denied");
  const { id } = await context.params;
  const { gateway, token } = await sessionBoundary();
  if (!token) return sessionFailure("denied");
  const result = await gateway.request(`/worker/cv/orders/${encodeURIComponent(id)}/claim-etransfer`, "POST", token, {});
  if (result.status !== "ok") return sessionFailure(result.status);
  return Response.json(result.payload, { headers: { "cache-control": "private, no-store" } });
}
