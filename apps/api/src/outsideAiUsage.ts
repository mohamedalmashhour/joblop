// Usage limits for outside-AI features (launch step 6). One row per AI attempt in ai_usage_events
// (feature, who, when): no prompt, no reply, no personal data. Kept in the database so a deploy or a
// restart never resets a limit.

import type { PrismaClient } from "@rwos/database";

export type AiUsageLimits = Readonly<{ perActorPerDay: number; perMonth: number }>;
export type AiUsageDecision = "ok" | "daily_limit" | "monthly_limit";

export interface AiUsageStore {
  /** Attempts for a feature since a time, for one person or (null) for everyone. */
  count(feature: string, actorRef: string | null, since: Date): Promise<number>;
  record(feature: string, actorRef: string, at: Date): Promise<void>;
}

export const AI_USAGE_FEATURES = {
  cvWorker: "cv_builder_worker",
  cvStaff: "cv_builder_staff"
} as const;

// A worker gets 10 AI CVs a day; a staff member building CVs for many workers gets 50. The monthly
// cap bounds the whole bill for the feature.
export const CV_WORKER_LIMITS: AiUsageLimits = { perActorPerDay: 10, perMonth: 3000 };
export const CV_STAFF_LIMITS: AiUsageLimits = { perActorPerDay: 50, perMonth: 3000 };

/** Checks both limits, then records the attempt. Every attempt counts, failed or not, so a person
 *  pressing the button again and again cannot cause a storm of outside calls. */
export async function claimAiUse(
  store: AiUsageStore,
  input: Readonly<{ feature: string; actorRef: string; limits: AiUsageLimits; now: Date }>
): Promise<AiUsageDecision> {
  const dayAgo = new Date(input.now.getTime() - 86_400_000);
  if ((await store.count(input.feature, input.actorRef, dayAgo)) >= input.limits.perActorPerDay) return "daily_limit";
  const monthStart = new Date(Date.UTC(input.now.getUTCFullYear(), input.now.getUTCMonth(), 1));
  if ((await store.count(input.feature, null, monthStart)) >= input.limits.perMonth) return "monthly_limit";
  await store.record(input.feature, input.actorRef, input.now);
  return "ok";
}

export function createPrismaAiUsageStore(prisma: PrismaClient): AiUsageStore {
  return {
    count: (feature, actorRef, since) =>
      prisma.aiUsageEvent.count({ where: { feature, createdAt: { gte: since }, ...(actorRef ? { actorRef } : {}) } }),
    record: async (feature, actorRef, at) => {
      await prisma.aiUsageEvent.create({ data: { feature, actorRef, createdAt: at } });
    }
  };
}
