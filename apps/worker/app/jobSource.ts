// Where a job comes from and where the worker applies. Joblop jobs are applied for here, on Joblop.
// Outside listings (JobScanner / partner leads) are applied for on the outside site, in a new tab.

const KNOWN_SITES: Readonly<Record<string, string>> = {
  adzuna: "Adzuna",
  talent: "Talent.com",
  jooble: "Jooble",
  indeed: "Indeed",
  jobbank: "Job Bank",
  guichetemplois: "Job Bank"
};

/** The outside site's name for "Apply on <site>", or null when it is not known. */
export function outsideSiteName(source?: string | null, url?: string | null): string | null {
  const key = (source ?? "").trim().toLowerCase();
  const known = KNOWN_SITES[key];
  if (known) return known;
  const safe = outsideApplyUrl(url);
  if (safe) {
    const host = new URL(safe).hostname.replace(/^www\./, "");
    if (host) return host;
  }
  return key ? key.charAt(0).toUpperCase() + key.slice(1) : null;
}

/** The listing's address when it is a plain web address (http or https), else null. */
export function outsideApplyUrl(url?: string | null): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.toString() : null;
  } catch {
    return null;
  }
}
