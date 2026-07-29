import type { ManifestRecord, OwnedEntityType, ResetManifest } from "./manifest";

export type ResetRepository = Readonly<{
  inspect(manifest: ResetManifest): RepositorySnapshot;
  prepare(manifest: ResetManifest): void;
  cleanup(manifest: ResetManifest): void;
}>;

export type RepositorySnapshot = Readonly<{
  manifestOwnedIds: readonly string[];
  foreignIdsInNamespace: readonly string[];
  unrelatedIds: readonly string[];
}>;

export class MemoryResetRepository implements ResetRepository {
  readonly #records = new Map<string, ManifestRecord>();
  failAfterChanges: number | null = null;
  readonly mutationOrder: string[] = [];

  constructor(seed: readonly ManifestRecord[] = []) {
    for (const record of seed) this.#records.set(record.recordId, record);
  }

  inspect(manifest: ResetManifest): RepositorySnapshot {
    const manifestIds = new Set(manifest.records.map((record) => record.recordId));
    const manifestOwnedIds: string[] = [];
    const foreignIdsInNamespace: string[] = [];
    const unrelatedIds: string[] = [];
    for (const record of this.#records.values()) {
      if (record.namespace !== manifest.namespace) unrelatedIds.push(record.recordId);
      else if (manifestIds.has(record.recordId)) manifestOwnedIds.push(record.recordId);
      else foreignIdsInNamespace.push(record.recordId);
    }
    return {
      manifestOwnedIds: manifestOwnedIds.sort(),
      foreignIdsInNamespace: foreignIdsInNamespace.sort(),
      unrelatedIds: unrelatedIds.sort()
    };
  }

  prepare(manifest: ResetManifest) {
    let changes = 0;
    for (const entityType of manifest.preparationOrder) {
      for (const record of recordsFor(manifest, entityType)) {
        if (!this.#records.has(record.recordId)) {
          this.#records.set(record.recordId, record);
          this.mutationOrder.push(`create:${entityType}:${record.recordId}`);
          changes += 1;
          this.maybeFail(changes);
        }
      }
    }
  }

  cleanup(manifest: ResetManifest) {
    let changes = 0;
    for (const entityType of manifest.cleanupOrder) {
      for (const record of recordsFor(manifest, entityType)) {
        if (record.entityType === "audit_actor_reference" || record.entityType === "audit_event") {
          continue;
        }
        if (this.#records.delete(record.recordId)) {
          this.mutationOrder.push(`delete:${entityType}:${record.recordId}`);
          changes += 1;
          this.maybeFail(changes);
        }
      }
    }
  }

  records() {
    return [...this.#records.values()];
  }

  private maybeFail(changes: number) {
    if (this.failAfterChanges !== null && changes >= this.failAfterChanges) {
      throw new Error("SYNTHETIC_PARTIAL_OUTCOME");
    }
  }
}

function recordsFor(manifest: ResetManifest, entityType: OwnedEntityType) {
  return manifest.records
    .filter((record) => record.entityType === entityType)
    .sort((left, right) => left.recordId.localeCompare(right.recordId));
}

export type ResetLock = Readonly<{
  acquire(key: string): boolean;
  release(key: string): void;
}>;

export class MemoryResetLock implements ResetLock {
  readonly #held = new Set<string>();

  acquire(key: string) {
    if (this.#held.has(key)) return false;
    this.#held.add(key);
    return true;
  }

  release(key: string) {
    this.#held.delete(key);
  }
}
