export const approvedReleaseSha = "a31fa96f52247bb684032c6a8d3d379c098c2603";
export const browserConfirmation = "authorized-staging-browser-e2e";
export const nativeConfirmation = "authorized-staging-native-e2e";
export const resetNamespace = "rwos:qa-reset:staging:v1";
export const retentionDays = 30;

export const qaResetCallerAliases = [
  "browser-e2e",
  "ios-e2e",
  "android-e2e",
  "manual-qa",
  "monitoring"
] as const;
export type QaResetCallerAlias = (typeof qaResetCallerAliases)[number];
export type QaResetCaller = Readonly<{
  alias: QaResetCallerAlias;
  applicationCredential: string;
  serviceAccountEmail: string;
  operatorIdentity: string | null;
}>;

export type QaResetConfig = Readonly<{
  port: number;
  environment: "staging";
  persistenceMode: "postgres";
  authMode: "dual-required" | "iam-application";
  audience: string;
  callers: Readonly<Record<QaResetCallerAlias, QaResetCaller>>;
  releaseSha: string;
  projectId: string;
  clusterId: string;
  databaseId: string;
  authorityId: string;
  tenantAId: string;
  tenantBId: string;
  workGroupId: string;
  roleDefinitionId: string;
  organizationOwnerAccessRoleId: string;
  namespace: typeof resetNamespace;
  manifestId: string;
  manifestChecksum: string;
  manifestCreatedAt: Date;
  manifestExpiresAt: Date;
  dryRunApprovalReference: string;
  prepareApprovalReference: string;
  cleanupApprovalReference: string;
  maximumRecordsPerEntity: number;
}>;

export function readQaResetConfig(
  env: NodeJS.ProcessEnv = process.env,
  now = new Date()
): QaResetConfig {
  if (env.RWOS_ENV !== "staging") {
    throw new Error("QA_RESET_STAGING_ONLY");
  }
  if (env.QA_RESET_PERSISTENCE_MODE !== "postgres") {
    throw new Error("QA_RESET_POSTGRES_REQUIRED");
  }
  const releaseSha = required(env.QA_RESET_RELEASE_SHA, "RELEASE_SHA");
  if (releaseSha !== approvedReleaseSha) throw new Error("QA_RESET_RELEASE_MISMATCH");
  const manifestCreatedAt = timestamp(env.QA_RESET_MANIFEST_CREATED_AT, "MANIFEST_CREATED_AT");
  const manifestExpiresAt = timestamp(env.QA_RESET_MANIFEST_EXPIRES_AT, "MANIFEST_EXPIRES_AT");
  if (
    manifestCreatedAt > now ||
    manifestExpiresAt <= now ||
    manifestExpiresAt.getTime() - manifestCreatedAt.getTime() > retentionDays * 86_400_000
  ) {
    throw new Error("QA_RESET_MANIFEST_TIME_INVALID");
  }
  const tenantAId = immutableUuid(env.QA_RESET_TENANT_A_ID, "TENANT_A_ID");
  const tenantBId = immutableUuid(env.QA_RESET_TENANT_B_ID, "TENANT_B_ID");
  if (tenantAId === tenantBId) throw new Error("QA_RESET_TENANTS_MUST_DIFFER");
  const namespace = required(env.QA_RESET_NAMESPACE, "NAMESPACE");
  if (namespace !== resetNamespace) throw new Error("QA_RESET_NAMESPACE_INVALID");

  const authMode = required(env.QA_RESET_AUTH_MODE, "AUTH_MODE");
  if (authMode !== "dual-required" && authMode !== "iam-application") {
    throw new Error("QA_RESET_AUTH_MODE_INVALID");
  }
  const audience = cloudRunAudience(env.QA_RESET_AUDIENCE);
  const callers = Object.fromEntries(
    qaResetCallerAliases.map((alias) => {
      const prefix = alias.replaceAll("-", "_").toUpperCase();
      return [
        alias,
        {
          alias,
          applicationCredential: secret(
            env[`QA_RESET_${prefix}_APP_CREDENTIAL`],
            `${prefix}_APP_CREDENTIAL`
          ),
          serviceAccountEmail: serviceAccount(
            env[`QA_RESET_${prefix}_SERVICE_ACCOUNT`],
            `${prefix}_SERVICE_ACCOUNT`
          ),
          operatorIdentity:
            alias === "monitoring"
              ? null
              : immutableId(
                  env[`QA_RESET_${prefix}_OPERATOR_IDENTITY`],
                  `${prefix}_OPERATOR_IDENTITY`
                )
        }
      ];
    })
  ) as unknown as Readonly<Record<QaResetCallerAlias, QaResetCaller>>;
  for (const field of [
    "applicationCredential",
    "serviceAccountEmail",
    "operatorIdentity"
  ] as const) {
    const values = Object.values(callers)
      .map((caller) => caller[field])
      .filter((value): value is string => value !== null);
    if (new Set(values).size !== values.length) {
      throw new Error("QA_RESET_CALLER_IDENTITIES_MUST_DIFFER");
    }
  }

  return {
    port: integer(env.PORT ?? "8080", 1, 65_535, "PORT"),
    environment: env.RWOS_ENV,
    persistenceMode: env.QA_RESET_PERSISTENCE_MODE,
    authMode,
    audience,
    callers,
    releaseSha,
    projectId: immutableId(env.QA_RESET_PROJECT_ID, "PROJECT_ID"),
    clusterId: immutableId(env.QA_RESET_CLUSTER_ID, "CLUSTER_ID"),
    databaseId: immutableId(env.QA_RESET_DATABASE_ID, "DATABASE_ID"),
    authorityId: immutableId(env.QA_RESET_AUTHORITY_ID, "AUTHORITY_ID"),
    tenantAId,
    tenantBId,
    workGroupId: immutableUuid(env.QA_RESET_WORK_GROUP_ID, "WORK_GROUP_ID"),
    roleDefinitionId: immutableUuid(env.QA_RESET_ROLE_DEFINITION_ID, "ROLE_DEFINITION_ID"),
    organizationOwnerAccessRoleId: immutableUuid(
      env.QA_RESET_ORGANIZATION_OWNER_ACCESS_ROLE_ID,
      "ORGANIZATION_OWNER_ACCESS_ROLE_ID"
    ),
    namespace,
    manifestId: boundedId(env.QA_RESET_MANIFEST_ID, "MANIFEST_ID"),
    manifestChecksum: checksum(env.QA_RESET_MANIFEST_CHECKSUM),
    manifestCreatedAt,
    manifestExpiresAt,
    dryRunApprovalReference: immutableId(
      env.QA_RESET_DRY_RUN_APPROVAL_REFERENCE,
      "DRY_RUN_APPROVAL_REFERENCE"
    ),
    prepareApprovalReference: immutableId(
      env.QA_RESET_PREPARE_APPROVAL_REFERENCE,
      "PREPARE_APPROVAL_REFERENCE"
    ),
    cleanupApprovalReference: immutableId(
      env.QA_RESET_CLEANUP_APPROVAL_REFERENCE,
      "CLEANUP_APPROVAL_REFERENCE"
    ),
    maximumRecordsPerEntity: integer(
      env.QA_RESET_MAXIMUM_RECORDS_PER_ENTITY ?? "2",
      1,
      10,
      "MAXIMUM_RECORDS_PER_ENTITY"
    )
  };
}

