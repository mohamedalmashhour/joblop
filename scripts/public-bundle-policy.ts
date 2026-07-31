import {
  classifyEnvironmentName,
  environmentClassMayEnterPublicBundle,
  environmentNamesIn
} from "./environment-classification";

export type PublicArtifact = Readonly<{ path: string; content: string }>;

const forbiddenPublicEnvironment =
  /EXPO_PUBLIC_[A-Z0-9_]*(?:TOKEN|SECRET|CREDENTIAL|DATABASE|REDIS|RESET|SERVICE_ACCOUNT|PRIVATE_KEY)/;
const forbiddenServerMaterial = [
  /AIza[0-9A-Za-z_-]{35}/,
  /GOOGLE_APPLICATION_CREDENTIALS/,
  /metadata\.google\.internal/,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /QA_RESET_(?:BROWSER_E2E|IOS_E2E|ANDROID_E2E|MANUAL_QA|MONITORING)_(?:APP_CREDENTIAL|SERVICE_ACCOUNT|OPERATOR_IDENTITY)/,
  /AUTH_LIMITER_(?:SERVICE_TOKEN|REDIS_URL)/,
  /CANDIDATE_ADAPTER_SERVICE_TOKEN/,
  /OFFER_DELIVERY_ADAPTER_SERVICE_TOKEN/,
  /DATABASE_URL/,
  /REDIS_URL/,
  /AUTH_RATE_LIMITER_KEY_SECRET/,
  /CANDIDATE_SOURCE_TOKEN/,
  /OFFER_DELIVERY_TOKEN/,
  /x-rwos-app-authorization/i,
  /(?:identity|access)[-_ ]?token.{0,20}(?:eyJ|ya29\.)/i,
  /projects\/[^/\s]+\/locations\/[^/\s]+\/secrets\//i,
  /X-RWOS-Caller-Identity-Token/i,
  /X-Serverless-Authorization/i
] as const;
const forbiddenClientImports = [
  /@rwos\/service-auth/,
  /@rwos\/database/,
  /@rwos\/config/,
  /google-auth-library/,
  /apps\/(?:qa-reset|auth-limiter|candidate-source|offer-delivery)/,
  /packages\/(?:service-auth|database)/
] as const;

export function findPublicCredentialLeaks(artifacts: readonly PublicArtifact[]) {
  const issues: string[] = [];
  for (const artifact of artifacts) {
    if (forbiddenPublicEnvironment.test(artifact.content)) {
      issues.push(`${artifact.path}: forbidden EXPO_PUBLIC authentication material`);
    }
    if (isPublicArtifact(artifact)) {
      for (const name of environmentNamesIn(artifact.content)) {
        const classification = classifyEnvironmentName(name);
        if (!classification) {
          issues.push(`${artifact.path}: unclassified public environment variable ${name}`);
        } else if (!environmentClassMayEnterPublicBundle(classification)) {
          issues.push(`${artifact.path}: ${name} is ${classification}`);
        }
      }
      for (const pattern of forbiddenServerMaterial) {
        if (pattern.test(artifact.content)) {
          issues.push(`${artifact.path}: forbidden server authentication material`);
        }
      }
    }
    if (isClientSource(artifact)) {
      for (const pattern of forbiddenClientImports) {
        if (pattern.test(artifact.content)) {
          issues.push(`${artifact.path}: forbidden server-only authentication import`);
        }
      }
    }
  }
  return [...new Set(issues)];
}

function isClientSource(artifact: PublicArtifact) {
  return (
    (artifact.path.startsWith("apps/mobile/") &&
      !/^apps\/mobile\/server(?:\.d)?\.m?js$/.test(artifact.path)) ||
    /^\s*["']use client["'];/m.test(artifact.content)
  );
}

function isPublicArtifact(artifact: PublicArtifact) {
  return (
    isClientSource(artifact) ||
    artifact.path.includes("/dist/") ||
    artifact.path.includes("/.next/static/") ||
    (/\/\.next\//.test(artifact.path) && /manifest/i.test(artifact.path))
  );
}
