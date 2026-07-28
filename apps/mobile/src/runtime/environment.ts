export function isProductionWorkerBuild(
  env: Readonly<Record<string, string | undefined>> = process.env,
  developmentRuntime = typeof __DEV__ !== "undefined" && __DEV__
) {
  return !(developmentRuntime && env.EXPO_PUBLIC_RWOS_DEMO_MODE === "enabled");
}
