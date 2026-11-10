// How the "Long-term job listings" box shows on the Request calendar.
// - No long-term listings: one line ("Long-term listings: none – Learn more") until the employer opens it.
// - Any listing, a message to show (e.g. "Payment received"), or the per-job box on the request form: full.
export type ListingBoxMode = "collapsed" | "full";

export function listingBoxMode(
  input: Readonly<{ listingCount: number; perJob: boolean; expanded: boolean; hasNotice: boolean }>
): ListingBoxMode {
  if (input.perJob || input.listingCount > 0 || input.expanded || input.hasNotice) return "full";
  return "collapsed";
}
