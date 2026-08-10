import { parseEmployerContractEnvelope } from "@rwos/shared";
import {
  isSameOriginMutation,
  resolveClientOrganizationId,
  sessionBoundary,
  sessionFailure
} from "../../sessionBoundary";

// The owner signs (accepts) the governed rate card. Security: the request body
// carries NO rates — this route forwards only the acknowledgment, so a price can
// never be set or altered client-side. CSRF is enforced as same-origin.
export async function POST(request: Request) {
  if (!isSameOriginMutation(request)) return sessionFailure("denied");

  const { gateway, organizationId, token } = await sessionBoundary();
  const context = await resolveClientOrganizationId(gateway, token, organizationId);
  if (context.status === "context_required") return sessionFailure("stale");
  if (context.status !== "ok") return sessionFailure(context.status);

  const result = await gateway.request(
    `/organizations/${encodeURIComponent(context.organizationId)}/contract/sign`,
    "POST",
    token,
    {}
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
