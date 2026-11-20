// The deployment tier is baked in at build time (Dockerfile: NEXT_PUBLIC_RWOS_DEPLOYMENT_TIER, default
// "production"; staging images pass "staging"; local dev leaves it unset). The "SYNTHETIC / TEST
// PAYROLL" badge is for local and staging only.
// An unset tier in a release build (NODE_ENV=production, as in deploy/Dockerfile on Render) counts
// as production too.
export function showPayrollTestBadge(
  tier: string | undefined = process.env.NEXT_PUBLIC_RWOS_DEPLOYMENT_TIER,
  nodeEnv: string | undefined = process.env.NODE_ENV
): boolean {
  if (tier) return tier !== "production";
  return nodeEnv !== "production";
}
