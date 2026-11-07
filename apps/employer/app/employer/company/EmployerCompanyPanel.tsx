"use client";

import { useCallback, useEffect, useState } from "react";
import type { CompanyDetails } from "../../api/organizations/current/companyDetails";
import { useT } from "../../i18n/LocaleProvider";
import { styles } from "../employerStyles";

type State =
  | { status: "loading" }
  | { status: "setup_required" }
  | { status: "error" }
  | { status: "ready"; company: CompanyDetails };

export function EmployerCompanyPanel() {
  const t = useT();
  const [state, setState] = useState<State>({ status: "loading" });
  const [displayName, setDisplayName] = useState("");
  const [legalName, setLegalName] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const show = useCallback((company: CompanyDetails) => {
    setDisplayName(company.displayName);
    setLegalName(company.legalName);
    setState({ status: "ready", company });
  }, []);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/organizations/current", { cache: "no-store" });
      if (response.status === 401) return window.location.replace("/signin");
      if (response.status === 409) return setState({ status: "setup_required" });
      if (!response.ok) return setState({ status: "error" });
      show(((await response.json()) as { company: CompanyDetails }).company);
    } catch {
      setState({ status: "error" });
    }
  }, [show]);

  useEffect(() => { void load(); }, [load]);

  if (state.status === "loading") {
    return <section style={styles.section}><p aria-live="polite" style={styles.cardText}>{t("home.loading")}</p></section>;
  }
  if (state.status === "error") {
    return <section style={styles.section}><p style={styles.cardText}>{t("company.loadError")}</p></section>;
  }
  if (state.status === "setup_required") {
    return (
      <section style={styles.section}>
        <p style={styles.cardText}>{t("home.setupBody")}</p>
        <a href="/employer/onboarding/company" style={styles.primaryButton}>{t("home.setupAction")}</a>
      </section>
    );
  }

  const { company } = state;
  const unchanged = displayName.trim() === company.displayName && legalName.trim() === company.legalName;
  const blank = !displayName.trim() || !legalName.trim();

  async function save() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/organizations/current", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ displayName, legalName, expectedVersion: company.version })
      });
      if (response.status === 409) {
        await load();
        return setMessage(t("company.conflict"));
      }
      if (!response.ok) return setMessage(t("company.saveError"));
      show(((await response.json()) as { company: CompanyDetails }).company);
      setMessage(t("company.saved"));
    } catch {
      setMessage(t("company.saveError"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section style={styles.section}>
      <div style={{ ...styles.panel, display: "grid", gap: 16, maxWidth: 620 }}>
        <label style={styles.fieldLabel}>
          {t("company.displayName")}
          <input maxLength={200} onChange={(event) => setDisplayName(event.target.value)} style={styles.input} value={displayName} />
          <span style={styles.cardText}>{t("company.displayNameNote")}</span>
        </label>
        <label style={styles.fieldLabel}>
          {t("company.legalName")}
          <input maxLength={200} onChange={(event) => setLegalName(event.target.value)} style={styles.input} value={legalName} />
          <span style={styles.cardText}>{t("company.legalNameNote")}</span>
        </label>
        <p style={styles.cardText}>{t("company.reference", { id: company.publicId })}</p>
        <div style={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: 12 }}>
          <button
            disabled={busy || unchanged || blank}
            onClick={() => void save()}
            style={busy || unchanged || blank ? styles.disabledAction : styles.primaryButton}
            type="button"
          >
            {busy ? t("company.saving") : t("company.save")}
          </button>
          <span aria-live="polite" role="status" style={styles.cardText}>{message}</span>
        </div>
      </div>
    </section>
  );
}
