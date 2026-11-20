import { isSameOriginMutation, sessionBoundary, sessionFailure } from "../../../sessionBoundary";
import { forwardBonusMutation, privateHeaders, readAmountMinor, readBonusKind } from "../../bonusForward";

// Job bonus BFF (staff). GET returns Joblop's suggestion and the bonus history for one job;
// POST offers a bonus to the employer (fundedBy employer) or approves it from Joblop's share
// (fundedBy platform). The API enforces HR authority, the cap and the one-active-bonus rule.
export async function GET(_request: Request, context: { params: Promise<{ jobRequestId: string }> }) {
  const { gateway, token } = await sessionBoundary();
  if (!token) return sessionFailure("denied");
  const { jobRequestId } = await context.params;
  const base = `/platform/job-requests/${encodeURIComponent(jobRequestId)}`;
  const [suggestion, bonuses] = await Promise.all([
    gateway.request(`${base}/bonus-suggestion`, "GET", token),
    gateway.request(`${base}/bonuses`, "GET", token)
  ]);
  if (bonuses.status !== "ok") return sessionFailure(bonuses.status);
  const suggestionPayload =
    suggestion.status === "ok" ? ((suggestion.payload as { suggestion?: unknown } | null)?.suggestion ?? null) : null;
  const bonusList = (bonuses.payload as { bonuses?: unknown } | null)?.bonuses;
  return Response.json(
    { suggestion: suggestionPayload, bonuses: Array.isArray(bonusList) ? bonusList : [] },
    { headers: privateHeaders }
  );
}

export async function POST(request: Request, context: { params: Promise<{ jobRequestId: string }> }) {
  if (!isSameOriginMutation(request)) return sessionFailure("denied");
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const kind = readBonusKind(body?.kind);
  const amountMinor = readAmountMinor(body?.amountMinor);
  const fundedBy = body?.fundedBy === "employer" || body?.fundedBy === "platform" ? body.fundedBy : null;
  if (!kind || amountMinor === null || !fundedBy) {
    return Response.json(
      { status: "invalid", message: "A bonus type, amount and payer are required." },
      { status: 400, headers: privateHeaders }
    );
  }
  const reason = typeof body?.reason === "string" && body.reason.trim() ? body.reason.trim().slice(0, 500) : undefined;
  const { token } = await sessionBoundary();
  if (!token) return sessionFailure("denied");
  const { jobRequestId } = await context.params;
  return forwardBonusMutation(`/platform/job-requests/${encodeURIComponent(jobRequestId)}/bonuses`, token, {
    kind,
    amountMinor,
    fundedBy,
    ...(reason ? { reason } : {}),
    ...(fundedBy === "platform" && body?.urgentOverride === true ? { urgentOverride: true } : {})
  });
}
