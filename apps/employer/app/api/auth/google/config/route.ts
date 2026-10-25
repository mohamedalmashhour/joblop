import { sessionBoundary } from "../../../sessionBoundary";

// Public: whether to show "Continue with Google" on the employer sign-in.
export async function GET() {
  const { gateway } = await sessionBoundary();
  const config = await gateway.googleConfig();
  return Response.json(config, { headers: { "cache-control": "private, no-store" } });
}
