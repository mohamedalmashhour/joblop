"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useT } from "../i18n/LocaleProvider";
import type { RwosLocale } from "../i18n/config";

type Deduction = Readonly<{ category: string; code: string; description: string; amountMinor: number; currency: string }>;
type Earning = Readonly<{ classification: string; description: string; quantityMinutes: number; rateMinor: number; amountMinor: number; currency: string }>;
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
  earningLines: readonly Earning[];
  deductions: readonly Deduction[];
}>;
type Summary = Readonly<{ statementCount: number; totalGrossMinor: number; totalDeductionsMinor: number; totalNetMinor: number; currency: string }>;
type State = { status: "loading" } | { status: "signed_out" } | { status: "error" } | { status: "ready"; items: readonly Statement[]; summary: Summary | null; notice: string };

function money(minor: number, currency: string, locale: RwosLocale): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(minor / 100);
}
function period(startAt: string, endAt: string, tz: string, locale: RwosLocale): string {
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric", timeZone: tz };
  return `${new Date(startAt).toLocaleDateString(locale, opts)} – ${new Date(endAt).toLocaleDateString(locale, opts)}`;
}
function hours(minutes: number): string {
  return (minutes / 60).toFixed(2);
}

export function MyPay() {
  const t = useT();
  const locale = useLocale();
  const [state, setState] = useState<State>({ status: "loading" });

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/payroll?limit=25", { cache: "no-store" });
      if (r.status === 401 || r.status === 403) return setState({ status: r.status === 401 ? "signed_out" : "error" });
      if (!r.ok) return setState({ status: "error" });
      const payload = (await r.json()) as { items: Statement[]; summary?: Summary; notice?: string };
      setState({ status: "ready", items: payload.items, summary: payload.summary ?? null, notice: payload.notice ?? "" });
    } catch {
      setState({ status: "error" });
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  if (state.status === "loading") return <div className="state">{t("common.loading")}</div>;
  if (state.status === "signed_out") return <div className="state">{t("pay.signInPrompt")}<div style={{ marginTop: 12 }}><a className="btn" href="/">{t("common.goToSearch")}</a></div></div>;
  if (state.status === "error") return <div className="state error" role="alert">{t("pay.loadError")}</div>;

  return (
    <>
      <section className="hero">
        <h1>{t("nav.pay")}</h1>
        <p>{state.notice || t("pay.defaultNotice")}</p>
      </section>
      <div className="chips" style={{ marginBottom: 16 }}>
        <span className="chip status-rejected">{t("pay.syntheticChip")}</span>
      </div>

      {state.summary ? (
        <section className="card" style={{ marginBottom: 16 }}>
          <div className="role">{t("pay.summaryTitle")}</div>
          <div className="when" style={{ fontSize: 18 }}>{t("pay.totalNet")}: <strong>{money(state.summary.totalNetMinor, state.summary.currency, locale)}</strong></div>
          <div className="when">{t("pay.totalGross")}: {money(state.summary.totalGrossMinor, state.summary.currency, locale)}</div>
          <div className="when">{t("pay.totalDeductions")}: −{money(state.summary.totalDeductionsMinor, state.summary.currency, locale)}</div>
          <div className="when">{t("pay.statementCount")}: {state.summary.statementCount}</div>
        </section>
      ) : null}

      {state.items.length === 0 ? (
        <div className="state">{t("pay.none")}</div>
      ) : (
        <div className="results" style={{ paddingBottom: 48 }}>
          {state.items.map((s) => (
            <article className="card" key={s.calculationId}>
              <div className="role">{period(s.periodStart, s.periodEnd, s.timezone, locale)}</div>
              <div className="chips">
                <span className="chip status-verified">{s.status}</span>
                <span className="chip">{s.jurisdiction.country}/{s.jurisdiction.region}</span>
                <span className="chip">{t("pay.rev", { n: s.revision })}</span>
              </div>
              <div className="when">{t("pay.gross")} <strong>{money(s.grossPayMinor, s.currency, locale)}</strong></div>
              <div className="when">{t("pay.deductions", { amount: money(s.totalDeductionsMinor, s.currency, locale) })}</div>
              <div className="when" style={{ fontSize: 18 }}>{t("pay.net")} <strong>{money(s.netPayMinor, s.currency, locale)}</strong></div>
              {s.earningLines.length > 0 ? (
                <>
                  <div className="when" style={{ marginTop: 6 }}>{t("pay.earningsTitle")}</div>
                  <ul style={{ margin: "4px 0 0", paddingLeft: 18, fontSize: 13 }}>
                    {s.earningLines.map((e, i) => (
                      <li key={`${e.classification}-${i}`}>{e.description}: {money(e.amountMinor, e.currency, locale)} <span style={{ opacity: 0.7 }}>({t("pay.hours", { hours: hours(e.quantityMinutes) })} · {t("pay.rateHr", { rate: money(e.rateMinor, e.currency, locale) })})</span></li>
                    ))}
                  </ul>
                </>
              ) : null}
              {s.deductions.length > 0 ? (
                <ul style={{ margin: "6px 0 0", paddingLeft: 18, fontSize: 13, color: "var(--text-muted)" }}>
                  {s.deductions.map((d) => (
                    <li key={d.code}>{d.description}: −{money(d.amountMinor, d.currency, locale)} <span style={{ opacity: 0.7 }}>({d.category})</span></li>
                  ))}
                </ul>
              ) : null}
            </article>
          ))}
        </div>
      )}
      <p className="notice">{t("pay.footer")}</p>
    </>
  );
}
