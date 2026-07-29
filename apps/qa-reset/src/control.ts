export type ResetControlStore = {
  blocked: boolean;
  blockReason: string | null;
  dryRuns: Map<string, { action: "prepare" | "cleanup"; planChecksum: string; createdAt: Date }>;
  preparationReceipt: string | null;
  cleanupReceipt: string | null;
  audit: Array<Record<string, unknown>>;
};

export function createResetControlStore(): ResetControlStore {
  return {
    blocked: false,
    blockReason: null,
    dryRuns: new Map(),
    preparationReceipt: null,
    cleanupReceipt: null,
    audit: []
  };
}
