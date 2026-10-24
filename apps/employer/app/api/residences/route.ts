import { parseEmployerResidenceList } from "@rwos/shared";
import {
  isSameOriginMutation,
  resolveClientOrganizationId,
  sessionBoundary,
  sessionFailure
} from "../sessionBoundary";

export async function GET() {
  const { gateway, organizationId, token } = await sessionBoundary();
  const context = await resolveClientOrganizationId(gateway, token, organizationId);
  if (context.status === "context_required") {
    return Response.json(
      { status: "organization_required", organizations: context.organizations },
      { status: 409, headers: { "cache-control": "private, no-store" } }
    );
  }
  if (context.status !== "ok") return sessionFailure(context.status);
  const result = await gateway.request(
    `/organizations/${encodeURIComponent(context.organizationId)}/residences`,
    "GET",
    token
  );
  if (result.status !== "ok") return sessionFailure(result.status);
  try {
    return Response.json(
      { residences: parseEmployerResidenceList(result.payload) },
      { headers: { "cache-control": "private, no-store" } }
    );
  } catch {
    return sessionFailure("error");
  }
}

// Round 2c: self-serve residence creation (onboarding). Reuses POST /organizations/:id/residences.
export async function POST(request: Request) {
  if (!isSameOriginMutation(request)) return sessionFailure("denied");
  const input = (await request.json().catch(() => null)) as { name?: unknown; province?: unknown; city?: unknown } | null;
  const name = typeof input?.name === "string" ? input.name.trim() : "";
  const province = typeof input?.province === "string" ? input.province.trim() : "";
  const city = typeof input?.city === "string" ? input.city.trim() : "";
  if (!name || !province || !city || name.length > 200) return sessionFailure("error");
  const { gateway, organizationId, token } = await sessionBoundary();
  const context = await resolveClientOrganizationId(gateway, token, organizationId);
  if (context.status === "context_required") {
    return Response.json(
      { status: "organization_required", organizations: context.organizations },
      { status: 409, headers: { "cache-control": "private, no-store" } }
    );
  }
  if (context.status !== "ok") return sessionFailure(context.status);
  // The residence-create API accepts the worksite jurisdiction as `region` + `country` (it ignores
  // a "province" field). The onboarding province selector carries the Canadian region code
  // (QC, ON, …); forward it as `region` and set the country so the worksite is created WITH a
  // jurisdiction instead of none. NOTE: the payroll jurisdiction resolver currently reads the
  // separate `province` column, so a worksite created here still needs the region/province column
  // reconciliation (see the region-vs-province finding) before payroll can resolve it.
  const result = await gateway.request(
    `/organizations/${encodeURIComponent(context.organizationId)}/residences`,
    "POST",
    token,
    {
      name,
      city,
      region: province,
      country: "CA",
      idempotencyKey: `res-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
    }
  );
  if (result.status !== "ok") return sessionFailure(result.status);
  const residence = (result.payload as { residence?: { id?: string; name?: string } }).residence;
  return Response.json({ residence }, { headers: { "cache-control": "private, no-store" } });
}
