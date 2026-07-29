import { retentionDays, type QaResetConfig } from "./config";
import type { ResetCommand, ResetOperation } from "./command";
import { ResetRequestError } from "./command";
import type { ResetControlStore } from "./control";
import {
  checksumValue,
  isSharedManifestRecord,
  manifestReady,
  type ManifestRecord,
  type ResetManifest
} from "./manifest";
import type { ResetLock, ResetRepository } from "./repository";
import type { RepositorySnapshot } from "./repository";
import { exactMutationPlanChecksum } from "./mutationPlan";
import {
  deriveQaResetIdempotencyDigest,
  type DurableResetRequest,
  type PostgresQaResetRepository
} from "./postgresRepository";

export type DurableCallerContext = Readonly<{
  callerAlias: string;
  callerPrincipalDigest: string;
  correlationId: string;
}>;

type PrepareResult = Readonly<{
  prepared: true;
  idempotent: boolean;
  receipt: string;
  count: number;
}>;
type CleanupResult = Readonly<{
  cleaned: true;
  idempotent: boolean;
  receipt: string;
  count: number;
}>;

export type QaResetService = Readonly<{
  ready(): boolean;
  readyDurable(): Promise<boolean>;
  dryRun(command: ResetCommand): ReturnType<typeof buildPlan>;
  dryRun(
    command: ResetCommand,
    caller: DurableCallerContext
  ): Promise<ReturnType<typeof buildPlan>>;
  prepare(command: ResetCommand): PrepareResult;
  prepare(command: ResetCommand, caller: DurableCallerContext): Promise<PrepareResult>;
  cleanup(command: ResetCommand): CleanupResult;
  cleanup(command: ResetCommand, caller: DurableCallerContext): Promise<CleanupResult>;
}>;

