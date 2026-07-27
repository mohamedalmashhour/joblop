import { parseClientCalendarList } from "@rwos/shared";
import { sessionBoundary, sessionFailure } from "../../sessionBoundary";

export async function GET(request: Request) {
  const organizationId = new URL(request.url).searchParams.get("organizationId");
  if (!organizationId) {
    return Response.json(
      { status: "unavailable", message: "Calendar context unavailable." },
      { status: 503, headers: { "cache-control": "private, no-store" } }
    );
  }
  const { gateway, token } = await sessionBoundary();
  const result = await gateway.request(
    `/organizations/${encodeURIComponent(organizationId)}/calendar/requests`,
    "GET",
    token
  );
  if (result.status !== "ok") return sessionFailure(result.status);
  try {
    return Response.json(
      { requests: parseClientCalendarList(result.payload) },
      { headers: { "cache-control": "private, no-store" } }
    );
  } catch {
    return sessionFailure("error");
  }
}
