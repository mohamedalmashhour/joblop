"use client";

import { useCallback, useEffect, useState } from "react";

type Deduction = Readonly<{ category: string; code: string; description: string; amountMinor: number; currency: string }>;
type Statement = Readonly<{
  calculationId: string;
  revision: number;
  status: string;
  periodStart: string;
  periodEnd: string;
  timezone: string;
  jurisdiction: { country: string; region: string };
  currency: string;
  grossPayMinor: number;
  totalDeductionsMinor: number;
  netPayMinor: number;
  deductions: readonly Deduction[];
}>;
type State = { status: "loading" } | { status: "signed_out" } | { status: "error" } | { status: "ready"; items: readonly Statement[]; notice: string };

function money(minor: number, currency: string): string {
  return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(minor / 100);
}
function period(startAt: string, endAt: string, tz: string): string {
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric", timeZone: tz };
  return `${new Date(startAt).toLocaleDateString(undefined, opts)} – ${new Date(endAt).toLocaleDateString(undefined, opts)}`;
}

export function MyPay() {
  const [state, setState] = useState<State>({ status: "loading" });

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/payroll?limit=25", { cache: "no-store" });
      if (r.status === 401 || r.status === 403) return setState({ status: r.status === 401 ? "signed_out" : "error" });
      if (!r.ok) return setState({ status: "error" });
      const payload = (await r.json()) as { items: Statement[]; notice?: string };
      setState({ status: "ready", items: payload.items, notice: payload.notice ?? "" });
    } catch {
      setState({ status: "error" });
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  if (state.status === "loading") return <div className="state">Loading…</div>;
  if (state.status === "signed_out") return <div className="state">Please sign in to see your pay.<div style={{ marginTop: 12 }}><a className="btn" href="/">Go to search</a></div></div>;
  if (state.status === "error") return <div className="state error" role="alert">We couldn&apos;t load your pay statement.</div>;

  return (
    <>
      <section className="hero">
        <h1>My pay</h1>
        <p>{state.notice || "A governed calculation only — not a real pay statement."}</p>
      </section>
      <div className="chips" style={{ marginBottom: 16 }}>
        <span className="chip status-rejected">SYNTHETIC / TEST — no money moves</span>
      </div>

      {state.items.length === 0 ? (
        <div className="state">No approved pay statements yet. They appear here once payroll approves a calculation for you.</div>
      ) : (
        <div className="results" style={{ paddingBottom: 48 }}>
          {state.items.map((s) => (
            <article className="card" key={s.calculationId}>
              <div className="role">{period(s.periodStart, s.periodEnd, s.timezone)}</div>
              <div className="chips">
                <span className="chip status-verified">{s.status}</span>
                <span className="chip">{s.jurisdiction.country}/{s.jurisdiction.region}</span>
                <span className="chip">rev {s.revision}</span>
              </div>
              <div className="when">Gross: <strong>{money(s.grossPayMinor, s.currency)}</strong></div>
              <div className="when">Deductions: −{money(s.totalDeductionsMinor, s.currency)}</div>
              <div className="when" style={{ fontSize: 18 }}>Net pay: <strong>{money(s.netPayMinor, s.currency)}</strong></div>
              {s.deductions.length > 0 ? (
                <ul style={{ margin: "6px 0 0", paddingLeft: 18, fontSize: 13, color: "var(--text-muted)" }}>
                  {s.deductions.map((d) => (
                    <li key={d.code}>{d.description}: −{money(d.amountMinor, d.currency)} <span style={{ opacity: 0.7 }}>({d.category})</span></li>
                  ))}
                </ul>
              ) : null}
            </article>
          ))}
        </div>
      )}
      <p className="notice">Only your own pay appears here. Figures are synthetic (test rules) and no money is moved by JobLop.</p>
    </>
  );
}
