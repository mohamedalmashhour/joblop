import { createReadinessResponse } from "./readiness";

export const dynamic = "force-dynamic";

export function GET() {
  return createReadinessResponse(process.env);
}
