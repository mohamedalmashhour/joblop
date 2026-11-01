import { sessionBoundary, sessionFailure } from "../../sessionBoundary";

// Admin: search workers/employers by name/email for the "selected recipients" picker.
export async function GET(request: Request) {
  const { gateway, token } = await sessionBoundary();
  if (!token) return sessionFailure("denied");
  const url = new URL(request.url);
  const q = url.searchParams.get("q") ?? "";
  const kind = url.searchParams.get("kind") ?? "all";
  const result = await gateway.request(
    `/platform/greetings/recipients?q=${encodeURIComponent(q)}&kind=${encodeURIComponent(kind)}`,
    "GET",
    token
  );
  if (result.status !== "ok") return sessionFailure(result.status);
  return Response.json(result.payload, { headers: { "cache-control": "private, no-store" } });
}
