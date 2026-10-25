import { sessionBoundary, isSameOriginMutation, sessionFailure } from "../../sessionBoundary";

// Start a one-time 14-day free Worker Pro trial. Self-serve, no payment, no card. Same-origin only.
export async function POST(request: Request) {
  if (!isSameOriginMutation(request)) return sessionFailure("denied");
  const { gateway, token } = await sessionBoundary();
  if (!token) return sessionFailure("denied");
  const result = await gateway.request("/worker/cv/trial", "POST", token);
  if (result.status !== "ok") return sessionFailure(result.status);
  return Response.json(result.payload, { headers: { "cache-control": "private, no-store" } });
}
