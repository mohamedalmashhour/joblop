// Outside listings (JobScanner / partner sites) often post the same job once per city. On Find work
// they become ONE card: same title + same company (compared without case, accents, punctuation or extra
// spaces) = one group. The card says "N locations" and lists the cities; each city keeps its own
// "Apply on <site>" link, because each posting lives at its own address on the other website.

export type GroupableLead = Readonly<{
  title: string;
  employer: string | null;
  areaLabel: string;
  source: string;
  url?: string | null;
}>;

export type LeadGroup<L extends GroupableLead> = Readonly<{
  /** Stable key for React lists. */
  key: string;
  /** The first listing of the group (its title, company and pay are shown on the card). */
  lead: L;
  /** Every listing in the group, one per location, in the order they arrived. */
  locations: readonly L[];
}>;

/** Lower-case, no accents, punctuation turned into spaces, spaces collapsed. */
export function normaliseLeadText(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

/** The grouping key: normalised title + normalised company. */
export function leadGroupKey(lead: Pick<GroupableLead, "title" | "employer">): string {
  return `${normaliseLeadText(lead.title)}|${normaliseLeadText(lead.employer)}`;
}

/**
 * Groups listings that share the same normalised title + company. Groups keep the order of their first
 * listing; inside a group the same city is kept once (the first one wins).
 */
export function groupLeads<L extends GroupableLead>(leads: readonly L[]): LeadGroup<L>[] {
  const groups = new Map<string, { lead: L; locations: L[]; places: Set<string> }>();
  for (const lead of leads) {
    const key = leadGroupKey(lead);
    const place = normaliseLeadText(lead.areaLabel);
    const group = groups.get(key);
    if (!group) {
      groups.set(key, { lead, locations: [lead], places: new Set([place]) });
      continue;
    }
    if (group.places.has(place)) continue;
    group.places.add(place);
    group.locations.push(lead);
  }
  return [...groups.entries()].map(([key, g]) => ({ key, lead: g.lead, locations: g.locations }));
}
