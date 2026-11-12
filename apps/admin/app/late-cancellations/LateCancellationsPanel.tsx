"use client";

import { useEffect, useState } from "react";
import { usePageText } from "../i18n/pageText";
import { lateCancellationsText } from "./text";
import { SignedOut } from "../shared/SignedOut";

// Staff list of late employer cancellations: one row per confirmed worker the charge covered.
// Read-only. Owner decision 2026-11-09: no automatic worker pay; staff follow up case by case.

type Charge = {
  id: string;
  organizationName: string;
  jobRequestNumber: string;
  jobTitle: string;
  shiftStartAt: string;
  cancelledAt: string;
  minutesBeforeStart: number;
  workerName: string | null;
  workerIdentityId: string;
  chargeHours: number;
  subtotalMinor: number;
  currency: string;
  invoiceId: string | null;
  invoiceStatus: string | null;
  invoiceTotalMinor: number | null;
  invoiceError: string | null;
  workerFollowUp: string;
};

type State = { status: "loading" } | { status: "denied" } | { status: "error" } | { status: "ready"; charges: Charge[] };

const money = (minor: number, currency: string) =>
  new Intl.NumberFormat("en-CA", { style: "currency", currency: currency === "USD" ? "USD" : "CAD" }).format(minor / 100);
const when = (iso: string) => new Date(iso).toLocaleString("en-CA", { timeZone: "America/Toronto", dateStyle: "medium", timeStyle: "short" });

export function LateCancellationsPanel() {
  const copy = usePageText(lateCancellationsText);
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let live = true;
    void (async () => {
      try {
        const response = await fetch("/api/late-cancellation-charges", { cache: "no-store" });
        if (!live) return;
        if (response.status === 401 || response.status === 403) return setState({ status: "denied" });
        if (!response.ok) return setState({ status: "error" });
        const payload = (await response.json()) as { charges?: Charge[] };
        setState({ status: "ready", charges: payload.charges ?? [] });
      } catch {
        if (live) setState({ status: "error" });
      }
    })();
    return () => {
      live = false;
    };
  }, []);

  if (state.status === "loading") return <p style={styles.note}>{copy.loading}</p>;
  if (state.status === "denied") return <SignedOut compact />;
  if (state.status === "error") return <p style={styles.note} role="alert">{copy.error}</p>;
  if (state.charges.length === 0) return <p style={styles.note}>{copy.empty}</p>;

  return (
    <section style={styles.wrap}>
      <table style={styles.table}>
        <thead>
          <tr>
            {[copy.colCompany, copy.colJob, copy.colShift, copy.colCancelled, copy.colWorker, copy.colCharge, copy.colInvoice, copy.colFollowUp].map((h) => (
              <th key={h} style={styles.th} scope="col">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {state.charges.map((c) => (
            <tr key={c.id}>
              <td style={styles.td}>{c.organizationName}</td>
              <td style={styles.td}>{c.jobTitle} <span style={styles.muted}>({c.jobRequestNumber})</span></td>
              <td style={styles.td}>{when(c.shiftStartAt)}</td>
              <td style={styles.td}>
                {when(c.cancelledAt)}{" "}
                <span style={styles.muted}>{copy.hoursBefore.replace("{h}", (Math.max(c.minutesBeforeStart, 0) / 60).toFixed(1))}</span>
              </td>
              <td style={styles.td}>{c.workerName ?? c.workerIdentityId}</td>
              <td style={styles.td}>{c.chargeHours} h · {money(c.subtotalMinor, c.currency)}</td>
              <td style={styles.td}>
                {c.invoiceId
                  ? `${c.invoiceStatus ?? ""}${c.invoiceTotalMinor !== null ? ` · ${money(c.invoiceTotalMinor, c.currency)}` : ""}`
                  : <span title={c.invoiceError ?? undefined}>{copy.noInvoice}</span>}
              </td>
              <td style={styles.td}>{c.workerFollowUp === "pending_review" ? copy.followUpPending : c.workerFollowUp}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

const styles = {
  wrap: { padding: "16px clamp(18px, 5vw, 64px) 48px", overflowX: "auto" as const },
  note: { padding: "16px clamp(18px, 5vw, 64px)", color: "#faf6ec" },
  table: { width: "100%", borderCollapse: "collapse" as const, fontSize: 14 },
  th: { textAlign: "start" as const, padding: "8px 10px", borderBottom: "1px solid #3a3a3a", color: "#fff1a8" },
  td: { padding: "8px 10px", borderBottom: "1px solid #222", verticalAlign: "top" as const },
  muted: { color: "#b9b2a3" }
} as const;