export function createQaResetService(options: {
  config: QaResetConfig;
  manifest: ResetManifest;
  repository: ResetRepository;
  lock: ResetLock;
  control: ResetControlStore;
  durableRepository?: PostgresQaResetRepository;
  now?: () => Date;
}): QaResetService {
  const now = options.now ?? (() => new Date());

  return {
    ready() {
      return (
        !options.control.blocked &&
        manifestReady(options.manifest, options.config, now()) &&
        repositoryReady(options.manifest, options.repository)
      );
    },

    async readyDurable() {
      if (!options.durableRepository) return false;
      try {
        const snapshot = await options.durableRepository.inspect(options.manifest);
        return (
          !options.control.blocked &&
          manifestReady(options.manifest, options.config, now()) &&
          snapshotReady(options.manifest, snapshot)
        );
      } catch {
        return false;
      }
    },

    dryRun(command: ResetCommand, caller?: DurableCallerContext) {
      validateReadyAndControl(options, now());
      if (caller) {
        if (!options.durableRepository) throw conflict();
        assertDurableCaller(command, caller);
        return options.durableRepository
          .inspect(options.manifest)
          .then((snapshot) =>
            recordDryRun(
              options,
              command,
              buildPlanFromSnapshot(options.manifest, snapshot, command),
              now()
            )
          );
      }
      const plan = buildPlan(options.manifest, options.repository, command);
      return recordDryRun(options, command, plan, now());
    },

    prepare(command: ResetCommand, caller?: DurableCallerContext) {
      validateReadyAndControl(options, now());
      requireDryRun(options.control, command, "prepare");
      const plan = buildPlan(options.manifest, options.repository, command);
      if (plan.planChecksum !== command.dryRunChecksum) throw conflict();
      if (caller) {
        if (!options.durableRepository) throw conflict();
        return executeDurable(options, command, caller, plan.planChecksum, now());
      }
      const scoped = scopedManifest(options.manifest, command.tenantIds, "prepare");
      const lockKey = `${options.config.clusterId}:${options.manifest.manifestId}`;
      if (!options.lock.acquire(lockKey)) throw conflict();
      try {
        if (plan.currentCount === plan.expectedCount) {
          const receipt =
            options.control.preparationReceipt ??
            receiptFor("prepare", options.manifest, command, plan.planChecksum);
          options.control.preparationReceipt = receipt;
          return { prepared: true, idempotent: true, receipt, count: plan.expectedCount };
        }
        options.repository.prepare(scoped);
        const verified = buildPlan(options.manifest, options.repository, command);
        if (verified.currentCount !== verified.expectedCount) {
          throw new Error("QA_RESET_PREPARE_VERIFICATION_FAILED");
        }
        const receipt = receiptFor("prepare", options.manifest, command, plan.planChecksum);
        options.control.preparationReceipt = receipt;
        options.control.cleanupReceipt = null;
        audit(options.control, "prepare", command, now(), {
          result: "completed",
          receipt,
          count: verified.expectedCount
        });
        return { prepared: true, idempotent: false, receipt, count: verified.expectedCount };
      } catch (error) {
        block(options.control, "prepare_partial_or_unknown", command, now());
        throw error;
      } finally {
        options.lock.release(lockKey);
      }
    },

    cleanup(command: ResetCommand, caller?: DurableCallerContext) {
      validateReadyAndControl(options, now());
      requireDryRun(options.control, command, "cleanup");
      if (
        !options.control.preparationReceipt ||
        command.preparationReceipt !== options.control.preparationReceipt
      ) {
        throw conflict();
      }
      const plan = buildPlan(options.manifest, options.repository, command);
      if (plan.planChecksum !== command.dryRunChecksum) throw conflict();
      if (caller) {
        if (!options.durableRepository) throw conflict();
        return executeDurable(options, command, caller, plan.planChecksum, now());
      }
      const scoped = scopedManifest(options.manifest, command.tenantIds, "cleanup");
      const lockKey = `${options.config.clusterId}:${options.manifest.manifestId}`;
      if (!options.lock.acquire(lockKey)) throw conflict();
      try {
        if (plan.currentCount === 0) {
          const receipt =
            options.control.cleanupReceipt ??
            receiptFor("cleanup", options.manifest, command, plan.planChecksum);
          options.control.cleanupReceipt = receipt;
          return { cleaned: true, idempotent: true, receipt, count: 0 };
        }
        options.repository.cleanup(scoped);
        const verified = buildPlan(options.manifest, options.repository, command);
        if (verified.currentCount !== 0) {
          throw new Error("QA_RESET_CLEANUP_VERIFICATION_FAILED");
        }
        const receipt = receiptFor("cleanup", options.manifest, command, plan.planChecksum);
        options.control.cleanupReceipt = receipt;
        audit(options.control, "cleanup", command, now(), {
          result: "completed",
          receipt,
          count: 0
        });
        return { cleaned: true, idempotent: false, receipt, count: 0 };
      } catch (error) {
        block(options.control, "cleanup_partial_or_unknown", command, now());
        throw error;
      } finally {
        options.lock.release(lockKey);
      }
    }
  } as QaResetService;
}

