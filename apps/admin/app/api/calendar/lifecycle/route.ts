import { parseAdminCalendarList } from "@rwos/shared";
import { sessionBoundary, sessionFailure } from "../../sessionBoundary";

// Full-lifecycle admin calendar BFF: every non-draft request (submission → closure), not just the
// review queue served by /api/calendar/requests. Same admin authority; read-only.
export async function GET() {
  const { gateway, token } = await sessionBoundary();
  const result = await gateway.request("/platform/calendar/lifecycle", "GET", token);
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
