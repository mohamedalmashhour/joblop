// The deployment tier is baked in at build time (Dockerfile: NEXT_PUBLIC_RWOS_DEPLOYMENT_TIER, default
// "production"; staging images pass "staging"; local dev leaves it unset). The "SYNTHETIC / TEST
// PAYROLL" badge is for local and staging only.
export function showPayrollTestBadge(tier: string | undefined = process.env.NEXT_PUBLIC_RWOS_DEPLOYMENT_TIER): boolean {
  return tier !== "production";
}
