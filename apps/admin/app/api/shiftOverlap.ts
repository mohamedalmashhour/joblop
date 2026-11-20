import type { FrontendSessionResult } from "@rwos/auth";

// Staff cannot give a worker two shifts at the same time either. When the API refuses an offer or
// an assignment for that reason (409 RWOS_SHIFT_OVERLAP), forward its body as-is: it names the shift
// the worker already holds, in EN / FR / AR. Any other result returns null (handled as before).
export function forwardShiftOverlap(result: FrontendSessionResult): Response | null {
  if (result.status !== "stale" || !result.conflict) return null;
  return Response.json(
    { status: "shift_overlap", ...result.conflict },
    { status: 409, headers: { "cache-control": "private, no-store" } }
  );
}
