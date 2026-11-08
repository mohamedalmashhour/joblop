// The deployment tier is baked into the bundle at build time (Dockerfile: NEXT_PUBLIC_RWOS_DEPLOYMENT_TIER,
// default "production"; staging images pass "staging"; local dev leaves it unset). Test-only wording
// (test pay figures, Stripe TEST card hints) must never reach real users on the production tier.
// The live Render images are built from deploy/Dockerfile, which does not pass the tier, so an
// unset tier in a release build (NODE_ENV=production) also counts as production. Local `next dev`
// (NODE_ENV=development) and tests keep showing the test wording.
export function isProductionTier(
  tier: string | undefined = process.env.NEXT_PUBLIC_RWOS_DEPLOYMENT_TIER,
  nodeEnv: string | undefined = process.env.NODE_ENV
): boolean {
  if (tier) return tier === "production";
  return nodeEnv === "production";
}
