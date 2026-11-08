// The deployment tier is baked into the bundle at build time (Dockerfile: NEXT_PUBLIC_RWOS_DEPLOYMENT_TIER,
// default "production"; staging images pass "staging"; local dev leaves it unset). Test-only wording
// (test pay figures, Stripe TEST card hints) must never reach real users on the production tier.
export function isProductionTier(tier: string | undefined = process.env.NEXT_PUBLIC_RWOS_DEPLOYMENT_TIER): boolean {
  return tier === "production";
}
