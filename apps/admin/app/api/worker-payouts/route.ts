import { sessionBoundary, sessionFailure } from "../sessionBoundary";

// Staff list of worker payouts. Session-gated here; the API enforces payroll or platform authority.
export async function GET() {
  const { gateway, token } = await sessionBoundary();
  if (!token) return sessionFailure("denied");
  const result = await gateway.request("/platform/worker-payouts", "GET", token);
  if (result.status !== "ok") return sessionFailure(result.status);
  return Response.json(result.payload, { headers: { "cache-control": "private, no-store" } });
}
