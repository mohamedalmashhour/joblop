// Worker profile rating: a transparent points score for how complete a worker's documents are. It
// measures completeness only, never whether a document is genuine or how good the worker is. A higher
// rating shows the worker more jobs in search; it never blocks them from anything.

export type WorkerProfileItemKey = "identity" | "photo" | "cv" | "work_authorization" | "certificate";
export type WorkerProfileTier = "starter" | "good" | "strong" | "top";

const ITEMS: ReadonlyArray<{ key: WorkerProfileItemKey; points: number; documentTypes: readonly string[] }> = [
  { key: "identity", points: 30, documentTypes: ["identity"] },
  { key: "photo", points: 20, documentTypes: ["photo"] },
  { key: "cv", points: 20, documentTypes: ["cv"] },
  { key: "work_authorization", points: 20, documentTypes: ["work_authorization"] },
  { key: "certificate", points: 10, documentTypes: ["certificate", "first_aid", "licence"] }
];

// Lowest score for each tier and the jobs it shows, best first. `null` means every matching job.
const TIERS: ReadonlyArray<{ tier: WorkerProfileTier; minScore: number; jobLimit: number | null }> = [
  { tier: "top", minScore: 100, jobLimit: null },
  { tier: "strong", minScore: 70, jobLimit: 50 },
  { tier: "good", minScore: 40, jobLimit: 25 },
  { tier: "starter", minScore: 0, jobLimit: 10 }
];

// A document counts while it is live. Rejected, expired, replaced or deleted ones earn nothing.
const COUNTING_STATUSES: ReadonlySet<string> = new Set(["submitted", "under_review", "accepted", "expiring"]);

export type WorkerProfileRating = Readonly<{
  score: number;
  tier: WorkerProfileTier;
  jobLimit: number | null;
  items: ReadonlyArray<{ key: WorkerProfileItemKey; points: number; done: boolean }>;
}>;

export function workerProfileRating(
  documents: ReadonlyArray<{ documentType: string; effectiveStatus: string }>
): WorkerProfileRating {
  const live = new Set(documents.filter((d) => COUNTING_STATUSES.has(d.effectiveStatus)).map((d) => d.documentType));
  const items = ITEMS.map(({ key, points, documentTypes }) => ({ key, points, done: documentTypes.some((type) => live.has(type)) }));
  const score = items.reduce((sum, item) => sum + (item.done ? item.points : 0), 0);
  const { tier, jobLimit } = TIERS.find((t) => score >= t.minScore) ?? TIERS[TIERS.length - 1]!;
  return { score, tier, jobLimit, items };
}
