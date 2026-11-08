import { sessionBoundary, sessionFailure } from "../sessionBoundary";

// Staff calendar hub BFF: forwards only `from` / `to` (ISO dates) to the staff calendar hub feed
// (jobs, cancellations, disputes, payouts, pay runs and the "Today" list).
// Session-gated here; the API enforces HR or platform-admin authority. Read-only.
function isoParam(value: string | null): string | null {
  if (!value || value.length > 40 || Number.isNaN(Date.parse(value))) return null;
  return new Date(value).toISOString();
}

export async function GET(request: Request) {
  const { gateway, token } = await sessionBoundary();
  if (!token) return sessionFailure("denied");
  const url = new URL(request.url);
  const query = new URLSearchParams();
  const from = isoParam(url.searchParams.get("from"));
  const to = isoParam(url.searchParams.get("to"));
  if (from) query.set("from", from);
  if (to) query.set("to", to);
  const search = query.toString();
  const result = await gateway.request(
    `/platform/calendar-hub${search ? `?${search}` : ""}`,
    "GET",
    token
  );
  if (result.status !== "ok") return sessionFailure(result.status);
  return Response.json(result.payload, { headers: { "cache-control": "private, no-store" } });
}
