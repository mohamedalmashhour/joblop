import {
  isSameOriginMutation,
  resolveClientOrganizationId,
  sessionBoundary,
  sessionFailure
} from "../../../sessionBoundary";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Round 2c: self-serve department creation under a residence (onboarding).
// Reuses POST /organizations/:id/residences/:residenceId/departments.
export async function POST(
  request: Request,
  context: Readonly<{ params: Promise<{ residenceId: string }> }>
) {
  if (!isSameOriginMutation(request)) return sessionFailure("denied");
  const { residenceId } = await context.params;
  if (!UUID.test(residenceId)) return sessionFailure("error");
  const input = (await request.json().catch(() => null)) as { name?: unknown } | null;
  const name = typeof input?.name === "string" ? input.name.trim() : "";
  if (!name || name.length > 200) return sessionFailure("error");

  const { gateway, organizationId, token } = await sessionBoundary();
  const orgContext = await resolveClientOrganizationId(gateway, token, organizationId);
  if (orgContext.status === "context_required") {
    return Response.json(
      { status: "organization_required", organizations: orgContext.organizations },
      { status: 409, headers: { "cache-control": "private, no-store" } }
    );
  }
  if (orgContext.status !== "ok") return sessionFailure(orgContext.status);
  const result = await gateway.request(
    `/organizations/${encodeURIComponent(orgContext.organizationId)}/residences/${encodeURIComponent(residenceId)}/departments`,
    "POST",
    token,
    { name, idempotencyKey: `dep-${Date.now()}-${Math.random().toString(36).slice(2, 10)}` }
  );
  if (result.status !== "ok") return sessionFailure(result.status);
  const department = (result.payload as { department?: { id?: string; name?: string } }).department;
  return Response.json({ department }, { headers: { "cache-control": "private, no-store" } });
}
