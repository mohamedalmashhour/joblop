import { parseEmployerContractEnvelope } from "@rwos/shared";
import {
  resolveClientOrganizationId,
  sessionBoundary,
  sessionFailure
} from "../sessionBoundary";

// GET the organization's current governed contract (or null if none exists yet).
// The rate card is read-only here; the employer never supplies rates.
export async function GET() {
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
    `/organizations/${encodeURIComponent(context.organizationId)}/contract`,
    "GET",
    token
  );
  if (result.status !== "ok") return sessionFailure(result.status);
  try {
    return Response.json(
      { contract: parseEmployerContractEnvelope(result.payload) },
      { headers: privateHeaders }
    );
  } catch {
    return sessionFailure("error");
  }
}

const privateHeaders = { "cache-control": "private, no-store" };
