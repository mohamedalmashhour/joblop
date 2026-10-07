import { sessionBoundary, sessionFailure } from "../../sessionBoundary";

export async function GET(request: Request, context: { params: Promise<{ timesheetId: string }> }) {
  const { gateway, token } = await sessionBoundary();
  if (!token) return sessionFailure("denied");
  const { timesheetId } = await context.params;
  const result = await gateway.request(`/worker/timesheets/${encodeURIComponent(timesheetId)}`, "GET", token);
  if (result.status !== "ok") return sessionFailure(result.status);
  return Response.json(result.payload, { headers: { "cache-control": "private, no-store" } });
}
