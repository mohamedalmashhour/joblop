import { parseAdminDispatchReview } from "../dispatchBoundary";
import { sessionBoundary, sessionFailure } from "../../sessionBoundary";

// Read-only index of all dispatch reviews for the admin landing. Proxies the platform
// list; each record is parsed defensively so one malformed row can't 500 the list.
export async function GET() {
  const { gateway, token } = await sessionBoundary();
  const result = await gateway.request("/platform/dispatches", "GET", token);
  if (result.status !== "ok") return sessionFailure(result.status);
  try {
    const payload = result.payload as { dispatches?: unknown };
    const raw = Array.isArray(payload.dispatches) ? payload.dispatches : [];
    const dispatches = raw
      .map((d) => {
        try {
          return parseAdminDispatchReview(d);
        } catch {
          return null;
        }
      })
      .filter((d): d is NonNullable<typeof d> => d !== null);
    return Response.json({ dispatches }, { headers: { "cache-control": "private, no-store" } });
  } catch {
    return sessionFailure("error");
  }
}
