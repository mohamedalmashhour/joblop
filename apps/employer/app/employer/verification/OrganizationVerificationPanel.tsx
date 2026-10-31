"use client";

import { useCallback, useEffect, useState } from "react";

type Verification = Readonly<{ status: string; requestedAt: string | null; completedAt: string | null; expiresAt: string | null; provider: string | null }>;
type State =
  | { status: "loading" }
  | { status: "organization_required" }
  | { status: "denied" }
  | { status: "unavailable" }
  | { status: "ready"; verification: Verification };

const STATUS_COPY: Record<string, string> = {
  unverified: "Not started. Request verification to begin.",
  pending: "In review. Our verification partner and team are checking your organization.",
  business_verified: "Verified ✓ — your organization shows the Verified Employer badge in the marketplace.",
  review_required: "A closer review is needed. Our team will follow up.",
  suspended: "Verification is suspended. Contact support.",
  expired: "Verification has expired — renew to keep the badge."
};

export function OrganizationVerificationPanel() {
  const [state, setState] = useState<State>({ status: "loading" });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/organization-verification", { cache: "no-store" });
      if (r.status === 409) return setState({ status: "organization_required" });
      if (r.status === 401 || r.status === 403) return setState({ status: "denied" });
      if (!r.ok) return setState({ status: "unavailable" });
      const verification = (await r.json()) as Verification;
      setState({ status: "ready", verification });
    } catch {
      setState({ status: "unavailable" });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const request = useCallback(async () => {
    setBusy(true);
    try {
      const r = await fetch("/api/organization-verification", { method: "POST" });
      if (r.ok) await load();
    } finally {
      setBusy(false);
    }
  }, [load]);

  if (state.status === "loading") return <p aria-live="polite" style={text}>Loading verification…</p>;
  if (state.status === "organization_required") return <p style={text}>Select an organization to view verification.</p>;
  if (state.status === "denied") return <p style={text}>Organization owner or administrator access is required.</p>;
  if (state.status === "unavailable") return <p role="alert" style={text}>Verification is unavailable. Please try again.</p>;

  const v = state.verification;
  const canRequest = v.status === "unverified" || v.status === "expired";
  const verified = v.status === "business_verified";

  return (
    <div style={card}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <span style={verified ? badgeGood : badgeNeutral}>
          {verified ? "✓ Verified Employer" : v.status.replaceAll("_", " ")}
        </span>
        {v.expiresAt && verified ? <span style={dim}>Valid until {new Date(v.expiresAt).toLocaleDateString()}</span> : null}
      </div>
      <p style={text}>{STATUS_COPY[v.status] ?? v.status}</p>
      {canRequest ? (
        <button type="button" onClick={request} disabled={busy} style={button}>
          {busy ? "Starting…" : v.status === "expired" ? "Renew verification" : "Request verification"}
        </button>
      ) : null}
      <p style={dim}>Workers and the marketplace see only your trust indicator — never internal documents or provider details.</p>
    </div>
  );
}

const card: React.CSSProperties = { background: "#fff", border: "1px solid #ece3d2", borderRadius: 14, padding: 20, display: "flex", flexDirection: "column", gap: 12, maxWidth: 620 };
const text: React.CSSProperties = { color: "#1c1812", margin: 0, lineHeight: 1.55 };
const dim: React.CSSProperties = { color: "#7a7060", fontSize: 13, margin: 0 };
const badgeGood: React.CSSProperties = { background: "#dcfce7", color: "#15803d", borderRadius: 999, padding: "5px 14px", fontWeight: 700, fontSize: 14 };
const badgeNeutral: React.CSSProperties = { background: "#eef2f7", color: "#3a3326", borderRadius: 999, padding: "5px 14px", fontWeight: 700, fontSize: 14, textTransform: "capitalize" };
const button: React.CSSProperties = { alignSelf: "flex-start", background: "#a8842f", color: "#fff", border: "none", borderRadius: 8, padding: "10px 16px", fontSize: 14, fontWeight: 700, cursor: "pointer" };
