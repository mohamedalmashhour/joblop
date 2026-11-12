// When a saved job can still be taken. A saved job stays in the worker's list after it closes, so the
// list must say plainly which ones are still open: approved by staff (not just submitted), its site
// active, still listed (long-term jobs), not started yet, and with at least one place left.
// Cancelled, expired or completed jobs fail the status check.

export type SavedJobRow = Readonly<{
  status: string;
  startAt: Date;
  residence: Readonly<{ status: string }>;
}>;

export function isSavedJobAvailable(
  row: SavedJobRow | null | undefined,
  input: Readonly<{ placesLeft: number; listed: boolean; now: Date }>
): boolean {
  if (!row) return false;
  return (
    row.status === "approved_for_dispatch" &&
    row.residence.status === "active" &&
    input.listed &&
    row.startAt.getTime() > input.now.getTime() &&
    input.placesLeft > 0
  );
}
