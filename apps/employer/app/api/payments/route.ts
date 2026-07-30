import { resolveClientOrganizationId, sessionBoundary, sessionFailure } from "../sessionBoundary";
import { parseEmployerPayments } from "./paymentBoundary";

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
    `/organizations/${encodeURIComponent(context.organizationId)}/payments`,
    "GET",
    token
  );
  if (result.status !== "ok") return sessionFailure(result.status);
  try {
    return Response.json(
      { payments: parseEmployerPayments(result.payload) },
      { headers: privateHeaders }
    );
  } catch {
    return sessionFailure("error");
  }
}

const privateHeaders = { "cache-control": "private, no-store" };
