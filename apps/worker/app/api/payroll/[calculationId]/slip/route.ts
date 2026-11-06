import { sessionBoundary, sessionFailure } from "../../../sessionBoundary";

// One of the worker's own pay slips (own records only).
export async function GET(_request: Request, { params }: { params: Promise<{ calculationId: string }> }) {
  const { gateway, token } = await sessionBoundary();
  if (!token) return sessionFailure("denied");
  const { calculationId } = await params;
  const result = await gateway.request(`/worker/payroll/statement/${encodeURIComponent(calculationId)}/slip`, "GET", token);
  if (result.status !== "ok") return sessionFailure(result.status);
  return Response.json(result.payload, { headers: { "cache-control": "private, no-store" } });
}
