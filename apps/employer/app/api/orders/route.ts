import {
  isSameOriginMutation,
  resolveClientOrganizationId,
  sessionBoundary,
  sessionFailure
} from "../sessionBoundary";

const privateHeaders = { "cache-control": "private, no-store" };

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
    `/organizations/${encodeURIComponent(context.organizationId)}/orders`,
    "GET",
    token
  );
  if (result.status !== "ok") return sessionFailure(result.status);
  return Response.json(result.payload, { headers: privateHeaders });
}

// Create a multi-role order. The employer-supplied shape (shared worksite + time window + role lines)
// is forwarded; the API re-validates every field and prices nothing here.
export async function POST(request: Request) {
  if (!isSameOriginMutation(request)) return sessionFailure("denied");
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || !Array.isArray(body.lines) || body.lines.length === 0) {
    return Response.json(
      { status: "invalid", message: "An order needs at least one role line." },
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
    `/organizations/${encodeURIComponent(context.organizationId)}/orders`,
    "POST",
    token,
    body
  );
  if (result.status !== "ok") return sessionFailure(result.status);
  return Response.json(result.payload, { status: 201, headers: privateHeaders });
}
