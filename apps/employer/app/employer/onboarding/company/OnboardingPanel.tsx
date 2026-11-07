"use client";

import { useState } from "react";
import { activeCountry } from "@rwos/shared";
import { styles } from "../../employerStyles";

// Round 2c: real self-serve employer onboarding. Persists org → residence → department against the
// governed API (via BFF routes), auto-selecting the new org as the active context. On completion the
// employer can immediately create a staffing request. No fixtures, no localStorage.
type Step = "company" | "residence" | "department" | "done";

// Region codes come from the active country profile (F16 seam) — no hardcoded province list here.
const PROVINCES = activeCountry().regions.map((r) => r.code);

export function OnboardingPanel() {
  const [step, setStep] = useState<Step>("company");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [legalName, setLegalName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [resName, setResName] = useState("");
  const [province, setProvince] = useState("QC");
  const [city, setCity] = useState("");
  const [residenceId, setResidenceId] = useState("");
  const [deptName, setDeptName] = useState("");

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
            ? "We couldn't save that. Please try again, or contact Joblop if it keeps happening."
            : "Your session expired. Please sign in again."
        );
        return null;
      }
      if (!res.ok) { setError("That couldn't be saved. Check the details and try again."); return null; }
      return (await res.json().catch(() => ({}))) as Record<string, unknown>;
    } catch {
      setError("Something went wrong. Please try again.");
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
    if (!resName.trim() || !city.trim()) return;
    const out = await post("/api/residences", { name: resName.trim(), province, city: city.trim() });
    const id = (out?.residence as { id?: string } | undefined)?.id;
    if (out && id) { setResidenceId(id); setStep("department"); }
    else if (out) setError("The residence was saved but no id came back. Refresh and continue.");
  }
  async function createDepartment() {
    if (!deptName.trim() || !residenceId) return;
    const out = await post(`/api/residences/${encodeURIComponent(residenceId)}/departments`, { name: deptName.trim() });
    if (out) setStep("done");
  }

  return (
    <section style={styles.section}>
      <div style={styles.sectionHeader}>
        <p style={styles.eyebrowDark}>Set up your organization</p>
        <h2 style={styles.sectionTitle}>
          {step === "company" ? "Step 1 of 3 — your company"
            : step === "residence" ? "Step 2 of 3 — your first site / residence"
            : step === "department" ? "Step 3 of 3 — a department"
            : "You're set up"}
        </h2>
      </div>

      {error ? <p role="alert" style={styles.warning}>{error}</p> : null}

      {step === "company" ? (
        <div style={styles.formGrid}>
          <label style={styles.fieldLabel}>
            Public display name
            <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Worker-facing name (e.g. Oak Hill Care)" style={styles.input} />
          </label>
          <label style={styles.fieldLabel}>
            Legal organization name
            <input value={legalName} onChange={(e) => setLegalName(e.target.value)} placeholder="Legal entity name" style={styles.input} />
          </label>
          <button type="button" disabled={busy || !legalName.trim() || !displayName.trim()} onClick={() => void createOrg()} style={styles.primaryButton}>
            {busy ? "Creating…" : "Create organization"}
          </button>
        </div>
      ) : null}

      {step === "residence" ? (
        <div style={styles.formGrid}>
          <p style={styles.cardText}>Your organization is created. Add your first site (a residence/location where shifts happen).</p>
          <label style={styles.fieldLabel}>
            Site / residence name
            <input value={resName} onChange={(e) => setResName(e.target.value)} placeholder="e.g. Oak Hill Residence" style={styles.input} />
          </label>
          <label style={styles.fieldLabel}>
            Province
            <select value={province} onChange={(e) => setProvince(e.target.value)} style={styles.input}>
              {PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </label>
          <label style={styles.fieldLabel}>
            City
            <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Laval" style={styles.input} />
          </label>
          <button type="button" disabled={busy || !resName.trim() || !city.trim()} onClick={() => void createResidence()} style={styles.primaryButton}>
            {busy ? "Saving…" : "Add site"}
          </button>
        </div>
      ) : null}

      {step === "department" ? (
        <div style={styles.formGrid}>
          <p style={styles.cardText}>Add a department for this site (e.g. the unit staffing requests belong to).</p>
          <label style={styles.fieldLabel}>
            Department name
            <input value={deptName} onChange={(e) => setDeptName(e.target.value)} placeholder="e.g. Care / Housekeeping" style={styles.input} />
          </label>
          <button type="button" disabled={busy || !deptName.trim()} onClick={() => void createDepartment()} style={styles.primaryButton}>
            {busy ? "Saving…" : "Add department"}
          </button>
        </div>
      ) : null}

      {step === "done" ? (
        <div style={styles.formGrid}>
          <p style={styles.cardText}>
            Your organization, first site, and a department are set up and saved. You can now create a staffing request.
          </p>
          <a href="/employer/calendar/create" style={styles.primaryButton}>Create your first staffing request</a>
          <a href="/employer/onboarding/residences" style={styles.secondaryButton}>Add more sites</a>
        </div>
      ) : null}
    </section>
  );
}
