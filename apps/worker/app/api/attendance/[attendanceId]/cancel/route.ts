import { getRuntimeConfig } from "@rwos/config";
import { sessionBoundary, isSameOriginMutation, sessionFailure } from "../../../sessionBoundary";

// Worker self-cancel of a booked shift ("Cancel this shift"). The API cancels the booking and the
// schedule entry together, applies the late-cancellation suspension under 24 h and tells the employer
// and staff. Only the outcome comes back (never a rate).
//
// One 409 is forwarded as is: RWOS_SHIFT_ALREADY_STARTED (checked in already), so the page can say
// "contact Joblop" instead of "the shift changed". Every other outcome maps as the session gateway does.
const ALREADY_STARTED = "RWOS_SHIFT_ALREADY_STARTED";
const NO_STORE = { "cache-control": "private, no-store" };

export async function POST(request: Request, context: { params: Promise<{ attendanceId: string }> }) {
  if (!isSameOriginMutation(request)) return sessionFailure("denied");
  const { token } = await sessionBoundary();
  if (!token) return sessionFailure("denied");
  const { attendanceId } = await context.params;

  let response: Response;
  try {
    response = await fetch(
      `${getRuntimeConfig().internalApiOrigin}/worker/attendance/${encodeURIComponent(attendanceId)}/cancel`,
      {
        method: "POST",
        headers: { accept: "application/json", authorization: `Bearer ${token}`, "content-type": "application/json" },
        body: "{}",
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
    if (conflict.error === ALREADY_STARTED) return Response.json({ error: ALREADY_STARTED }, { status: 409, headers: NO_STORE });
    return sessionFailure("stale");
  }
  if (response.status === 502 || response.status === 503 || response.status === 504) return sessionFailure("unavailable");
  if (!response.ok) return sessionFailure("error");
  const result = (await response.json().catch(() => null)) as { lateCancellation?: unknown; suspension?: unknown } | null;
  // Pass on only what the page shows.
  return Response.json(
    { status: "cancelled", lateCancellation: result?.lateCancellation === true, suspended: Boolean(result?.suspension) },
    { headers: NO_STORE }
  );
}
