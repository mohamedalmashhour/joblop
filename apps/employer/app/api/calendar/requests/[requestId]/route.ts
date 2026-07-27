import { parseClientCalendarDto } from "@rwos/shared";
import { sessionBoundary, sessionFailure } from "../../../sessionBoundary";

export async function GET(
  request: Request,
  context: Readonly<{ params: Promise<{ requestId: string }> }>
) {
  const organizationId = new URL(request.url).searchParams.get("organizationId");
  if (!organizationId) {
    return Response.json(
      { status: "unavailable", message: "Calendar context unavailable." },
      { status: 503, headers: { "cache-control": "private, no-store" } }
    );
  }
  const { requestId } = await context.params;
  const { gateway, token } = await sessionBoundary();
  const result = await gateway.request(
    `/organizations/${encodeURIComponent(organizationId)}/calendar/requests/${encodeURIComponent(requestId)}`,
    "GET",
    token
  );
  if (result.status !== "ok") return sessionFailure(result.status);
  try {
    const payload = result.payload as { request?: unknown };
    return Response.json(
      { request: parseClientCalendarDto(payload.request) },
      { headers: { "cache-control": "private, no-store" } }
    );
  } catch {
    return sessionFailure("error");
  }
}
