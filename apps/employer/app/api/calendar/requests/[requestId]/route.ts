import { parseClientCalendarDto } from "@rwos/shared";
import { readEmployerCalendarProfileInput } from "../../../job-requests/jobRequestBoundary";
import {
  isSameOriginMutation,
  resolveClientOrganizationId,
  sessionBoundary,
  sessionFailure
} from "../../../sessionBoundary";

export async function GET(
  _request: Request,
  context: Readonly<{ params: Promise<{ requestId: string }> }>
) {
  const { requestId } = await context.params;
  const { gateway, organizationId, token } = await sessionBoundary();
  const organization = await resolveClientOrganizationId(gateway, token, organizationId);
  if (organization.status === "context_required") {
    return Response.json(
      { status: "organization_required", organizations: organization.organizations },
      { status: 409, headers: { "cache-control": "private, no-store" } }
    );
  }
  if (organization.status !== "ok") return sessionFailure(organization.status);
  const result = await gateway.request(
    `/organizations/${encodeURIComponent(organization.organizationId)}/calendar/requests/${encodeURIComponent(requestId)}`,
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

export async function PUT(
  request: Request,
  context: Readonly<{ params: Promise<{ requestId: string }> }>
) {
  if (!isSameOriginMutation(request)) return sessionFailure("denied");
  const input = readEmployerCalendarProfileInput(await request.json().catch(() => null));
  if (!input) {
    return Response.json(
      { status: "invalid", message: "Review the staffing details and try again." },
      { status: 400, headers: { "cache-control": "private, no-store" } }
    );
  }
  const { requestId } = await context.params;
  const { gateway, organizationId, token } = await sessionBoundary();
  const organization = await resolveClientOrganizationId(gateway, token, organizationId);
  if (organization.status === "context_required") {
    return Response.json(
      { status: "organization_required", organizations: organization.organizations },
      { status: 409, headers: { "cache-control": "private, no-store" } }
    );
  }
  if (organization.status !== "ok") return sessionFailure(organization.status);
  const result = await gateway.request(
    `/organizations/${encodeURIComponent(organization.organizationId)}/calendar/requests/${encodeURIComponent(requestId)}/profile`,
    "PUT",
    token,
    input
  );
  if (result.status !== "ok") return sessionFailure(result.status);
  return Response.json({ status: "saved" }, { headers: { "cache-control": "private, no-store" } });
}
