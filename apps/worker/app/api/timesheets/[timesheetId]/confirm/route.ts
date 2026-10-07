import { sessionBoundary, isSameOriginMutation, sessionFailure } from "../../../sessionBoundary";

// Worker timesheet confirmation. Version-guarded; the API enforces worker ownership + state machine.
export async function POST(request: Request, context: { params: Promise<{ timesheetId: string }> }) {
  if (!isSameOriginMutation(request)) return sessionFailure("denied");
  const { gateway, token } = await sessionBoundary();
  if (!token) return sessionFailure("denied");
  const { timesheetId } = await context.params;
  const body = await request.json().catch(() => ({}));
  const result = await gateway.request(`/worker/timesheets/${encodeURIComponent(timesheetId)}/confirm`, "POST", token, body);
  if (result.status !== "ok") return sessionFailure(result.status);
  return Response.json(result.payload, { headers: { "cache-control": "private, no-store" } });
}
