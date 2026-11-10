// Small, pure pieces of the Request workers form flow, kept here so they can be tested without a browser.

// "Site address" follows the chosen Location: it is filled from the location's address as soon as the
// location is picked (or picked for the employer), unless the employer typed their own address. An address
// the form filled itself is replaced when the location changes; one the employer typed is never touched.
export function prefillSiteAddress(
  current: string,
  lastFilled: string | null,
  locationAddress: string | null | undefined
): Readonly<{ address: string; filled: string | null }> {
  const typedByEmployer = current.trim() !== "" && current !== lastFilled;
  if (typedByEmployer) return { address: current, filled: lastFilled };
  if (!locationAddress) return { address: lastFilled !== null && current === lastFilled ? "" : current, filled: null };
  return { address: locationAddress, filled: locationAddress };
}

export const REQUEST_MORE_WORKERS_HREF = "/employer/calendar/create";
export const BACK_TO_CALENDAR_HREF = "/employer/calendar";

export type SubmittedConfirmation = Readonly<{
  requestNumber: string | null;
  openRequestHref: string | null;
  title: string;
  startAt: string;
  endAt: string;
  workers: number;
  address: string | null;
  shiftCount: number;
  requestMoreHref: string;
  backToCalendarHref: string;
}>;

// After "Submit for review" succeeds the form is replaced by this confirmation, so the same request
// cannot be sent twice by accident. Any other state keeps the form (null).
export function submittedConfirmation(input: Readonly<{
  status: string;
  draft: Readonly<{ jobRequestNumber: string }> | null;
  form: Readonly<{ title: string; startAt: string; endAt: string; numberOfWorkers: string; addressSummary: string }>;
  shiftCount: number;
}>): SubmittedConfirmation | null {
  if (input.status !== "submitted") return null;
  const workers = Number(input.form.numberOfWorkers);
  const requestNumber = input.draft?.jobRequestNumber ?? null;
  return {
    requestNumber,
    openRequestHref: requestNumber ? `/employer/calendar/request?request=${encodeURIComponent(requestNumber)}` : null,
    title: input.form.title.trim(),
    startAt: input.form.startAt,
    endAt: input.form.endAt,
    workers: Number.isInteger(workers) && workers > 0 ? workers : 1,
    address: input.form.addressSummary.trim() || null,
    shiftCount: Math.max(1, input.shiftCount),
    requestMoreHref: REQUEST_MORE_WORKERS_HREF,
    backToCalendarHref: BACK_TO_CALENDAR_HREF
  };
}
