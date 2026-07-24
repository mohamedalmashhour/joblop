import type { ShiftDiscoveryFilters, ShiftDiscoveryRecord } from "@rwos/shared";
import { countActiveFilters } from "./filters";
import type { ShiftDiscoveryState } from "./repository";

export function getShiftDiscoveryState(
  shifts: readonly ShiftDiscoveryRecord[],
  filters: ShiftDiscoveryFilters,
  error?: string
): ShiftDiscoveryState {
  if (error) return { status: "error", message: error };

  if (shifts.length === 0) {
    return {
      status: "empty",
      message:
        countActiveFilters(filters) > 0
          ? "No open shifts match these filters. Reset filters to see all available work."
          : "There are no open shifts in the demo data right now."
    };
  }

  return { status: "populated", shifts };
}

export function getUnavailableApplicationsMessage(): string {
  return "Applications require the worker application workflow. Visible shifts are not guaranteed assignments.";
}
