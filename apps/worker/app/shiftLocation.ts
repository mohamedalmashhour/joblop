// Links for the exact work address of a CONFIRMED shift. The API only sends that address to the worker
// assigned to the shift (worksiteAddress.ts); everyone else sees the city only. Keyless Google Maps,
// the same embed the job page already uses, so no Maps API key ever reaches the browser.

/** Google Maps directions to the address, from wherever the worker is now. */
export function directionsUrlForAddress(address: string): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address.trim())}`;
}

/** Keyless Google Maps embed centred on the address. */
export function embedUrlForAddress(address: string, locale: string): string {
  const hl = locale.startsWith("fr") ? "fr" : locale.startsWith("ar") ? "ar" : "en";
  return `https://www.google.com/maps?q=${encodeURIComponent(address.trim())}&hl=${hl}&z=15&output=embed`;
}

/** A real address worth mapping (not empty, not a "restricted" placeholder). */
export function isMappableAddress(address: string | null | undefined): address is string {
  const trimmed = (address ?? "").trim();
  return trimmed.length > 3 && !/restricted|not provided/i.test(trimmed);
}

/** Check-in opens 30 minutes before the shift starts (the API refuses earlier ones too). */
export const CHECK_IN_OPENS_MINUTES_BEFORE_START = 30;

export function checkInOpensAt(scheduledStartAt: string): Date {
  return new Date(new Date(scheduledStartAt).getTime() - CHECK_IN_OPENS_MINUTES_BEFORE_START * 60_000);
}

export function isCheckInOpen(scheduledStartAt: string, now: number = Date.now()): boolean {
  return now >= checkInOpensAt(scheduledStartAt).getTime();
}
