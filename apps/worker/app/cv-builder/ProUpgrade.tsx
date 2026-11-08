"use client";

import { useEffect, useState } from "react";
import { isProductionTier } from "../deploymentTier";

type ETransfer = { email: string; amount: string; reference: string; note: string };
type Order = { id: string; status: string; method: string };

export function ProUpgrade() {
  const [step, setStep] = useState<"idle" | "instructions" | "claimed">("idle");
  const [order, setOrder] = useState<Order | null>(null);
  const [et, setEt] = useState<ETransfer | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [trialBusy, setTrialBusy] = useState(false);
  const [trialMsg, setTrialMsg] = useState("");
  const [cardBusy, setCardBusy] = useState(false);
  const [cardEnabled, setCardEnabled] = useState(false);
  const [cardMsg, setCardMsg] = useState("");

  // On mount: learn whether real card checkout is live (test mode), and finalize a card payment if we
  // just returned from Stripe's hosted Checkout (?pro=success&order=…). The API verifies payment itself.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const r = await fetch("/api/cv/plan", { cache: "no-store" });
        if (r.ok && active) setCardEnabled(Boolean(((await r.json()) as { cardEnabled?: boolean }).cardEnabled));
      } catch { /* ignore */ }
    })();
    try {
      const params = new URLSearchParams(window.location.search);
      const pro = params.get("pro");
      const orderId = params.get("order");
      if (pro === "success" && orderId) {
        setCardBusy(true); setCardMsg("Confirming your payment…");
        fetch(`/api/cv/orders/${encodeURIComponent(orderId)}/complete`, { method: "POST", headers: { "content-type": "application/json" } })
          .then((res) => { if (res.ok) { window.location.replace("/cv-builder"); } else { setCardMsg("We couldn't confirm the payment yet. If you were charged, refresh in a moment."); setCardBusy(false); } })
          .catch(() => { setCardMsg("We couldn't confirm the payment. Please refresh."); setCardBusy(false); });
      } else if (pro === "cancel") {
        setCardMsg("Card checkout cancelled — no charge was made.");
      }
    } catch { /* ignore */ }
    return () => { active = false; };
  }, []);

  // Card: open Stripe's hosted test Checkout. No card data touches Joblop; we return and verify.
  const payByCard = async () => {
    setCardBusy(true); setCardMsg("");
    try {
      const res = await fetch("/api/cv/subscribe", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ method: "stripe" }) });
      const d = (await res.json().catch(() => ({}))) as { checkoutUrl?: string | null };
      if (res.ok && d.checkoutUrl) { window.location.href = d.checkoutUrl; return; }
      setCardMsg("Card checkout isn't available right now — use Interac e-transfer.");
      setCardBusy(false);
    } catch {
      setCardMsg("Could not start card checkout — try again.");
      setCardBusy(false);
    }
  };

  // Start the one-time 14-day free trial. On success the worker is Pro immediately — reload so the whole
  // app (JobScanner priority, AI CV) reflects it. No card, no charge.
  const startTrial = async () => {
    setTrialBusy(true); setTrialMsg("");
    try {
      const res = await fetch("/api/cv/trial", { method: "POST", headers: { "content-type": "application/json" } });
      if (res.ok) { window.location.reload(); return; }
      setTrialMsg(res.status === 409 ? "Your free trial has already been used." : "Could not start the trial — try again.");
    } catch {
      setTrialMsg("Could not start the trial — try again.");
    } finally { setTrialBusy(false); }
  };

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
        <>
          <div style={styles.trialBox}>
            <button type="button" style={styles.trialCta} disabled={trialBusy} onClick={() => void startTrial()}>
              {trialBusy ? "…" : "Start 14-day free trial"}
            </button>
            <span style={styles.trialHint}>No card, no charge. Full Pro for 14 days — cancel anytime.</span>
          </div>
          {trialMsg ? <p style={styles.err}>{trialMsg}</p> : null}
          <p style={styles.orLine}>or subscribe now</p>
          <div style={styles.buttons}>
            <button type="button" style={styles.cta} disabled={busy || cardBusy} onClick={() => void subscribe()}>{busy ? "…" : "Pay by Interac e-transfer"}</button>
            {cardEnabled ? (
              <button type="button" style={styles.cta} disabled={cardBusy} onClick={() => void payByCard()}>{cardBusy ? "…" : "Pay by card"}</button>
            ) : (
              <button type="button" style={styles.ctaGhost} disabled title="Card payments open soon">Pay by card (soon)</button>
            )}
          </div>
          {cardMsg ? <p style={styles.hint2}>{cardMsg}</p> : null}
        </>
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
      <p style={styles.billing}>
        {cardEnabled && !isProductionTier()
          ? "Card checkout runs in Stripe TEST mode — use test card 4242 4242 4242 4242. No real money moves. Interac e-transfer is confirmed manually by the team."
          : cardEnabled
          ? "Pay by card or by Interac e-transfer. Our team confirms e-transfers by hand."
          : "Card payments aren’t enabled yet — Interac e-transfer is confirmed manually by the team. No card is charged."}
      </p>
    </div>
  );
}

const styles = {
  wrap: { background: "#fff6e6", border: "1px solid #f0d089", borderRadius: 10, color: "#8a5a00", fontSize: 13, lineHeight: 1.5, marginTop: 16, padding: "14px 16px" },
  benefits: { margin: "8px 0 12px", paddingLeft: 18 },
  buttons: { display: "flex", flexWrap: "wrap" as const, gap: 10 },
  trialBox: { alignItems: "center", display: "flex", flexWrap: "wrap" as const, gap: "6px 12px", marginBottom: 6 },
  trialCta: { background: "#e0a500", border: "none", borderRadius: 8, color: "#fff", cursor: "pointer", fontSize: 14, fontWeight: 800, padding: "11px 20px" },
  trialHint: { color: "#8a5a00", fontSize: 11.5, fontWeight: 600 },
  hint2: { color: "#8a5a00", fontSize: 12, fontWeight: 600, margin: "8px 0 0" },
  orLine: { color: "#a07a2a", fontSize: 11.5, fontWeight: 700, letterSpacing: ".03em", margin: "10px 0 8px", textTransform: "uppercase" as const },
  cta: { background: "#e0a500", border: "none", borderRadius: 8, color: "#fff", cursor: "pointer", fontWeight: 800, padding: "10px 16px" },
  ctaGhost: { background: "#fff", border: "1px solid #c9b27a", borderRadius: 8, color: "#a07a2a", cursor: "not-allowed", fontWeight: 700, padding: "10px 16px" },
  box: { background: "#fffdf7", border: "1px solid #ecd9a8", borderRadius: 8, marginTop: 10, padding: 12 },
  kv: { listStyle: "none", margin: "0 0 6px", padding: 0 },
  k: { color: "#a07a2a", display: "inline-block", fontSize: 12, width: 160 },
  hint: { color: "#a07a2a", fontSize: 12, margin: "6px 0 10px" },
  ok: { background: "#faf6ec", border: "1px solid #f0e2c0", borderRadius: 8, color: "#8a5a00", marginTop: 10, padding: "10px 12px" },
  err: { color: "#b23b2e", fontSize: 12, marginTop: 8 },
  billing: { color: "#a07a2a", fontSize: 11, marginTop: 10 }
} as const;
