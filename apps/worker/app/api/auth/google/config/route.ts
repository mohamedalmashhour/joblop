import { sessionBoundary } from "../../../sessionBoundary";

// Public: whether to show "Continue with Google" (and whether calendar sync is available).
export async function GET() {
  const { gateway } = await sessionBoundary();
  const config = await gateway.googleConfig();
  return Response.json(config, { headers: { "cache-control": "private, no-store" } });
}
