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
  const reason = readReason(body);
  if (expectedVersion === null || reason === null) {
    return Response.json(
      {
        status: "invalid",
        message: "A current timesheet version and a dispute reason are required."
      },
      { status: 400, headers: privateHeaders }
    );
  }
  const { timesheetId } = await context.params;
  const { gateway, organizationId, token } = await sessionBoundary();
  const organization = await resolveClientOrganizationId(gateway, token, organizationId);
  if (organization.status === "context_required") return sessionFailure("stale");
  if (organization.status !== "ok") return sessionFailure(organization.status);
  const result = await gateway.request(
    `/organizations/${encodeURIComponent(organization.organizationId)}/timesheets/${encodeURIComponent(timesheetId)}/dispute`,
    "POST",
    token,
    { expectedVersion, reason }
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

function readReason(input: unknown) {
  if (typeof input !== "object" || input === null || !("reason" in input)) return null;
  const reason = (input as { reason?: unknown }).reason;
  if (typeof reason !== "string") return null;
  const trimmed = reason.trim();
  return trimmed.length > 0 && trimmed.length <= 1000 ? trimmed : null;
}

const privateHeaders = { "cache-control": "private, no-store" };