async function executeDurable(
  options: {
    config: QaResetConfig;
    manifest: ResetManifest;
    control: ResetControlStore;
    durableRepository?: PostgresQaResetRepository;
  },
  command: ResetCommand,
  caller: DurableCallerContext,
  planChecksum: string,
  now: Date
) {
  assertDurableCaller(command, caller);
  const operation = command.action;
  const mutationPlanChecksum = exactMutationPlanChecksum(
    options.manifest,
    operation,
    command.tenantIds
  );
  const unsigned: Omit<DurableResetRequest, "idempotencyDigest"> = {
    operation,
    scope: durableScope(command, caller.callerAlias),
    manifest: options.manifest,
    tenantIds: command.tenantIds,
    callerAlias: caller.callerAlias,
    callerPrincipalDigest: caller.callerPrincipalDigest,
    approvalReference: options.manifest.approvalReferences[operation],
    correlationId: caller.correlationId,
    planChecksum,
    mutationPlanChecksum,
    retentionUntil: new Date(options.manifest.retentionUntil)
  };
  let result;
  try {
    result = await options.durableRepository!.execute({
      ...unsigned,
      idempotencyDigest: deriveQaResetIdempotencyDigest(unsigned)
    });
  } catch (error) {
    block(options.control, "durable_outcome_failed_or_unknown", command, now);
    throw error;
  }
  if (operation === "prepare") {
    options.control.preparationReceipt = result.receipt;
    options.control.cleanupReceipt = null;
    return {
      prepared: true,
      idempotent: result.idempotent,
      receipt: result.receipt,
      count: result.affectedCount
    };
  }
  options.control.cleanupReceipt = result.receipt;
  return {
    cleaned: true,
    idempotent: result.idempotent,
    receipt: result.receipt,
    count: 0
  };
}

function assertDurableCaller(command: ResetCommand, caller: DurableCallerContext) {
  if (
    !/^[a-f0-9]{64}$/u.test(caller.callerPrincipalDigest) ||
    !/^[a-zA-Z0-9._-]{1,100}$/u.test(caller.correlationId)
  ) {
    throw conflict();
  }
  durableScope(command, caller.callerAlias);
}

function durableScope(command: ResetCommand, callerAlias: string): DurableResetRequest["scope"] {
  if (command.scope === "browser" && callerAlias === "browser-e2e") return "browser";
  if (callerAlias === "ios-e2e") return "ios";
  if (callerAlias === "android-e2e") return "android";
  throw conflict();
}

function repositoryReady(manifest: ResetManifest, repository: ResetRepository) {
  try {
    return snapshotReady(manifest, repository.inspect(manifest));
  } catch {
    return false;
  }
}

function snapshotReady(manifest: ResetManifest, snapshot: RepositorySnapshot) {
  if (snapshot.foreignIdsInNamespace.length > 0) return false;
  const present = new Set(snapshot.manifestOwnedIds);
  for (const record of manifest.records) {
    if (["audit_actor_reference", "audit_event"].includes(record.entityType)) {
      present.delete(record.recordId);
    }
  }
  const sharedRecords = manifest.records.filter(isSharedManifestRecord);
  const sharedPresentCount = sharedRecords.filter((record) => present.has(record.recordId)).length;
  if (sharedPresentCount !== 0 && sharedPresentCount !== sharedRecords.length) return false;
  return manifest.tenantIds.every((tenantId) => {
    const tenantRecords = manifest.records.filter(
      (record) => record.tenantId === tenantId && !isSharedManifestRecord(record)
    );
    const presentCount = tenantRecords.filter((record) => present.has(record.recordId)).length;
    return presentCount === 0 || presentCount === tenantRecords.length;
  });
}

function buildPlan(manifest: ResetManifest, repository: ResetRepository, command: ResetCommand) {
  return buildPlanFromSnapshot(manifest, repository.inspect(manifest), command);
}

function buildPlanFromSnapshot(
  manifest: ResetManifest,
  snapshot: RepositorySnapshot,
  command: ResetCommand
) {
  if (snapshot.foreignIdsInNamespace.length > 0) throw conflict();
  const scopedRecords = recordsForTenants(manifest, command.tenantIds, command.action);
  const scopedIds = new Set(scopedRecords.map((record) => record.recordId));
  const present = snapshot.manifestOwnedIds.filter((recordId) => scopedIds.has(recordId));
  if (present.length !== 0 && present.length !== scopedRecords.length) throw conflict();
  const planBody = {
    action: command.action,
    manifestId: manifest.manifestId,
    manifestChecksum: manifest.checksum,
    tenantIds: [...command.tenantIds].sort(),
    namespace: manifest.namespace,
    intendedRecordIds: scopedRecords.map((record) => record.recordId).sort(),
    currentRecordIds: [...present].sort(),
    expectedCount: scopedRecords.length,
    currentCount: present.length,
    unrelatedCount: snapshot.unrelatedIds.length
  };
  return { ...planBody, planChecksum: checksumValue(planBody) };
}

