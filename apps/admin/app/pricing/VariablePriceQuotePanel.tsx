"use client";

import { useCallback, useState } from "react";

type DistanceSurcharge = Readonly<{ billableKm: number; gasMinor: number; travelTimeMinor: number; totalMinor: number }>;
type Quote = Readonly<{
  labourClientMinor: number;
  allowancesClientMinor: number;
  emergencySurchargeMinor: number;
  distanceSurcharge: DistanceSurcharge;
  distanceWorkerMinor: number;
  distancePlatformMinor: number;
  demandUpliftMinor: number;
  clientSubtotalMinor: number;
  platformKeptExtrasMinor: number;
  workerExtrasMinor: number;
}>;

const money = (minor: number) => (minor / 100).toLocaleString("en-CA", { style: "currency", currency: "CAD" });

export function VariablePriceQuotePanel() {
  const [form, setForm] = useState({
    rate: "50",
    hours: "6",
    urgency: "scheduled",
    distanceKm: "10",
    transport: "0",
    ceiling: "",
    demand: "0"
  });
  const [quote, setQuote] = useState<Quote | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const run = useCallback(async () => {
    const rate = Number(form.rate);
    const hours = Number(form.hours);
    if (!Number.isFinite(rate) || rate <= 0 || !Number.isFinite(hours) || hours <= 0) {
      setMessage("Enter a positive hourly rate and hours.");
      return;
    }
    const ceiling = Number(form.ceiling);
    const demand = Number(form.demand);
    const body: Record<string, unknown> = {
      employerHourlyRateMinor: Math.round(rate * 100),
      hours,
      urgency: form.urgency,
      distanceKm: Number(form.distanceKm) || 0,
      allowancesClientMinor: Math.round((Number(form.transport) || 0) * 100)
    };
    if (Number.isFinite(ceiling) && ceiling > 0) body.willingnessCeilingMinor = Math.round(ceiling * 100);
    if (Number.isFinite(demand) && demand > 0) body.demandSignal = Math.max(0, Math.min(1, demand));
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch("/api/pricing/quote", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body)
      });
      if (res.status === 401 || res.status === 403) { setMessage("Administrator access required."); return; }
      if (!res.ok) { setMessage("The quote could not be computed."); return; }
      setQuote(((await res.json()) as { quote: Quote }).quote);
    } catch {
      setMessage("The pricing service could not be reached.");
    } finally {
      setBusy(false);
    }
  }, [form]);

  return (
    <section style={styles.wrap}>
      <article style={styles.card}>
        <h2 style={styles.h2}>Job inputs</h2>
        <div style={styles.formRow}>
          <label style={styles.label}>Client rate ($/hr)
            <input style={styles.input} type="number" min={0} step="0.01" value={form.rate} onChange={(e) => set("rate")(e.target.value)} />
          </label>
          <label style={styles.label}>Hours
            <input style={styles.input} type="number" min={0} step="0.5" value={form.hours} onChange={(e) => set("hours")(e.target.value)} />
          </label>
          <label style={styles.label}>Urgency
            <select style={styles.input} value={form.urgency} onChange={(e) => set("urgency")(e.target.value)}>
              <option value="scheduled">Scheduled (normal)</option>
              <option value="urgent">Urgent (+15%)</option>
              <option value="immediate">Immediate (+30%)</option>
            </select>
          </label>
          <label style={styles.label}>Distance from base (km)
            <input style={styles.input} type="number" min={0} step="1" value={form.distanceKm} onChange={(e) => set("distanceKm")(e.target.value)} />
          </label>
          <label style={styles.label}>Funded transport ($)
            <input style={styles.input} type="number" min={0} step="0.01" value={form.transport} onChange={(e) => set("transport")(e.target.value)} />
          </label>
          <label style={styles.label}>Client will-pay ceiling ($)
            <input style={styles.input} type="number" min={0} step="0.01" placeholder="optional" value={form.ceiling} onChange={(e) => set("ceiling")(e.target.value)} />
          </label>
          <label style={styles.label}>Demand (0–1)
            <input style={styles.input} type="number" min={0} max={1} step="0.1" value={form.demand} onChange={(e) => set("demand")(e.target.value)} />
          </label>
          <button type="button" style={styles.button} disabled={busy} onClick={() => void run()}>{busy ? "Computing…" : "Compute quote"}</button>
        </div>
        {message ? <p style={styles.notice} role="status">{message}</p> : null}
      </article>

      {quote ? (
        <article style={styles.card}>
          <h2 style={styles.h2}>Client quote (pre-tax)</h2>
          <table style={styles.table}>
            <tbody>
              <tr><td style={styles.td}>Labour</td><td style={styles.tdNum}>{money(quote.labourClientMinor)}</td><td style={styles.tdNote}>base margin split</td></tr>
              <tr><td style={styles.td}>Funded transport allowance</td><td style={styles.tdNum}>{money(quote.allowancesClientMinor)}</td><td style={styles.tdNote}>funds worker</td></tr>
              <tr><td style={styles.td}>Emergency surcharge</td><td style={styles.tdNum}>{money(quote.emergencySurchargeMinor)}</td><td style={styles.tdKept}>platform keeps</td></tr>
              <tr><td style={styles.td}>Distance — gas ({quote.distanceSurcharge.billableKm} km)</td><td style={styles.tdNum}>{money(quote.distanceSurcharge.gasMinor)}</td><td style={styles.tdNote}>split 50/50</td></tr>
              <tr><td style={styles.td}>Distance — travel time</td><td style={styles.tdNum}>{money(quote.distanceSurcharge.travelTimeMinor)}</td><td style={styles.tdNote}>split 50/50</td></tr>
              <tr><td style={styles.td}>&nbsp;&nbsp;↳ distance split</td><td style={styles.tdNum}>{money(quote.distanceSurcharge.totalMinor)}</td><td style={styles.tdNote}>worker {money(quote.distanceWorkerMinor)} · platform {money(quote.distancePlatformMinor)}</td></tr>
              <tr><td style={styles.td}>Demand uplift (toward ceiling)</td><td style={styles.tdNum}>{money(quote.demandUpliftMinor)}</td><td style={styles.tdKept}>platform keeps</td></tr>
              <tr><td style={styles.tdTotal}>Client total (pre-tax)</td><td style={styles.tdNumTotal}>{money(quote.clientSubtotalMinor)}</td><td style={styles.tdNote}>GST/QST added at invoice</td></tr>
              <tr><td style={styles.tdTotal}>Extra platform keeps on top of base margin</td><td style={styles.tdNumTotal}>{money(quote.platformKeptExtrasMinor)}</td><td style={styles.tdNote}>emergency + demand + ½ distance</td></tr>
              <tr><td style={styles.tdTotal}>Extra to worker (travel)</td><td style={styles.tdNumTotal}>{money(quote.workerExtrasMinor)}</td><td style={styles.tdNote}>½ distance reimbursement</td></tr>
            </tbody>
          </table>
          <p style={styles.gate}>Quote only — no invoice is issued and no money moves (FINANCE_LIVE gated).</p>
        </article>
      ) : null}
    </section>
  );
}

