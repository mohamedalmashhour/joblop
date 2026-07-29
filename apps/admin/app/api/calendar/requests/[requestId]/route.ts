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
    if (calendarRequest.id !== requestId) return sessionFailure("error");
    return Response.json(
      { request: calendarRequest },
      { headers: { "cache-control": "private, no-store" } }
    );
  } catch {
    return sessionFailure("error");
  }
}
