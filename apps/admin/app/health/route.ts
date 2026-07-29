export const dynamic = "force-dynamic";

export function GET() {
  return Response.json(
    {
      ok: true,
      service: "resident-workforce-os-admin",
      check: "liveness"
    },
    { headers: { "cache-control": "no-store" } }
  );
}
