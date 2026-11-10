// Calendar helpers shared by the public jobs calendar and "My calendar".

/** Whole days between two "YYYY-MM-DD" keys (b - a). */
function daysBetween(a: string, b: string): number {
  const toUtc = (key: string) => {
    const [y, m, d] = key.split("-").map(Number);
    return Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1);
  };
  return Math.round((toUtc(b) - toUtc(a)) / 86_400_000);
}

/**
 * The day with jobs closest to `from` ("YYYY-MM-DD"), not counting `from` itself. When two days are
 * as close, the later one wins (jobs are in the future). Null when no day has jobs.
 */
export function nearestDayWithJobs(daysWithJobs: Iterable<string>, from: string): string | null {
  let best: string | null = null;
  let bestGap = Infinity;
  for (const key of daysWithJobs) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(key) || key === from) continue;
    const gap = Math.abs(daysBetween(from, key));
    if (gap < bestGap || (gap === bestGap && best !== null && key > best)) {
      best = key;
      bestGap = gap;
    }
  }
  return best;
}
