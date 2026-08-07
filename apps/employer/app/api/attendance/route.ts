import { parseEmployerAttendanceList } from "@rwos/shared";
import {
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
    `/organizations/${encodeURIComponent(context.organizationId)}/attendance`,
    "GET",
    token
  );
  if (result.status !== "ok") return sessionFailure(result.status);
  try {
    return Response.json(
      { attendanceRecords: parseEmployerAttendanceList(result.payload) },
      { headers: { "cache-control": "private, no-store" } }
    );
  } catch {
    return sessionFailure("error");
  }
}
