export const dynamic = "force-dynamic";

export function GET() {
  return Response.json(
    {
      ok: true,
      service: "resident-workforce-os-employer",
      check: "liveness"
    },
    { headers: { "cache-control": "no-store" } }
  );
}
