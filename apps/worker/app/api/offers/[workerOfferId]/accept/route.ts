import { getRuntimeConfig } from "@rwos/config";
import { SHIFT_OVERLAP_ERROR_CODE } from "@rwos/shared";
import { sessionBoundary, isSameOriginMutation, sessionFailure } from "../../../sessionBoundary";

// Worker ACCEPTS a governed offer. Optimistic-concurrency (`expectedVersion`) + terms binding
// (`expectedTermsVersionId`) are enforced by the API; a version/terms drift returns 409 (stale),
// prompting the UI to reload. This route never mutates offer terms — it only relays the decision.
//
// One 409 is forwarded verbatim: RWOS_SHIFT_OVERLAP (the worker already holds a shift at that time).
// Its body carries the message in EN / FR / AR, so the page can say which shift is in the way
// instead of "the offer changed". Every other outcome maps exactly as the session gateway does.
export async function POST(request: Request, context: { params: Promise<{ workerOfferId: string }> }) {
  if (!isSameOriginMutation(request)) return sessionFailure("denied");
  const { token } = await sessionBoundary();
  if (!token) return sessionFailure("denied");
  const { workerOfferId } = await context.params;
  const body = await request.json().catch(() => ({}));
  const payload: Record<string, unknown> = {
    expectedVersion: typeof body?.expectedVersion === "number" ? body.expectedVersion : 0,
    expectedTermsVersionId: typeof body?.expectedTermsVersionId === "string" ? body.expectedTermsVersionId : ""
  };
  if (typeof body?.reason === "string") payload.reason = body.reason;

  let response: Response;
  try {
    response = await fetch(
      `${getRuntimeConfig().internalApiOrigin}/worker/offers/${encodeURIComponent(workerOfferId)}/accept`,
      {
        method: "POST",
        headers: {
          accept: "application/json",
          authorization: `Bearer ${token}`,
          "content-type": "application/json"
        },
        body: JSON.stringify(payload),
        cache: "no-store"
      }
    );
  } catch {
    return sessionFailure("unavailable");
  }

  if (response.status === 401 || response.status === 403) return sessionFailure("denied");
  if (response.status === 404) return sessionFailure("not_found");
  if (response.status === 409) {
    const conflict = (await response.json().catch(() => ({}))) as { error?: unknown };
    if (conflict.error === SHIFT_OVERLAP_ERROR_CODE) {
      return Response.json(conflict, { status: 409, headers: { "cache-control": "private, no-store" } });
    }
    return sessionFailure("stale");
  }
  if (response.status === 412) return sessionFailure("stale");
  if (response.status === 502 || response.status === 503 || response.status === 504) {
    return sessionFailure("unavailable");
  }
  if (!response.ok) return sessionFailure("error");
  const result = await response.json().catch(() => null);
  return Response.json(result, { headers: { "cache-control": "private, no-store" } });
}