function immutableUuid(value: string | undefined, key: string) {
  const result = required(value, key);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(result)) {
    throw new Error(`QA_RESET_${key}_INVALID`);
  }
  return result;
}

export function validateTargetIdentity(value: string) {
  return (
    value.length >= 8 &&
    value.length <= 200 &&
    /^[a-z0-9][a-z0-9._:/-]+$/i.test(value) &&
    value.includes("/") &&
    !/(?:^|[._:/-])(prod|production|unknown|placeholder|current|latest|default)(?:$|[._:/-])/i.test(
      value
    ) &&
    !value.includes("*")
  );
}

function immutableId(value: string | undefined, key: string) {
  const result = required(value, key);
  if (!validateTargetIdentity(result)) throw new Error(`QA_RESET_${key}_INVALID`);
  return result;
}

function boundedId(value: string | undefined, key: string) {
  const result = required(value, key);
  if (!/^[a-z0-9][a-z0-9._:-]{2,99}$/i.test(result) || result.includes("*")) {
    throw new Error(`QA_RESET_${key}_INVALID`);
  }
  return result;
}

function checksum(value: string | undefined) {
  const result = required(value, "MANIFEST_CHECKSUM");
  if (!/^[a-f0-9]{64}$/.test(result)) throw new Error("QA_RESET_MANIFEST_CHECKSUM_INVALID");
  return result;
}

function secret(value: string | undefined, key: string) {
  if (!value || value.length < 32 || value.length > 512) {
    throw new Error(`QA_RESET_${key}_REQUIRED`);
  }
  return value;
}

function serviceAccount(value: string | undefined, key: string) {
  const result = required(value, key);
  if (result.length > 254 || !/^[a-z0-9][a-z0-9._-]*@[a-z0-9][a-z0-9.-]*$/.test(result)) {
    throw new Error(`QA_RESET_${key}_INVALID`);
  }
  return result;
}

function cloudRunAudience(value: string | undefined) {
  const result = required(value, "AUDIENCE");
  let url: URL;
  try {
    url = new URL(result);
  } catch {
    throw new Error("QA_RESET_AUDIENCE_INVALID");
  }
  if (
    url.protocol !== "https:" ||
    url.pathname !== "/" ||
    url.search ||
    url.hash ||
    !url.hostname.endsWith(".run.app")
  ) {
    throw new Error("QA_RESET_AUDIENCE_INVALID");
  }
  return url.origin;
}

function timestamp(value: string | undefined, key: string) {
  const result = new Date(required(value, key));
  if (!Number.isFinite(result.getTime())) throw new Error(`QA_RESET_${key}_INVALID`);
  return result;
}

function required(value: string | undefined, key: string) {
  if (!value) throw new Error(`QA_RESET_${key}_REQUIRED`);
  return value;
}

function integer(value: string, minimum: number, maximum: number, key: string) {
  const result = Number(value);
  if (!Number.isInteger(result) || result < minimum || result > maximum) {
    throw new Error(`QA_RESET_${key}_INVALID`);
  }
  return result;
}
