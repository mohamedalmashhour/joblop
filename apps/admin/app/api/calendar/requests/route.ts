import { parseAdminCalendarList } from "@rwos/shared";
import { sessionBoundary, sessionFailure } from "../../sessionBoundary";

export async function GET() {
  const { gateway, token } = await sessionBoundary();
  const result = await gateway.request("/platform/calendar/requests", "GET", token);
  if (result.status !== "ok") return sessionFailure(result.status);
  try {
    return Response.json(
      { requests: parseAdminCalendarList(result.payload) },
      { headers: { "cache-control": "private, no-store" } }
    );
  } catch {
    return sessionFailure("error");
  }
}
