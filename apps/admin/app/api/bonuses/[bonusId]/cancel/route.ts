import { isSameOriginMutation, sessionBoundary, sessionFailure } from "../../../sessionBoundary";
import { forwardBonusMutation } from "../../bonusForward";

// Staff cancel a job bonus (offered, accepted or approved). The API decides if it can still be cancelled.
export async function POST(request: Request, context: { params: Promise<{ bonusId: string }> }) {
  if (!isSameOriginMutation(request)) return sessionFailure("denied");
  const { token } = await sessionBoundary();
  if (!token) return sessionFailure("denied");
  const { bonusId } = await context.params;
  return forwardBonusMutation(`/platform/bonuses/${encodeURIComponent(bonusId)}/cancel`, token);
}
