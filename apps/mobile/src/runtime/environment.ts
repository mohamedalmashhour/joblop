export function isProductionWorkerBuild(
  env: Readonly<Record<string, string | undefined>> = process.env
) {
  return env.EXPO_PUBLIC_RWOS_ENV === "production";
}
