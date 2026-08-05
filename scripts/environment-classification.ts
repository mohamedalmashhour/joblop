export const environmentClasses = [
  "public-safe",
  "build-time-public",
  "server-only-non-secret",
  "runtime-server-only",
  "server-only-secret",
  "prohibited-from-bundles-and-logs"
] as const;

export type EnvironmentClass = (typeof environmentClasses)[number];

const publicSafe = new Set([
  "EXPO_PUBLIC_RWOS_ENV",
  "EXPO_PUBLIC_RWOS_DEMO_MODE",
  "EXPO_PUBLIC_RWOS_DEPLOYMENT_TIER"
]);
const buildTimePublic = new Set([
  "NODE_ENV",
  "EXPO_PUBLIC_API_BASE_URL",
  "EXPO_PUBLIC_API_ORIGIN",
  "EXPO_PUBLIC_RWOS_API_ORIGIN",
  "NEXT_PUBLIC_RWOS_ENV",
  "NEXT_PUBLIC_RWOS_DEPLOYMENT_TIER"
]);
const serverOnlySecret = new Set(["SESSION_SECRET"]);
const allowedServerPrefixes = [
  "API_",
  "ASSIGNMENT_",
  "AUTH_",
  "CANDIDATE_",
  "EMPLOYER_",
  "INTERNAL_",
  "MONITORING_",
  "OFFER_",
  "PAGING_",
  "PRIVACY_",
  "QA_RESET_",
  "RWOS_",
  "SECRET_MANAGER_",
  "STRIPE_",
  "TERMS_"
] as const;

export function classifyEnvironmentName(name: string): EnvironmentClass | null {
  if (publicSafe.has(name)) return "public-safe";
  if (buildTimePublic.has(name)) return "build-time-public";
  if (serverOnlySecret.has(name)) return "server-only-secret";
  if (
    /(?:^|_)(?:TOKEN|SECRET|PASSWORD|CREDENTIAL|PRIVATE_KEY|SECRET_KEY|KEY_SECRET|DATABASE_URL|REDIS_URL|EMAIL)$/.test(
      name
    ) ||
    /(?:SERVICE_ACCOUNT|SERVICE_IDENTITY|OPERATOR_IDENTITY|GOOGLE_APPLICATION_CREDENTIALS)/.test(
      name
    )
  ) {
    return "prohibited-from-bundles-and-logs";
  }
  if (/(?:^|_)(?:ORIGIN|URL|AUDIENCE|ENDPOINT|HEALTHCHECK_URL|SECRET_REFERENCE)$/.test(name)) {
    return "runtime-server-only";
  }
  if (
    name === "PORT" ||
    name === "DATABASE_URL" ||
    name === "REDIS_URL" ||
    allowedServerPrefixes.some((prefix) => name.startsWith(prefix))
  ) {
    return "server-only-non-secret";
  }
  return null;
}

export function environmentNamesIn(content: string) {
  const names = new Set<string>();
  const patterns = [
    /\b(?:process\.)?env\.([A-Z][A-Z0-9_]*)\b/g,
    /\b(?:process\.)?env\[\s*["']([A-Z][A-Z0-9_]*)["']\s*\]/g,
    /^\s*#?\s*([A-Z][A-Z0-9_]*)\s*=/gm,
    /\b(EXPO_PUBLIC_[A-Z][A-Z0-9_]*)\b/g
  ];
  for (const pattern of patterns) {
    for (const match of content.matchAll(pattern)) {
      if (match[1]) names.add(match[1]);
    }
  }
  return [...names].sort();
}

export function validateEnvironmentInventory(
  artifacts: readonly { path: string; content: string }[]
) {
  const classified = new Map<string, EnvironmentClass>();
  const issues: string[] = [];
  for (const artifact of artifacts) {
    for (const name of environmentNamesIn(artifact.content)) {
      const classification = classifyEnvironmentName(name);
      if (!classification) {
        issues.push(`${artifact.path}: unclassified environment variable ${name}`);
      } else {
        classified.set(name, classification);
      }
    }
  }
  return { classified, issues: [...new Set(issues)] };
}

export function environmentClassMayEnterPublicBundle(classification: EnvironmentClass) {
  return classification === "public-safe" || classification === "build-time-public";
}
