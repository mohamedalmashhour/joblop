// The BFF collapses the API's 403 ("not a worker yet") into a 401. A worker-scoped feature
// endpoint therefore returns 401 both for a truly signed-out visitor AND for a signed-in account
// that simply has no worker profile yet. Disambiguate against the real session so the two states
// render differently: a signed-in-but-unconfigured worker is NOT signed out and must be offered
// worker setup instead of a dead-end "please sign in" prompt.
//
// Mirrors the logic the offers panel first introduced; shared so every worker panel treats a
// denied worker-scoped fetch the same way.
export async function resolveDeniedKind(): Promise<"needs_setup" | "signed_out"> {
  try {
    const s = await fetch("/api/session", { cache: "no-store" });
    if (s.ok) {
      const j = (await s.json()) as { authenticated?: boolean };
      if (j?.authenticated) return "needs_setup";
    }
  } catch {
    /* fall through to signed_out */
  }
  return "signed_out";
}
