"use client";

import { useCallback, useEffect, useState } from "react";

type Item = Readonly<{ status: string; requestedAt: string | null; completedAt: string | null; expiresAt: string | null; provider: string | null }>;
type State =
  | { status: "loading" }
  | { status: "signed_out" }
  | { status: "error" }
  | { status: "ready"; identity: Item; backgroundCheck: Item };

// Worker-facing labels + next step. Simple language; never implies verified unless the
// server says so.
const STATUS_LABEL: Record<string, string> = {
  unverified: "Not started",
  pending: "In review",
  verified: "Verified ✓",
  review: "Needs review",
  expired: "Expired",
  rejected: "Not approved"
};
function nextStep(kind: "identity" | "background_check", status: string): string {
  if (status === "verified") return "You're all set.";
  if (status === "pending") return "We're reviewing this now. No action needed.";
  if (status === "review") return "Our team is taking a closer look.";
  if (status === "expired") return "This has expired — start it again to stay eligible.";
  if (status === "rejected") return "This wasn't approved. Contact support if you think this is a mistake.";
  return kind === "identity" ? "Verify your identity to build trust with employers." : "Complete a background check where required for a role.";
}

export function VerificationPanel() {
  const [state, setState] = useState<State>({ status: "loading" });
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/verification", { cache: "no-store" });
      if (r.status === 401) return setState({ status: "signed_out" });
      if (!r.ok) return setState({ status: "error" });
      const payload = (await r.json()) as { identity: Item; backgroundCheck: Item };
      setState({ status: "ready", identity: payload.identity, backgroundCheck: payload.backgroundCheck });
    } catch {
      setState({ status: "error" });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const request = useCallback(async (verificationType: "identity" | "background_check") => {
    setBusy(verificationType);
    try {
      const r = await fetch("/api/verification/request", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ verificationType }) });
      if (r.ok) await load();
    } finally {
      setBusy(null);
    }
  }, [load]);

  if (state.status === "loading") return <div className="state">Loading…</div>;
  if (state.status === "signed_out")
    return (
      <div className="state">
        Please sign in to manage verification.
        <div style={{ marginTop: 12 }}><a className="btn" href="/">Go to search</a></div>
      </div>
    );
  if (state.status === "error") return <div className="state error" role="alert">We couldn&apos;t load your verification.</div>;

  return (
    <>
      <section className="hero">
        <h1>Verification</h1>
        <p>Build trust with employers. JobLop shares only your verification status — never your documents.</p>
      </section>

      <div className="results" style={{ paddingBottom: 48 }}>
        <VerificationCard kind="identity" title="Identity" item={state.identity} busy={busy === "identity"} onRequest={() => request("identity")} />
        <VerificationCard kind="background_check" title="Background check" item={state.backgroundCheck} busy={busy === "background_check"} onRequest={() => request("background_check")} />
      </div>

      <p className="notice">
        What JobLop shares with employers: only a trust indicator such as “Identity verified”. Your
        personal documents and detailed results are never shown to employers.
      </p>
    </>
  );
}

function VerificationCard({ kind, title, item, busy, onRequest }: { kind: "identity" | "background_check"; title: string; item: Item; busy: boolean; onRequest: () => void }) {
  const canStart = item.status === "unverified" || item.status === "expired" || item.status === "rejected";
  return (
    <article className="card">
      <div className="role">{title}</div>
      <div className="chips">
        <span className={`chip status-${item.status}`}>{STATUS_LABEL[item.status] ?? item.status}</span>
        {item.expiresAt && item.status === "verified" ? <span className="chip">Valid until {new Date(item.expiresAt).toLocaleDateString()}</span> : null}
      </div>
      <p className="when">{nextStep(kind, item.status)}</p>
      {canStart ? (
        <button className="btn" type="button" onClick={onRequest} disabled={busy} style={{ alignSelf: "flex-start" }}>
          {busy ? "Starting…" : item.status === "expired" ? "Renew" : "Start verification"}
        </button>
      ) : null}
    </article>
  );
}
