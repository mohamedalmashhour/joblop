"use client";

import { useCallback, useEffect, useState } from "react";

type Cred = Readonly<{ id: string; credentialType: string; expiresAt: string | null; effectiveStatus: string }>;
type State =
  | { status: "loading" }
  | { status: "signed_out" }
  | { status: "error" }
  | { status: "ready"; standing: string; credentials: readonly Cred[] };

const STANDING_COPY: Record<string, string> = {
  active: "Active — you can participate on JobLop.",
  review_required: "Under review — our team is reviewing your profile.",
  restricted: "Restricted — some actions are limited. Check any required steps below.",
  suspended: "Suspended — please contact support.",
  inactive: "Inactive."
};
const CRED_COPY: Record<string, string> = {
  valid: "Valid",
  expiring: "Expiring soon — please renew",
  expired: "Expired — action needed",
  replaced: "Replaced",
  revoked: "Revoked"
};

export function MyHrProfile() {
  const [state, setState] = useState<State>({ status: "loading" });

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/hr", { cache: "no-store" });
      if (r.status === 401) return setState({ status: "signed_out" });
      if (!r.ok) return setState({ status: "error" });
      const payload = (await r.json()) as { standing: string; credentials: Cred[] };
      setState({ status: "ready", standing: payload.standing, credentials: payload.credentials });
    } catch {
      setState({ status: "error" });
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  if (state.status === "loading") return <div className="state">Loading…</div>;
  if (state.status === "signed_out")
    return <div className="state">Please sign in to see your HR profile.<div style={{ marginTop: 12 }}><a className="btn" href="/">Go to search</a></div></div>;
  if (state.status === "error") return <div className="state error" role="alert">We couldn&apos;t load your HR profile.</div>;

  const needsAction = state.credentials.filter((c) => c.effectiveStatus === "expired" || c.effectiveStatus === "expiring");

  return (
    <>
      <section className="hero">
        <h1>My HR profile</h1>
        <p>Your standing and credentials with JobLop.</p>
      </section>

      <div className="card" style={{ marginBottom: 14 }}>
        <div className="role">Standing</div>
        <div className="chips">
          <span className={`chip status-${state.standing}`}>{state.standing.replaceAll("_", " ")}</span>
        </div>
        <p className="when">{STANDING_COPY[state.standing] ?? state.standing}</p>
      </div>

      {needsAction.length > 0 ? (
        <div className="card" style={{ marginBottom: 14, borderColor: "var(--danger)" }}>
          <div className="role">Required actions</div>
          <p className="when">Some credentials need attention:</p>
          <div className="chips">
            {needsAction.map((c) => <span key={c.id} className={`chip status-${c.effectiveStatus === "expired" ? "rejected" : "pending"}`}>{c.credentialType}: {CRED_COPY[c.effectiveStatus]}</span>)}
          </div>
        </div>
      ) : null}

      <div className="results" style={{ paddingBottom: 48 }}>
        <div className="role" style={{ marginBottom: 4 }}>Credentials</div>
        {state.credentials.length === 0 ? (
          <div className="state">No credentials on file yet.</div>
        ) : (
          state.credentials.map((c) => (
            <article key={c.id} className="card">
              <div className="role">{c.credentialType}</div>
              <div className="chips">
                <span className={`chip status-${badgeClass(c.effectiveStatus)}`}>{CRED_COPY[c.effectiveStatus] ?? c.effectiveStatus}</span>
                {c.expiresAt ? <span className="chip">Expires {new Date(c.expiresAt).toLocaleDateString()}</span> : null}
              </div>
            </article>
          ))
        )}
      </div>

      <p className="notice">JobLop shares only your standing and credential status where policy allows. Internal HR notes are never shown here.</p>
    </>
  );
}

function badgeClass(status: string): string {
  if (status === "valid") return "verified";
  if (status === "expiring") return "pending";
  if (status === "expired" || status === "revoked") return "rejected";
  return "unverified";
}
