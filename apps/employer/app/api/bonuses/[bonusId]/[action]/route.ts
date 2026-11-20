import { isSameOriginMutation, sessionBoundary, sessionFailure } from "../../../sessionBoundary";

// The employer accepts or declines a bonus Joblop offered. Accepting adds it to their invoice;
// the API checks ownership and returns 409 when another bonus is already active.
export async function POST(
  request: Request,
  context: Readonly<{ params: Promise<{ bonusId: string; action: string }> }>
) {
  if (!isSameOriginMutation(request)) return sessionFailure("denied");
  const { bonusId, action } = await context.params;
  if (action !== "accept" && action !== "decline") return sessionFailure("not_found");
  const { gateway, token } = await sessionBoundary();
  if (!token) return sessionFailure("denied");
  const result = await gateway.request(
    `/employer/bonuses/${encodeURIComponent(bonusId)}/${action}`,
    "POST",
    token
  );
  if (result.status !== "ok") return sessionFailure(result.status);
  return Response.json(result.payload, { headers: privateHeaders });
}

const privateHeaders = { "cache-control": "private, no-store" };
