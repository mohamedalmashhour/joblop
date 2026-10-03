import { sessionBoundary, isSameOriginMutation, sessionFailure } from "../sessionBoundary";

// The worker's own disputes. User(worker)-scoped server-side.
export async function GET() {
  const { gateway, token } = await sessionBoundary();
  if (!token) return sessionFailure("denied");
  const result = await gateway.request("/worker/disputes", "GET", token);
  if (result.status !== "ok") return sessionFailure(result.status);
  return Response.json(result.payload, { headers: { "cache-control": "private, no-store" } });
}

// Raise a dispute on one of the worker's own payouts (by its payroll calculation). Only the
// payrollCalculationId, category and reason are forwarded.
export async function POST(request: Request) {
  if (!isSameOriginMutation(request)) return sessionFailure("denied");
  const { gateway, token } = await sessionBoundary();
  if (!token) return sessionFailure("denied");
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const payrollCalculationId = typeof body?.payrollCalculationId === "string" ? body.payrollCalculationId : null;
  const category = typeof body?.category === "string" ? body.category : null;
  const reason = typeof body?.reason === "string" ? body.reason : null;
  if (!payrollCalculationId || !category || !reason) {
    return Response.json(
      { status: "invalid", message: "A payout, a category and a reason are required." },
      { status: 400, headers: { "cache-control": "private, no-store" } }
    );
  }
  const result = await gateway.request("/worker/disputes", "POST", token, { payrollCalculationId, category, reason });
  if (result.status !== "ok") return sessionFailure(result.status);
  return Response.json(result.payload, { status: 201, headers: { "cache-control": "private, no-store" } });
}
