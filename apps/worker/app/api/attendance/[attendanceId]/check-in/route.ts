import { getRuntimeConfig } from "@rwos/config";
import { sessionBoundary, isSameOriginMutation, sessionFailure } from "../../../sessionBoundary";

// Worker check-in. Server timestamp is authoritative; version-guarded so a double/retry
// check-in is exactly-once.
//
// One 409 is forwarded as is: RWOS_CHECK_IN_TOO_EARLY (check-in opens 30 minutes before the shift).
// It carries `opensAt`, so the page can say when check-in opens instead of "the shift changed".
// Every other outcome maps exactly as the session gateway does.
const TOO_EARLY = "RWOS_CHECK_IN_TOO_EARLY";
const NO_STORE = { "cache-control": "private, no-store" };

export async function POST(request: Request, context: { params: Promise<{ attendanceId: string }> }) {
  if (!isSameOriginMutation(request)) return sessionFailure("denied");
  const { token } = await sessionBoundary();
  if (!token) return sessionFailure("denied");
  const { attendanceId } = await context.params;
  const body = await request.json().catch(() => ({}));

  let response: Response;
  try {
    response = await fetch(
      `${getRuntimeConfig().internalApiOrigin}/worker/attendance/${encodeURIComponent(attendanceId)}/check-in`,
      {
        method: "POST",
        headers: { accept: "application/json", authorization: `Bearer ${token}`, "content-type": "application/json" },
        body: JSON.stringify(body ?? {}),
        cache: "no-store"
      }
    );
  } catch {
    return sessionFailure("unavailable");
  }

  if (response.status === 401 || response.status === 403) return sessionFailure("denied");
  if (response.status === 404) return sessionFailure("not_found");
  if (response.status === 409) {
    const conflict = (await response.json().catch(() => ({}))) as { error?: unknown; opensAt?: unknown };
    if (conflict.error === TOO_EARLY) {
      return Response.json(
        { error: TOO_EARLY, ...(typeof conflict.opensAt === "string" ? { opensAt: conflict.opensAt } : {}) },
        { status: 409, headers: NO_STORE }
      );
    }
    return sessionFailure("stale");
  }
  if (response.status === 412) return sessionFailure("stale");
  if (response.status === 502 || response.status === 503 || response.status === 504) return sessionFailure("unavailable");
  if (!response.ok) return sessionFailure("error");
  const result = await response.json().catch(() => null);
  return Response.json(result, { headers: NO_STORE });
}
