export const dynamic = "force-dynamic";

export function GET() {
  return Response.json(
    {
      ok: true,
      service: "resident-workforce-os-crm",
      check: "liveness"
    },
    { headers: { "cache-control": "no-store" } }
  );
}
