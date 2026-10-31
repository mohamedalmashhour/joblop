"use client";

import { useCallback, useEffect, useState } from "react";

type Role = Readonly<{ id: string; displayLabel: string }>;
type Reference = Readonly<{ id: string; roleDefinitionId: string; province: string; medianHourlyRateMinor: number; currency: string; source: string | null; updatedAt: string }>;
type State = { status: "loading" } | { status: "denied" } | { status: "error" } | { status: "ready" };

export function AdminMarketWagesPanel() {
  const [state, setState] = useState<State>({ status: "loading" });
  const [roles, setRoles] = useState<readonly Role[]>([]);
  const [refs, setRefs] = useState<readonly Reference[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ roleDefinitionId: "", province: "QC", dollars: "", source: "" });

  const load = useCallback(async () => {
    try {
      const [mwRes, roleRes] = await Promise.all([
        fetch("/api/market-wages", { cache: "no-store" }),
        fetch("/api/role-definitions", { cache: "no-store" })
      ]);
      if (mwRes.status === 401 || mwRes.status === 403) return setState({ status: "denied" });
      if (!mwRes.ok) return setState({ status: "error" });
      setRefs(((await mwRes.json()) as { marketWages: Reference[] }).marketWages ?? []);
      if (roleRes.ok) {
        const payload = (await roleRes.json()) as { roleDefinitions?: { id: string; displayLabel?: string }[] };
        setRoles((payload.roleDefinitions ?? []).map((r) => ({ id: r.id, displayLabel: r.displayLabel ?? r.id })));
      }
      setState({ status: "ready" });
    } catch {
      setState({ status: "error" });
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const save = useCallback(async () => {
    const dollars = Number(form.dollars);
    if (!form.roleDefinitionId || !form.province || !Number.isFinite(dollars) || dollars < 0) {
      setMessage("Select a role, a province and a non-negative hourly rate.");
      return;
    }
    setBusy(true);
    setMessage("Saving the reference.");
    try {
      const response = await fetch("/api/market-wages", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          roleDefinitionId: form.roleDefinitionId,
          province: form.province.trim().toUpperCase(),
          medianHourlyRateMinor: Math.round(dollars * 100),
          currency: "CAD",
          source: form.source.trim() || null
        })
      });
      if (!response.ok) { setMessage("The reference could not be saved."); return; }
      setMessage("Saved.");
      setForm((f) => ({ ...f, dollars: "", source: "" }));
      await load();
    } finally {
      setBusy(false);
    }
  }, [form, load]);

  if (state.status === "loading") return <p style={styles.text}>Loading market-wage references.</p>;
  if (state.status === "denied") return <p style={styles.text}>Administrator access required.</p>;
  if (state.status === "error") return <p style={styles.text}>The market-wage references could not be reached.</p>;

  const roleLabel = (id: string) => roles.find((r) => r.id === id)?.displayLabel ?? id.slice(0, 8);

  return (
    <section style={styles.wrap}>
      {message ? <p style={styles.notice} role="status">{message}</p> : null}

      <article style={styles.card}>
        <h2 style={styles.h2}>Set a reference</h2>
        <div style={styles.formRow}>
          <label style={styles.label}>Role
            <select style={styles.input} value={form.roleDefinitionId} onChange={(e) => setForm((f) => ({ ...f, roleDefinitionId: e.target.value }))}>
              <option value="">Select a role</option>
              {roles.map((r) => <option key={r.id} value={r.id}>{r.displayLabel}</option>)}
            </select>
          </label>
          <label style={styles.label}>Province
            <input style={styles.input} value={form.province} maxLength={8} onChange={(e) => setForm((f) => ({ ...f, province: e.target.value }))} />
          </label>
          <label style={styles.label}>Market rate ($/hr)
            <input style={styles.input} type="number" min={0} step="0.01" value={form.dollars} onChange={(e) => setForm((f) => ({ ...f, dollars: e.target.value }))} />
          </label>
          <label style={styles.label}>Source (optional)
            <input style={styles.input} value={form.source} onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))} />
          </label>
          <button type="button" style={styles.button} disabled={busy} onClick={() => void save()}>Save reference</button>
        </div>
      </article>

      <h2 style={styles.h2}>Current references</h2>
      {refs.length === 0 ? (
        <p style={styles.text}>No references set yet.</p>
      ) : (
        <table style={styles.table}>
          <thead>
            <tr><th style={styles.th}>Role</th><th style={styles.th}>Province</th><th style={styles.th}>Rate</th><th style={styles.th}>Source</th></tr>
          </thead>
          <tbody>
            {refs.map((r) => (
              <tr key={r.id}>
                <td style={styles.td}>{roleLabel(r.roleDefinitionId)}</td>
                <td style={styles.td}>{r.province}</td>
                <td style={styles.td}>{(r.medianHourlyRateMinor / 100).toLocaleString("en-CA", { style: "currency", currency: r.currency })}/hr</td>
                <td style={styles.td}>{r.source ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

const styles = {
  wrap: { padding: "32px clamp(18px, 5vw, 64px)" },
  card: { background: "#fff", border: "1px solid #faf6ec", borderRadius: 14, boxShadow: "0 12px 30px rgba(6,27,65,.08)", marginBottom: 18, padding: 22 },
  h2: { color: "#000000", fontSize: 22 },
  formRow: { alignItems: "flex-end", display: "flex", flexWrap: "wrap" as const, gap: 12 },
  label: { color: "#171511", display: "flex", flexDirection: "column" as const, fontSize: 13, fontWeight: 700, gap: 4 },
  input: { border: "1px solid #ece3d2", borderRadius: 8, minHeight: 40, padding: "0 10px" },
  button: { alignItems: "center", background: "#171511", border: "none", borderRadius: 8, color: "#fff", cursor: "pointer", display: "inline-flex", fontWeight: 800, minHeight: 44, padding: "0 16px" },
  text: { color: "#171511", fontSize: 15 },
  notice: { color: "#171511", fontSize: 14, fontWeight: 700 },
  table: { background: "#fff", border: "1px solid #faf6ec", borderCollapse: "collapse" as const, borderRadius: 14, width: "100%" },
  th: { borderBottom: "1px solid #faf6ec", color: "#171511", fontSize: 12, padding: 10, textAlign: "left" as const, textTransform: "uppercase" as const },
  td: { borderBottom: "1px solid #fbf9f4", color: "#171511", fontSize: 14, padding: 10 }
} as const;
