"use client";

import { useEffect, useState } from "react";
import { activeCountry } from "@rwos/shared";
import { styles } from "../../employerStyles";
import { resumeStep, type SetupStep } from "./setupStep";
import { useLocale } from "../../../i18n/LocaleProvider";
import { langOf } from "../../../i18n/localText";
import { setupText } from "../onboardingText";

type SetupError = "errSaveRefused" | "errSession" | "errCheck" | "errGeneric" | "errPostal" | "errNoId";

// Round 2c: real self-serve employer onboarding. Persists org → residence → department against the
// governed API (via BFF routes), auto-selecting the new org as the active context. On completion the
// employer can immediately create a staffing request. No fixtures, no localStorage.

// Region codes come from the active country profile (F16 seam) — no hardcoded province list here.
const PROVINCES = activeCountry().regions.map((r) => r.code);

export function OnboardingPanel() {
  const tx = setupText[langOf(useLocale())];
  const [step, setStep] = useState<SetupStep>("company");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<SetupError | null>(null);

  const [legalName, setLegalName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [resName, setResName] = useState("");
  const [province, setProvince] = useState("QC");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [residenceId, setResidenceId] = useState("");
  const [deptName, setDeptName] = useState("");

  // Coming back to setup continues where this company left off.
  useEffect(() => {
    void (async () => {
      const company = await fetch("/api/organizations/current", { cache: "no-store" }).catch(() => null);
      if (!company?.ok) return;
      const sites = await fetch("/api/residences", { cache: "no-store" }).catch(() => null);
      const list = sites?.ok ? ((await sites.json()) as { residences?: { id: string }[] }).residences ?? [] : [];
      setResidenceId(list[0]?.id ?? "");
      setStep(resumeStep(true, list.length));
    })();
  }, []);

  async function post(url: string, body: unknown): Promise<Record<string, unknown> | null> {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      if (res.status === 401) {
        // The API refuses some requests the same way as a lost session, so check which this is.
        const session = await fetch("/api/session", { cache: "no-store" }).catch(() => null);
        setError(
          session?.ok
            ? "errSaveRefused"
            : "errSession"
        );
        return null;
      }
      if (!res.ok) { setError("errCheck"); return null; }
      return (await res.json().catch(() => ({}))) as Record<string, unknown>;
    } catch {
      setError("errGeneric");
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function createOrg() {
    if (!legalName.trim() || !displayName.trim()) return;
    const out = await post("/api/organizations", { legalName: legalName.trim(), displayName: displayName.trim() });
    if (out) setStep("residence");
  }
  async function createResidence() {
    if (!resName.trim() || !city.trim() || !postalCode.trim()) return;
    const out = await post("/api/residences", { name: resName.trim(), province, city: city.trim() });
    const id = (out?.residence as { id?: string } | undefined)?.id;
    if (out && id) {
      setResidenceId(id);
      setStep("department");
      const located = await post(`/api/residences/${encodeURIComponent(id)}/location`, { postalCode: postalCode.trim() });
      if (!located) setError("errPostal");
    }
    else if (out) setError("errNoId");
  }
  async function createDepartment() {
    if (!deptName.trim() || !residenceId) return;
    const out = await post(`/api/residences/${encodeURIComponent(residenceId)}/departments`, { name: deptName.trim() });
    if (out) setStep("done");
  }

  return (
    <section style={styles.section}>
      <div style={styles.sectionHeader}>
        <p style={styles.eyebrowDark}>{tx.eyebrow}</p>
        <h2 style={styles.sectionTitle}>
          {step === "company" ? tx.step1
            : step === "residence" ? tx.step2
            : step === "department" ? tx.step3
            : tx.done}
        </h2>
      </div>

      {error ? <p role="alert" style={styles.warning}>{tx[error]}</p> : null}

      {step === "company" ? (
        <div style={styles.formGrid}>
          <label style={styles.fieldLabel}>
            {tx.publicName}
            <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder={tx.publicNamePh} style={styles.input} />
          </label>
          <label style={styles.fieldLabel}>
            {tx.legalName}
            <input value={legalName} onChange={(e) => setLegalName(e.target.value)} placeholder={tx.legalNamePh} style={styles.input} />
          </label>
          <button type="button" disabled={busy || !legalName.trim() || !displayName.trim()} onClick={() => void createOrg()} style={styles.primaryButton}>
            {busy ? tx.creating : tx.createCompany}
          </button>
        </div>
      ) : null}

      {step === "residence" ? (
        <div style={styles.formGrid}>
          <p style={styles.cardText}>{tx.siteIntro}</p>
          <label style={styles.fieldLabel}>
            {tx.siteName}
            <input value={resName} onChange={(e) => setResName(e.target.value)} placeholder={tx.siteNamePh} style={styles.input} />
          </label>
          <label style={styles.fieldLabel}>
            {tx.province}
            <select value={province} onChange={(e) => setProvince(e.target.value)} style={styles.input}>
              {PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </label>
          <label style={styles.fieldLabel}>
            {tx.city}
            <input value={city} onChange={(e) => setCity(e.target.value)} placeholder={tx.cityPh} style={styles.input} />
          </label>
          <label style={styles.fieldLabel}>
            {tx.postalCode}
            <input value={postalCode} onChange={(e) => setPostalCode(e.target.value)} autoComplete="postal-code" placeholder={tx.postalCodePh} style={styles.input} />
          </label>
          <button type="button" disabled={busy || !resName.trim() || !city.trim() || !postalCode.trim()} onClick={() => void createResidence()} style={styles.primaryButton}>
            {busy ? tx.saving : tx.addSite}
          </button>
        </div>
      ) : null}

      {step === "department" ? (
        <div style={styles.formGrid}>
          <p style={styles.cardText}>{tx.deptIntro}</p>
          <label style={styles.fieldLabel}>
            {tx.deptName}
            <input value={deptName} onChange={(e) => setDeptName(e.target.value)} placeholder={tx.deptNamePh} style={styles.input} />
          </label>
          <button type="button" disabled={busy || !deptName.trim()} onClick={() => void createDepartment()} style={styles.primaryButton}>
            {busy ? tx.saving : tx.addDept}
          </button>
        </div>
      ) : null}

      {step === "done" ? (
        <div style={styles.formGrid}>
          <p style={styles.cardText}>{tx.doneBody}</p>
          <a href="/employer/contract" style={styles.primaryButton}>{tx.reviewContract}</a>
          <button onClick={() => { setResName(""); setCity(""); setStep("residence"); }} style={styles.secondaryButton} type="button">{tx.addAnotherSite}</button>
          {residenceId ? (
            <button onClick={() => { setDeptName(""); setStep("department"); }} style={styles.secondaryButton} type="button">{tx.addAnotherDept}</button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
