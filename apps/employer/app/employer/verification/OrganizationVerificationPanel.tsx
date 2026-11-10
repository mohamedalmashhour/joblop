"use client";

import { useCallback, useEffect, useState } from "react";
import { fmtLocale, useLocale, useT } from "../../i18n/LocaleProvider";
import type { MessageKey } from "../../i18n/messages";

type Verification = Readonly<{ status: string; requestedAt: string | null; completedAt: string | null; expiresAt: string | null; provider: string | null }>;
type State =
  | { status: "loading" }
  | { status: "organization_required" }
  | { status: "denied" }
  | { status: "unavailable" }
  | { status: "ready"; verification: Verification };

const KNOWN_STATUSES = ["unverified", "pending", "business_verified", "review_required", "suspended", "expired"] as const;
type KnownStatus = (typeof KNOWN_STATUSES)[number];
const isKnownStatus = (value: string): value is KnownStatus => (KNOWN_STATUSES as readonly string[]).includes(value);

export function OrganizationVerificationPanel() {
  const t = useT();
  const locale = useLocale();
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

  if (state.status === "loading") return <p aria-live="polite" style={text}>{t("verify.loading")}</p>;
  if (state.status === "organization_required") return <p style={text}>{t("verify.orgRequired")}</p>;
  if (state.status === "denied") return <p style={text}>{t("verify.denied")}</p>;
  if (state.status === "unavailable") return <p role="alert" style={text}>{t("verify.unavailable")}</p>;

  const v = state.verification;
  const canRequest = v.status === "unverified" || v.status === "expired";
  const verified = v.status === "business_verified";
  const known = isKnownStatus(v.status) ? v.status : null;

  return (
    <div style={card}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <span style={verified ? badgeGood : badgeNeutral}>
          {known ? t(`verify.badge.${known}` as MessageKey) : v.status.replaceAll("_", " ")}
        </span>
        {v.expiresAt && verified ? (
          <span style={dim}>{t("verify.validUntil", { date: new Date(v.expiresAt).toLocaleDateString(fmtLocale(locale)) })}</span>
        ) : null}
      </div>
      <p style={text}>{known ? t(`verify.status.${known}` as MessageKey) : v.status}</p>
      {canRequest ? (
        <button type="button" onClick={request} disabled={busy} style={button}>
          {busy ? t("verify.starting") : v.status === "expired" ? t("verify.renew") : t("verify.request")}
        </button>
      ) : null}
      <p style={dim}>{t("verify.privacy")}</p>
    </div>
  );
}

const card: React.CSSProperties = { background: "#0c0c0c", border: "1px solid rgba(248, 184, 8, 0.16)", borderRadius: 14, padding: 20, display: "flex", flexDirection: "column", gap: 12, maxWidth: 620 };
const text: React.CSSProperties = { color: "#f4efe4", margin: 0, lineHeight: 1.55 };
const dim: React.CSSProperties = { color: "#b3a894", fontSize: 13, margin: 0 };
const badgeGood: React.CSSProperties = { background: "#dcfce7", color: "#15803d", borderRadius: 999, padding: "5px 14px", fontWeight: 700, fontSize: 14 };
const badgeNeutral: React.CSSProperties = { background: "rgba(248, 184, 8, 0.14)", color: "#f4efe4", border: "1px solid rgba(248, 184, 8, 0.3)", borderRadius: 999, padding: "5px 14px", fontWeight: 700, fontSize: 14, textTransform: "capitalize" };
const button: React.CSSProperties = { alignSelf: "flex-start", background: "#f8b808", color: "#000", border: "none", borderRadius: 8, padding: "10px 16px", fontSize: 14, fontWeight: 700, cursor: "pointer" };