function recordDryRun(
  options: { control: ResetControlStore },
  command: ResetCommand,
  plan: ReturnType<typeof buildPlan>,
  now: Date
) {
  options.control.dryRuns.set(plan.planChecksum, {
    action: command.action,
    planChecksum: plan.planChecksum,
    createdAt: now
  });
  audit(options.control, "dry-run", command, now, {
    result: "validated",
    planChecksum: plan.planChecksum
  });
  return plan;
}

function requireDryRun(
  control: ResetControlStore,
  command: ResetCommand,
  expectedAction: "prepare" | "cleanup"
) {
  const record = command.dryRunChecksum ? control.dryRuns.get(command.dryRunChecksum) : undefined;
  if (!record || record.action !== expectedAction) throw conflict();
}

function validateReadyAndControl(
  options: {
    config: QaResetConfig;
    manifest: ResetManifest;
    control: ResetControlStore;
  },
  now: Date
) {
  pruneControl(options.control, now);
  if (!manifestReady(options.manifest, options.config, now)) {
    throw new ResetRequestError(409, "RWOS_QA_RESET_CONFLICT");
  }
  if (options.control.blocked) throw conflict();
}

function pruneControl(control: ResetControlStore, now: Date) {
  const cutoff = now.getTime() - retentionDays * 86_400_000;
  for (const [key, record] of control.dryRuns) {
    if (record.createdAt.getTime() < cutoff) control.dryRuns.delete(key);
  }
  control.audit = control.audit.filter((record) => {
    const at = typeof record.at === "string" ? Date.parse(record.at) : Number.NaN;
    return Number.isFinite(at) && at >= cutoff;
  });
}

function scopedManifest(
  manifest: ResetManifest,
  tenantIds: readonly string[],
  operation: "prepare" | "cleanup"
): ResetManifest {
  return {
    ...manifest,
    tenantIds: [...tenantIds],
    records: recordsForTenants(manifest, tenantIds, operation)
  };
}

function recordsForTenants(
  manifest: ResetManifest,
  tenantIds: readonly string[],
  operation?: "prepare" | "cleanup"
): ManifestRecord[] {
  const allowed = new Set(tenantIds);
  const fullScope = tenantIds.length === manifest.tenantIds.length;
  return manifest.records.filter(
    (record) =>
      allowed.has(record.tenantId) &&
      !(
        operation === "cleanup" &&
        ["audit_actor_reference", "audit_event"].includes(record.entityType)
      ) &&
      !(operation === "cleanup" && !fullScope && isSharedManifestRecord(record))
  );
}

function receiptFor(
  action: "prepare" | "cleanup",
  manifest: ResetManifest,
  command: ResetCommand,
  planChecksum: string
) {
  return checksumValue({
    action,
    manifestChecksum: manifest.checksum,
    releaseSha: manifest.releaseSha,
    tenantIds: [...command.tenantIds].sort(),
    planChecksum
  });
}

function audit(
  control: ResetControlStore,
  operation: ResetOperation,
  command: ResetCommand,
  at: Date,
  fields: Record<string, unknown>
) {
  control.audit.push({
    at: at.toISOString(),
    operation,
    scope: command.scope,
    tenantCount: command.tenantIds.length,
    ...fields
  });
}

function block(control: ResetControlStore, reason: string, command: ResetCommand, at: Date) {
  control.blocked = true;
  control.blockReason = reason;
  audit(control, command.action, command, at, { result: "blocked", reason });
}

function conflict() {
  return new ResetRequestError(409, "RWOS_QA_RESET_CONFLICT");
}
