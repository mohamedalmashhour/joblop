"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { crmApi, type Lead } from "../crmClient";
import { ui } from "../ui";

export function LeadsList() {
  const router = useRouter();
  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await crmApi.listLeads();
      setLeads(data.leads);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load leads.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function importLead(lead: Lead) {
    setImporting(lead.id);
    setError(null);
    try {
      const result = await crmApi.importLead(lead.id);
      router.push(`/contacts/${result.contact.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not import this lead.");
      setImporting(null);
    }
  }

  return (
    <div>
      <header style={styles.head}>
        <h1 style={styles.title}>Importable leads</h1>
        <p style={styles.lede}>
          External job leads (read-only) that are not yet in the pipeline. Importing creates a lead contact — it never
          edits the source lead and never sends anything.
        </p>
      </header>

      {error ? <p style={styles.error}>{error}</p> : null}

      {leads === null ? (
        <p style={{ color: ui.muted }}>Loading…</p>
      ) : leads.length === 0 ? (
        <p style={{ color: ui.muted }}>No un-imported leads.</p>
      ) : (
        <ul style={styles.list}>
          {leads.map((lead) => (
            <li key={lead.id} style={styles.item}>
              <div style={styles.itemBody}>
                <p style={styles.itemTitle}>{lead.title}</p>
                <p style={styles.itemMeta}>
                  {[lead.employer, lead.location].filter(Boolean).join(" · ") || "—"}
                </p>
              </div>
              <button type="button" onClick={() => importLead(lead)} disabled={importing === lead.id} style={styles.import}>
                {importing === lead.id ? "Importing…" : "Import"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const styles = {
  head: { marginBottom: 20 },
  title: { fontSize: "clamp(26px, 4vw, 38px)", margin: 0 },
  lede: { color: ui.muted, fontSize: 14, margin: "6px 0 0", maxWidth: 680 },
  list: { display: "grid", gap: 10, listStyle: "none", margin: 0, padding: 0 },
  item: {
    alignItems: "center",
    background: ui.raised,
    border: `1px solid ${ui.hairlineSoft}`,
    borderRadius: 12,
    display: "flex",
    gap: 16,
    justifyContent: "space-between",
    padding: "14px 16px"
  },
  itemBody: { display: "grid", gap: 2 },
  itemTitle: { color: ui.text, fontSize: 15, fontWeight: 700, margin: 0 },
  itemMeta: { color: ui.muted, fontSize: 13, margin: 0 },
  import: { background: ui.gold, border: "none", borderRadius: 9, color: ui.onGold, cursor: "pointer", fontSize: 13, fontWeight: 800, padding: "9px 18px" },
  error: { color: "#ff9d9d", fontSize: 14, marginBottom: 12 }
} as const;
