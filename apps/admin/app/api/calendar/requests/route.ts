import { parseAdminCalendarList } from "@rwos/shared";
import { sessionBoundary, sessionFailure } from "../../sessionBoundary";
import { parseRequestCards } from "../../../calendar/requestSummary";

export async function GET() {
  const { gateway, token } = await sessionBoundary();
  const result = await gateway.request("/platform/calendar/requests", "GET", token);
  if (result.status !== "ok") return sessionFailure(result.status);
  try {
    return Response.json(
      {
        requests: parseAdminCalendarList(result.payload),
        // Staff-only card details (company, location, role); empty when the API sends none.
        cards: parseRequestCards((result.payload as { cards?: unknown } | null)?.cards)
      },
      { headers: { "cache-control": "private, no-store" } }
    );
  } catch {
    return sessionFailure("error");
  }
}
