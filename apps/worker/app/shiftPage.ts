// The one page a booked shift opens from every calendar and list: the job page, which shows a booked
// worker the full details, the exact address and map, the conditions, Check in / Check out, "Ask
// Joblop" and "Cancel this shift". Worker pay only; the employer rate and Joblop's share never reach it.
export function shiftPageHref(jobRequestId: string): string {
  return `/jobs/${encodeURIComponent(jobRequestId)}`;
}
