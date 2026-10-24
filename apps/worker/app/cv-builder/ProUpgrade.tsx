"use client";

import { useState } from "react";

type ETransfer = { email: string; amount: string; reference: string; note: string };
type Order = { id: string; status: string; method: string };

export function ProUpgrade() {
  const [step, setStep] = useState<"idle" | "instructions" | "claimed">("idle");
  const [order, setOrder] = useState<Order | null>(null);
  const [et, setEt] = useState<ETransfer | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const subscribe = async () => {
    setBusy(true); setMsg("");
    try {
      const res = await fetch("/api/cv/subscribe", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ method: "e_transfer" }) });
      if (!res.ok) { setMsg("Could not start the subscription."); return; }
      const d = (await res.json()) as { order: Order; eTransfer?: ETransfer };
      setOrder(d.order); setEt(d.eTransfer ?? null); setStep("instructions");
    } finally { setBusy(false); }
  };

  const claim = async () => {
    if (!order) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/cv/orders/${order.id}/claim-etransfer`, { method: "POST" });
      if (res.ok) setStep("claimed"); else setMsg("Could not record it — try again.");
    } finally { setBusy(false); }
  };

  return (
    <div style={styles.wrap}>
      <strong>Upgrade to Worker Pro — $12.99/month (CAD)</strong>
      <ul style={styles.benefits}>
        <li>AI-written CV tailored to each job + premium designs</li>
        <li>Priority access — the best-paying and emergency jobs first</li>
      </ul>

      {step === "idle" ? (
        <div style={styles.buttons}>
          <button type="button" style={styles.cta} disabled={busy} onClick={() => void subscribe()}>{busy ? "…" : "Pay by Interac e-transfer"}</button>
          <button type="button" style={styles.ctaGhost} disabled title="Card payments open soon">Pay by card (soon)</button>
        </div>
      ) : null}

      {step === "instructions" && et ? (
        <div style={styles.box}>
          <p style={{ margin: "0 0 8px" }}>Send an Interac e-transfer:</p>
          <ul style={styles.kv}>
            <li><span style={styles.k}>To</span><strong>{et.email}</strong></li>
            <li><span style={styles.k}>Amount</span><strong>{et.amount}</strong></li>
            <li><span style={styles.k}>Message / reference</span><strong>{et.reference}</strong></li>
          </ul>
          <p style={styles.hint}>Put the reference in the e-transfer message so we can match it to your account.</p>
          <button type="button" style={styles.cta} disabled={busy} onClick={() => void claim()}>{busy ? "…" : "I've sent it"}</button>
        </div>
      ) : null}

      {step === "claimed" ? (
        <div style={styles.ok}>✅ Thanks! We&rsquo;ll confirm your e-transfer and activate Worker Pro. You&rsquo;ll get priority jobs and AI CVs as soon as it&rsquo;s confirmed.</div>
      ) : null}

      {msg ? <p style={styles.err}>{msg}</p> : null}
      <p style={styles.billing}>Card payments aren&rsquo;t enabled yet — Interac e-transfer is confirmed manually by the team. No card is charged.</p>
    </div>
  );
}

const styles = {
  wrap: { background: "#fff6e6", border: "1px solid #f0d089", borderRadius: 10, color: "#8a5a00", fontSize: 13, lineHeight: 1.5, marginTop: 16, padding: "14px 16px" },
  benefits: { margin: "8px 0 12px", paddingLeft: 18 },
  buttons: { display: "flex", flexWrap: "wrap" as const, gap: 10 },
  cta: { background: "#0f7f78", border: "none", borderRadius: 8, color: "#fff", cursor: "pointer", fontWeight: 800, padding: "10px 16px" },
  ctaGhost: { background: "#fff", border: "1px solid #c9b27a", borderRadius: 8, color: "#a07a2a", cursor: "not-allowed", fontWeight: 700, padding: "10px 16px" },
  box: { background: "#fffdf7", border: "1px solid #ecd9a8", borderRadius: 8, marginTop: 10, padding: 12 },
  kv: { listStyle: "none", margin: "0 0 6px", padding: 0 },
  k: { color: "#a07a2a", display: "inline-block", fontSize: 12, width: 160 },
  hint: { color: "#a07a2a", fontSize: 12, margin: "6px 0 10px" },
  ok: { background: "#eafaf7", border: "1px solid #a9e3d8", borderRadius: 8, color: "#0b5c55", marginTop: 10, padding: "10px 12px" },
  err: { color: "#b23b2e", fontSize: 12, marginTop: 8 },
  billing: { color: "#a07a2a", fontSize: 11, marginTop: 10 }
} as const;
