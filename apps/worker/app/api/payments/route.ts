import { sessionBoundary, sessionFailure } from "../sessionBoundary";

// The worker's own payout ledger: To-pay (owed, waiting on the hold) and Paid (sent).
// Own records only; reading it never moves money.
export async function GET() {
  const { gateway, token } = await sessionBoundary();
  if (!token) return sessionFailure("denied");
  const result = await gateway.request("/worker/payouts", "GET", token);
  if (result.status !== "ok") return sessionFailure(result.status);
  return Response.json(result.payload, { headers: { "cache-control": "private, no-store" } });
}
