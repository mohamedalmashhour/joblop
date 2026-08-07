import { parseEmployerTimesheetDto } from "@rwos/shared";
import {
  isSameOriginMutation,
  resolveClientOrganizationId,
  sessionBoundary,
  sessionFailure
} from "../../../sessionBoundary";

export async function POST(
  request: Request,
  context: Readonly<{ params: Promise<{ timesheetId: string }> }>
) {
  if (!isSameOriginMutation(request)) return sessionFailure("denied");
  const body = await request.json().catch(() => null);
  const expectedVersion = readExpectedVersion(body);
  if (expectedVersion === null) {
    return Response.json(
      { status: "invalid", message: "A current timesheet version is required." },
      { status: 400, headers: privateHeaders }
    );
  }
  const { timesheetId } = await context.params;
  const { gateway, organizationId, token } = await sessionBoundary();
  const organization = await resolveClientOrganizationId(gateway, token, organizationId);
  if (organization.status === "context_required") return sessionFailure("stale");
  if (organization.status !== "ok") return sessionFailure(organization.status);
  const result = await gateway.request(
    `/organizations/${encodeURIComponent(organization.organizationId)}/timesheets/${encodeURIComponent(timesheetId)}/confirm`,
    "POST",
    token,
    { expectedVersion }
  );
  if (result.status !== "ok") return sessionFailure(result.status);
  try {
    return Response.json(
      { timesheet: parseEmployerTimesheetDto((result.payload as { timesheet?: unknown })?.timesheet) },
      { headers: privateHeaders }
    );
  } catch {
    return sessionFailure("error");
  }
}

function readExpectedVersion(input: unknown) {
  if (typeof input !== "object" || input === null || !("expectedVersion" in input)) return null;
  const version = (input as { expectedVersion?: unknown }).expectedVersion;
  return Number.isInteger(version) && (version as number) > 0 ? (version as number) : null;
}

const privateHeaders = { "cache-control": "private, no-store" };
