// Pure, UI-free helpers + copy for the open-shift marketplace screens. Kept side-effect free so the
// formatting and disclosure rules are unit-tested without React Native.

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** "Mon, Jun 1 · 08:00–16:00" from two ISO instants. Falls back gracefully on unparseable input. */
export function formatShiftWindow(startIso: string, endIso: string): string {
  const start = new Date(startIso);
  const end = new Date(endIso);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "Scheduled time to be confirmed";
  const day = `${DAYS[start.getUTCDay()]}, ${MONTHS[start.getUTCMonth()]} ${start.getUTCDate()}`;
  const from = `${pad(start.getUTCHours())}:${pad(start.getUTCMinutes())}`;
  const to = `${pad(end.getUTCHours())}:${pad(end.getUTCMinutes())}`;
  return `${day} · ${from}–${to}`;
}

/** The worker rate is policy-gated on the backend (currently always null) — show an honest placeholder
 *  rather than invent a number. */
export function formatWorkerRate(workerRateMinor: number | null, currency: string): string {
  if (workerRateMinor === null) return "Rate shared after you're matched";
  return `${(workerRateMinor / 100).toFixed(2)} ${currency}/h`;
}

export function formatDistance(distanceKm: number | null): string {
  if (distanceKm === null) return "";
  return distanceKm < 1 ? "Less than 1 km away" : `${distanceKm.toFixed(distanceKm < 10 ? 1 : 0)} km away`;
}

export function formatOpenings(openings: number): string {
  return openings === 1 ? "1 opening" : `${openings} openings`;
}

export const marketplaceCopy = {
  title: "Open shifts",
  intro: "Browse open postings from JobLop employers near you. Applying registers your interest — it does not guarantee an assignment.",
  postalLabel: "Your postal code",
  postalPlaceholder: "e.g. H2X 1Y4",
  searchCta: "Search nearby shifts",
  verifiedOn: "Verified employers only: On",
  verifiedOff: "Verified employers only: Off",
  signInRequired: "Sign in to browse and apply to open shifts.",
  invalidLocation: "That location could not be resolved. Check the postal code and try again.",
  unavailable: "The marketplace is not available right now.",
  loadError: "Open shifts could not be loaded right now.",
  emptyResults: "No open shifts match your search right now.",
  applyCta: "Express interest",
  applied: "Interest submitted — the employer's team will review it.",
  alreadyApplied: "You've already expressed interest in this shift.",
  applyIneligible: "You can't express interest in this shift right now.",
  applyError: "Your interest could not be submitted right now.",
  notFound: "This shift is no longer available."
} as const;
