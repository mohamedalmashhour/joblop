import { parseEmployerJobRequest, readEmployerJobRequestInput } from "./jobRequestBoundary";
import {
  isSameOriginMutation,
  resolveClientOrganizationId,
  sessionBoundary,
  sessionFailure
} from "../sessionBoundary";

export async function POST(request: Request) {
  if (!isSameOriginMutation(request)) return sessionFailure("denied");
  const input = readEmployerJobRequestInput(await request.json().catch(() => null));
  if (!input) {
    return Response.json(
      { status: "invalid", message: "Complete all required request fields." },
      { status: 400, headers: privateHeaders }
    );
  }
  const { gateway, organizationId, token } = await sessionBoundary();
  const context = await resolveClientOrganizationId(gateway, token, organizationId);
  if (context.status === "context_required") {
    return Response.json(
      { status: "organization_required", organizations: context.organizations },
      { status: 409, headers: privateHeaders }
    );
  }
  if (context.status !== "ok") return sessionFailure(context.status);
  const result = await gateway.request(
    `/organizations/${encodeURIComponent(context.organizationId)}/job-requests`,
    "POST",
    token,
    input
  );
  if (result.status !== "ok") return sessionFailure(result.status);
  try {
    return Response.json(
      { jobRequest: parseEmployerJobRequest(result.payload) },
      { status: 201, headers: privateHeaders }
    );
  } catch {
    return sessionFailure("error");
  }
}

const privateHeaders = { "cache-control": "private, no-store" };
