import { parseEmployerRequestContext } from "../jobRequestBoundary";
import {
  resolveClientOrganizationId,
  sessionBoundary,
  sessionFailure
} from "../../sessionBoundary";

export async function GET(request: Request) {
  const { gateway, organizationId, token } = await sessionBoundary();
  const context = await resolveClientOrganizationId(gateway, token, organizationId);
  if (context.status === "context_required") {
    return Response.json(
      { status: "organization_required", organizations: context.organizations },
      { status: 409, headers: privateHeaders }
    );
  }
  if (context.status !== "ok") return sessionFailure(context.status);

  const residenceId = new URL(request.url).searchParams.get("residenceId");
  const organizationQuery = `organizationId=${encodeURIComponent(context.organizationId)}`;
  const [residences, workGroups, roleDefinitions, departments] = await Promise.all([
    gateway.request(
      `/organizations/${encodeURIComponent(context.organizationId)}/residences?status=active`,
      "GET",
      token
    ),
    gateway.request(`/work-groups?${organizationQuery}`, "GET", token),
    gateway.request(`/role-definitions?${organizationQuery}`, "GET", token),
    residenceId
      ? gateway.request(
          `/organizations/${encodeURIComponent(context.organizationId)}/residences/${encodeURIComponent(residenceId)}/departments?status=active`,
          "GET",
          token
        )
      : Promise.resolve({ status: "ok", payload: { departments: [] } } as const)
  ]);

  const results = [residences, workGroups, roleDefinitions, departments];
  const failure = results.find((result) => result.status !== "ok");
  if (failure) return sessionFailure(failure.status);

  try {
    return Response.json(
      parseEmployerRequestContext({
        residences: residences.status === "ok" ? residences.payload : null,
        workGroups: workGroups.status === "ok" ? workGroups.payload : null,
        roleDefinitions: roleDefinitions.status === "ok" ? roleDefinitions.payload : null,
        departments: departments.status === "ok" ? departments.payload : null
      }),
      { headers: privateHeaders }
    );
  } catch {
    return sessionFailure("error");
  }
}

const privateHeaders = { "cache-control": "private, no-store" };
