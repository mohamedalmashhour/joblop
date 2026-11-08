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
  // Read (never set in production) by the expo-notifications library to detect a Jest test run.
  // It names no secret and carries no configuration of ours.
  "JEST_WORKER_ID",
  "EXPO_PUBLIC_RWOS_ENV",
  "EXPO_PUBLIC_RWOS_DEMO_MODE",
  "EXPO_PUBLIC_RWOS_DEPLOYMENT_TIER"
]);
const buildTimePublic = new Set([
  "NODE_ENV",
  "EXPO_PUBLIC_API_BASE_URL",
  "EXPO_PUBLIC_API_ORIGIN",
  "EXPO_PUBLIC_RWOS_API_ORIGIN",
  // Public address of the employer website, opened by the phone app's "For employers" button.
  "EXPO_PUBLIC_RWOS_EMPLOYER_ORIGIN",
  "NEXT_PUBLIC_RWOS_ENV",
  "NEXT_PUBLIC_RWOS_DEPLOYMENT_TIER",
  // NEXT_PUBLIC_ is inlined into the client bundle at build; the active-country selector is a
  // non-secret public value (country code only), consistent with the country-profile seam.
  "NEXT_PUBLIC_RWOS_COUNTRY"
]);
const serverOnlySecret = new Set(["SESSION_SECRET"]);
// Server-side, non-secret configuration read via process.env in server code (route handlers,
// server components, seed/worker scripts). These never carry credential material and are not
// inlined into any client bundle (they are not NEXT_PUBLIC_/EXPO_PUBLIC_). Secret-shaped siblings
// (e.g. *_API_KEY) are caught by the prohibited regex below, which runs before this set is read.
const serverOnlyNonSecret = new Set([
  // Set to "true" by Render on every service; read server-side to keep Stripe TEST checkout off live.
  "RENDER",
  // External job-source (Adzuna) non-secret config — the paired APP_KEY is prohibited below.
  "ADZUNA_APP_ID",
  "ADZUNA_COUNTRY",
  "JOBSCANNER_SCAN_INTERVAL_MIN",
  "JOBSCANNER_SCAN_QUERIES",
  "JOBSCANNER_SEED_FORCE",
  "JOBSCANNER_SEED_MAX_DAYS_OLD",
  "JOBSCANNER_SEED_RESULTS_PER_PAGE",
  "JOBSCANNER_SEED_WHERE",
  // Control-room governance flags / revocation list (opaque JTI identifiers, not secrets).
  "CONTROL_ROOM_MINT_REQUIRE_FINANCE",
  "CONTROL_ROOM_REVOKED_JTIS",
  // CV builder feature config (model name + purchase gate).
  "CONTACT_ADMIN_EMAIL",
  "CONTACT_ADMIN_PHONE",
  "CONTACT_AI_MODEL",
  "CONTACT_AI_MONTHLY_LIMIT",
  "CV_MODEL",
  "CV_PRO_PURCHASE_ENABLED",
  // Advisory document-review model name (not a credential).
  "DOC_REVIEW_MODEL",
  // Transactional email sender address (public from-line, not a credential).
  "EMAIL_FROM",
  // Employer fixed plans feature gate (server-only boolean; "enabled" turns plans on, default off).
  "EMPLOYER_PLANS_ENABLED",
  // Google integrations: non-secret public identifiers and server-side feature gates. The OAuth
  // client id is a public identifier; the paired client secret / token encryption key and the
  // Maps API key are prohibited below.
  "GOOGLE_CALENDAR_SYNC_ENABLED",
  "GOOGLE_OAUTH_CLIENT_ID",
  "GOOGLE_OAUTH_ENABLED",
  "GOOGLE_SITE_VERIFICATION",
  "GOOGLE_TAG_ID",
  // Test-mode gates for the money path (server-only booleans).
  "INVOICE_TEST_MODE_ENABLED",
  "PAYOUT_TEST_MODE_ENABLED",
  "WORKER_PAYOUT_PROGRESSION_INTERVAL_MIN"
]);
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
    /(?:^|_)(?:TOKEN|SECRET|PASSWORD|CREDENTIAL|PRIVATE_KEY|SECRET_KEY|KEY_SECRET|API_KEY|APP_KEY|ENC_KEY|DATABASE_URL|REDIS_URL|EMAIL)$/.test(
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
  if (serverOnlyNonSecret.has(name)) return "server-only-non-secret";
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
