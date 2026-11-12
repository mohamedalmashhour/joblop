// "Load more" for worker lists. The API pages with a cursor (Find work and the public board: an
// offset; My schedule: the last record's id). Each page is added after the ones already shown; an
// item that moved between pages (a job got a new place, a shift was added) is kept only once.

/** The next-page cursor from an API payload, or null when there is no more. */
export function nextCursorOf(payload: unknown): string | null {
  const value = (payload as { nextCursor?: unknown } | null)?.nextCursor;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "string" && value.length > 0) return value;
  return null;
}

/** `current` followed by the items of `next` not already in it (by key), order kept. */
export function appendUnique<T>(current: readonly T[], next: readonly T[], keyOf: (item: T) => string): T[] {
  const seen = new Set(current.map(keyOf));
  const added = next.filter((item) => {
    const key = keyOf(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return [...current, ...added];
}