const styles = {
  wrap: { padding: "32px clamp(18px, 5vw, 64px)" },
  card: { background: "#fff", border: "1px solid rgba(201, 162, 75, 0.16)", borderRadius: 14, boxShadow: "0 12px 30px rgba(6,27,65,.08)", marginBottom: 18, padding: 22 },
  h2: { color: "#000000", fontSize: 22, marginTop: 0 },
  formRow: { alignItems: "flex-end", display: "flex", flexWrap: "wrap" as const, gap: 12 },
  label: { color: "#f4efe4", display: "flex", flexDirection: "column" as const, fontSize: 13, fontWeight: 700, gap: 4 },
  input: { border: "1px solid rgba(201, 162, 75, 0.16)", borderRadius: 8, minHeight: 40, padding: "0 10px", width: 150 },
  button: { alignItems: "center", background: "#171511", border: "none", borderRadius: 8, color: "#fff", cursor: "pointer", display: "inline-flex", fontWeight: 800, minHeight: 44, padding: "0 16px" },
  notice: { color: "#b23b2e", fontSize: 14, fontWeight: 700, marginBottom: 0 },
  table: { background: "#fff", borderCollapse: "collapse" as const, width: "100%" },
  td: { borderBottom: "1px solid rgba(201, 162, 75, 0.16)", color: "#f4efe4", fontSize: 14, padding: 10 },
  tdNum: { borderBottom: "1px solid rgba(201, 162, 75, 0.16)", color: "#f4efe4", fontSize: 14, fontWeight: 700, padding: 10, textAlign: "right" as const, whiteSpace: "nowrap" as const },
  tdNote: { borderBottom: "1px solid rgba(201, 162, 75, 0.16)", color: "#f4efe4", fontSize: 12, padding: 10 },
  tdKept: { borderBottom: "1px solid rgba(201, 162, 75, 0.16)", color: "#f4efe4", fontSize: 12, fontWeight: 800, padding: 10 },
  tdTotal: { borderTop: "2px solid rgba(201, 162, 75, 0.16)", color: "#000000", fontSize: 15, fontWeight: 800, padding: 10 },
  tdNumTotal: { borderTop: "2px solid rgba(201, 162, 75, 0.16)", color: "#000000", fontSize: 15, fontWeight: 800, padding: 10, textAlign: "right" as const, whiteSpace: "nowrap" as const },
  gate: { color: "#f4efe4", fontSize: 12, fontStyle: "italic" as const, marginBottom: 0, marginTop: 14 }
} as const;
