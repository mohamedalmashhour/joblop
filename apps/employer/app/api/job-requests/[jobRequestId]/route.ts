import { parseEmployerJobRequest, readEmployerJobRequestUpdate } from "../jobRequestBoundary";
import {
  isSameOriginMutation,
  resolveClientOrganizationId,
  sessionBoundary,
  sessionFailure
} from "../../sessionBoundary";

export async function GET(
  _request: Request,
  context: Readonly<{ params: Promise<{ jobRequestId: string }> }>
) {
  return forward(context, "GET");
}

export async function PATCH(
  request: Request,
  context: Readonly<{ params: Promise<{ jobRequestId: string }> }>
) {
  if (!isSameOriginMutation(request)) return sessionFailure("denied");
  const input = readEmployerJobRequestUpdate(await request.json().catch(() => null));
  if (!input) {
    return Response.json(
      { status: "invalid", message: "Enter a valid title, worker count, and urgency." },
      { status: 400, headers: privateHeaders }
    );
  }
  return forward(context, "PATCH", input);
}

async function forward(
  routeContext: Readonly<{ params: Promise<{ jobRequestId: string }> }>,
  method: "GET" | "PATCH",
  body?: unknown
) {
  const { jobRequestId } = await routeContext.params;
  const { gateway, organizationId, token } = await sessionBoundary();
  const organization = await resolveClientOrganizationId(gateway, token, organizationId);
  if (organization.status === "context_required") {
    return Response.json(
      { status: "organization_required", organizations: organization.organizations },
      { status: 409, headers: privateHeaders }
    );
  }
  if (organization.status !== "ok") return sessionFailure(organization.status);
  const result = await gateway.request(
    `/organizations/${encodeURIComponent(organization.organizationId)}/job-requests/${encodeURIComponent(jobRequestId)}`,
    method,
    token,
    body
  );
  if (result.status !== "ok") return sessionFailure(result.status);
  try {
    return Response.json(
      { jobRequest: parseEmployerJobRequest(result.payload) },
      { headers: privateHeaders }
    );
  } catch {
    return sessionFailure("error");
  }
}

const privateHeaders = { "cache-control": "private, no-store" };
