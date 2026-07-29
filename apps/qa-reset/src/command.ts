import { browserConfirmation, nativeConfirmation, type QaResetConfig } from "./config";

export type ResetAction = "prepare" | "cleanup";
export type ResetOperation = "dry-run" | ResetAction;
export type ResetCommand = Readonly<{
  scope: "browser" | "native";
  action: ResetAction;
  tenantIds: readonly string[];
  releaseSha: string;
  confirmation: string;
  authorityId: string;
  dryRunChecksum: string | null;
  preparationReceipt: string | null;
}>;

export class ResetRequestError extends Error {
  constructor(
    readonly status: 400 | 403 | 409,
    readonly code:
      "RWOS_QA_RESET_REQUEST_INVALID" | "RWOS_QA_RESET_ACCESS_DENIED" | "RWOS_QA_RESET_CONFLICT"
  ) {
    super(code);
  }
}

export function normalizeResetRequest(
  input: unknown,
  operation: ResetOperation,
  config: QaResetConfig
): ResetCommand {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw invalid();
  const record = input as Record<string, unknown>;
  const scope = "tenantIds" in record ? "browser" : "tenantId" in record ? "native" : null;
  if (!scope) throw invalid();
  const allowed =
    scope === "browser"
      ? [
          "action",
          "tenantIds",
          "releaseSha",
          "confirmation",
          "dryRunChecksum",
          "preparationReceipt"
        ]
      : [
          "action",
          "authorityId",
          "tenantId",
          "releaseSha",
          "confirmation",
          "dryRunChecksum",
          "preparationReceipt"
        ];
  if (Object.keys(record).some((key) => !allowed.includes(key))) throw invalid();
  const action = record.action;
  if (action !== "prepare" && action !== "cleanup") throw invalid();
  const releaseSha = string(record.releaseSha, 40);
  if (releaseSha !== config.releaseSha) throw denied();
  const confirmation = string(record.confirmation, 100);
  const expectedConfirmation = scope === "browser" ? browserConfirmation : nativeConfirmation;
  if (confirmation !== expectedConfirmation) throw denied();

  const tenantIds =
    scope === "browser"
      ? browserTenants(record.tenantIds, config)
      : [nativeTenant(record.tenantId, config)];
  const authorityId = scope === "native" ? string(record.authorityId, 200) : config.authorityId;
  if (authorityId !== config.authorityId) throw denied();
  const dryRunChecksum = optionalChecksum(record.dryRunChecksum);
  const preparationReceipt = optionalChecksum(record.preparationReceipt);
  if (operation === "prepare" && (!dryRunChecksum || action !== "prepare")) throw invalid();
  if (operation === "cleanup" && (!dryRunChecksum || !preparationReceipt || action !== "cleanup")) {
    throw invalid();
  }
  return {
    scope,
    action,
    tenantIds,
    releaseSha,
    confirmation,
    authorityId,
    dryRunChecksum,
    preparationReceipt
  };
}

function browserTenants(value: unknown, config: QaResetConfig) {
  if (
    !Array.isArray(value) ||
    value.length !== 2 ||
    !value.every((item) => typeof item === "string")
  ) {
    throw invalid();
  }
  const expected = [config.tenantAId, config.tenantBId].sort();
  const actual = [...value].sort();
  if (new Set(actual).size !== 2 || actual.join(",") !== expected.join(",")) throw denied();
  return actual;
}

function nativeTenant(value: unknown, config: QaResetConfig) {
  const tenantId = string(value, 200);
  if (![config.tenantAId, config.tenantBId].includes(tenantId)) throw denied();
  return tenantId;
}

function optionalChecksum(value: unknown) {
  if (value === undefined) return null;
  const result = string(value, 64);
  if (!/^[a-f0-9]{64}$/.test(result)) throw invalid();
  return result;
}

function string(value: unknown, maximum: number) {
  if (typeof value !== "string" || !value || value.length > maximum) throw invalid();
  return value;
}

function invalid() {
  return new ResetRequestError(400, "RWOS_QA_RESET_REQUEST_INVALID");
}

function denied() {
  return new ResetRequestError(403, "RWOS_QA_RESET_ACCESS_DENIED");
}
