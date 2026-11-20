import { getRuntimeConfig } from "@rwos/config";
import { sessionBoundary, isSameOriginMutation, sessionFailure } from "../../../sessionBoundary";

// "Report my hours": a shift the worker worked without checking in. The worker sends the arrival and
// departure times (HH:MM, the shift's time zone) and a short reason; the report waits for Joblop to
// approve. Only the outcome comes back (never a rate).
//
// The 400 / 409 answers that say WHY the report was refused (RWOS_HOURS_REPORT_INVALID /
// RWOS_HOURS_REPORT_NOT_AVAILABLE with a `reason`) are forwarded, so the form can say what to fix.
const FORWARDED = new Set(["RWOS_HOURS_REPORT_INVALID", "RWOS_HOURS_REPORT_NOT_AVAILABLE"]);
const NO_STORE = { "cache-control": "private, no-store" };

export async function POST(request: Request, context: { params: Promise<{ attendanceId: string }> }) {
  if (!isSameOriginMutation(request)) return sessionFailure("denied");
  const { token } = await sessionBoundary();
  if (!token) return sessionFailure("denied");
  const { attendanceId } = await context.params;
  const input = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const body = {
    arrivalTime: typeof input.arrivalTime === "string" ? input.arrivalTime : "",
    departureTime: typeof input.departureTime === "string" ? input.departureTime : "",
    reason: typeof input.reason === "string" ? input.reason : ""
  };

  let response: Response;
  try {
    response = await fetch(
      `${getRuntimeConfig().internalApiOrigin}/worker/attendance/${encodeURIComponent(attendanceId)}/report-hours`,
      {
        method: "POST",
        headers: { accept: "application/json", authorization: `Bearer ${token}`, "content-type": "application/json" },
        body: JSON.stringify(body),
        cache: "no-store"
      }
    );
  } catch {
    return sessionFailure("unavailable");
  }

  if (response.status === 401 || response.status === 403) return sessionFailure("denied");
  if (response.status === 404) return sessionFailure("not_found");
  if (response.status === 400 || response.status === 409) {
    const refused = (await response.json().catch(() => ({}))) as { error?: unknown; reason?: unknown };
    if (typeof refused.error === "string" && FORWARDED.has(refused.error)) {
      return Response.json(
        { error: refused.error, reason: typeof refused.reason === "string" ? refused.reason : null },
        { status: response.status, headers: NO_STORE }
      );
    }
    return sessionFailure(response.status === 409 ? "stale" : "error");
  }
  if (response.status === 502 || response.status === 503 || response.status === 504) return sessionFailure("unavailable");
  if (!response.ok) return sessionFailure("error");
  const result = (await response.json().catch(() => null)) as { hoursReport?: { status?: unknown } } | null;
  return Response.json({ status: result?.hoursReport?.status === "pending" ? "pending" : "sent" }, { status: 201, headers: NO_STORE });
}
