// Where to send a visitor after they sign up or sign in. Only a path on this site is accepted, so a
// crafted link can never bounce someone to an outside address (no open redirect):
//   - it must start with a single "/" (not "//" or "/\", which browsers treat as another host),
//   - no backslashes, control characters or whitespace anywhere,
//   - and it must still be on this site once the browser resolves it.
// Returns the normalized path (path + query + hash), or null when it is not safe.

const PROBE_ORIGIN = "https://joblop.invalid";

export function safeReturnPath(value: unknown): string | null {
  if (typeof value !== "string") return null;
  if (value.length === 0 || value.length > 512) return null;
  if (!value.startsWith("/") || value.startsWith("//")) return null;
  // Backslashes, control characters and any whitespace are never part of a path we hand out.
  if (value.includes("\\") || /\s/.test(value)) return null;
  for (let i = 0; i < value.length; i += 1) {
    const code = value.charCodeAt(i);
    if (code < 0x20 || code === 0x7f) return null;
  }
  let resolved: URL;
  try {
    resolved = new URL(value, PROBE_ORIGIN);
  } catch {
    return null;
  }
  if (resolved.origin !== PROBE_ORIGIN) return null;
  const path = `${resolved.pathname}${resolved.search}${resolved.hash}`;
  return path.startsWith("//") ? null : path;
}

/** The public page for one Joblop job, by its public job code. */
export function publicJobPath(jobCode: string): string {
  return `/job/${encodeURIComponent(jobCode)}`;
}

/** The sign-up link that brings the visitor back to `next` once they have an account. */
export function signUpReturningTo(next: string, tab: "signup" | "signin" = "signup"): string {
  const safe = safeReturnPath(next) ?? "/";
  const params = new URLSearchParams({ next: safe });
  if (tab === "signin") params.set("tab", "signin");
  return `/?${params.toString()}#auth-card`;
}
