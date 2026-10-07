import { parseAdminCalendarDto } from "@rwos/shared";
import { sessionBoundary, sessionFailure } from "../../../sessionBoundary";

export async function GET(
  _request: Request,
  context: Readonly<{ params: Promise<{ requestId: string }> }>
) {
  const { requestId } = await context.params;
  const { gateway, token } = await sessionBoundary();
  const result = await gateway.request(
    `/platform/calendar/requests/${encodeURIComponent(requestId)}`,
    "GET",
    token
  );
  if (result.status !== "ok") return sessionFailure(result.status);
  try {
    const payload = result.payload as { request?: unknown };
    const calendarRequest = parseAdminCalendarDto(payload.request);
    // The admin list links by request number (JR-...), while the API returns the
    // record keyed by its UUID id; accept a match on either so lookup by number works.
    if (calendarRequest.id !== requestId && calendarRequest.requestNumber !== requestId)
      return sessionFailure("error");
    return Response.json(
      { request: calendarRequest },
      { headers: { "cache-control": "private, no-store" } }
    );
  } catch {
    return sessionFailure("error");
  }
}
