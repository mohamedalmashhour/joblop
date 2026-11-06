"use client";

import { useEffect, useState } from "react";
import { useLocale, useT, fmtLocale } from "../../../i18n/LocaleProvider";

type Slip = Readonly<{
  periodStart: string;
  periodEnd: string;
  timezone: string;
  revision: number;
  workerName: string | null;
  organizationName: string | null;
  workerClassification: string;
  currency: string;
  grossPayMinor: number;
  totalDeductionsMinor: number;
  netPayMinor: number;
  earningLines: readonly Readonly<{ description: string; quantityMinutes: number; rateMinor: number; amountMinor: number }>[];
  deductions: readonly Readonly<{ code: string; description: string; amountMinor: number }>[];
  yearToDate: Readonly<{ year: number; grossPayMinor: number; totalDeductionsMinor: number; netPayMinor: number }>;
  synthetic: boolean;
}>;
type SlipState = { status: "loading" } | { status: "missing" } | { status: "ready"; slip: Slip };

const CELL = { padding: "6px 0", borderBottom: "1px solid var(--line, #ddd)", textAlign: "start" } as const;
const AMOUNT = { ...CELL, textAlign: "end", whiteSpace: "nowrap" } as const;

export function PaySlip({ calculationId }: { calculationId: string }) {
  const t = useT();
  const locale = fmtLocale(useLocale());
  const [state, setState] = useState<SlipState>({ status: "loading" });

  useEffect(() => {
    let live = true;
    fetch(`/api/payroll/${encodeURIComponent(calculationId)}/slip`, { cache: "no-store" })
      .then((r) => (r.ok ? (r.json() as Promise<{ slip: Slip }>) : null))
      .then((d) => { if (live) setState(d ? { status: "ready", slip: d.slip } : { status: "missing" }); })
      .catch(() => { if (live) setState({ status: "missing" }); });
    return () => { live = false; };
  }, [calculationId]);

  if (state.status === "loading") return <div className="state">{t("common.loading")}</div>;
  if (state.status === "missing") return <div className="state error" role="alert">{t("pay.slipNotFound")}<div style={{ marginTop: 12 }}><a className="btn" href="/pay">{t("pay.slipBack")}</a></div></div>;

  const { slip } = state;
  const independent = slip.workerClassification === "contractor";
  const money = (minor: number) => new Intl.NumberFormat(locale, { style: "currency", currency: slip.currency }).format(minor / 100);
  const day = (iso: string) => new Date(iso).toLocaleDateString(locale, { year: "numeric", month: "long", day: "numeric", timeZone: slip.timezone });

  return (
    <article className="pay-slip" style={{ maxWidth: 720, margin: "0 auto", paddingBottom: 48 }}>
      <div className="chips no-print" style={{ marginBottom: 16 }}>
        <a className="btn ghost" href="/pay">{t("pay.slipBack")}</a>
        <button type="button" className="btn" onClick={() => window.print()}>{t("pay.slipPrint")}</button>
      </div>

      <section className="card" style={{ display: "grid", gap: 12 }}>
        <h1 style={{ margin: 0 }}>{t(independent ? "pay.slipTitleIndependent" : "pay.slipTitleEmployee")}</h1>
        {slip.synthetic ? <p role="note" style={{ margin: 0, fontWeight: 700 }}>{t("pay.slipTestBanner")}</p> : null}
        <div>
          {slip.workerName ? <div className="when">{t("pay.slipWorker")}: <strong>{slip.workerName}</strong></div> : null}
          {slip.organizationName ? <div className="when">{t("pay.slipPayer")}: <strong>{slip.organizationName}</strong></div> : null}
          <div className="when">{t("pay.slipPeriod")}: <strong>{day(slip.periodStart)} – {day(slip.periodEnd)}</strong></div>
          {slip.revision > 1 ? <div className="when">{t("pay.rev", { n: slip.revision })}</div> : null}
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr>
              <th style={CELL}>{t("pay.earningsTitle")}</th>
              <th style={AMOUNT}>{t("pay.slipThisPeriod")}</th>
            </tr>
          </thead>
          <tbody>
            {slip.earningLines.map((e, i) => (
              <tr key={`${e.description}-${i}`}>
                <td style={CELL}>{e.description} <span className="notice">({t("pay.hours", { hours: (e.quantityMinutes / 60).toFixed(2) })} · {t("pay.rateHr", { rate: money(e.rateMinor) })})</span></td>
                <td style={AMOUNT}>{money(e.amountMinor)}</td>
              </tr>
            ))}
            {slip.deductions.map((d) => (
              <tr key={d.code}>
                <td style={CELL}>{d.description}</td>
                <td style={AMOUNT}>−{money(d.amountMinor)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr>
              <th style={CELL} scope="col">{t("pay.slipTotals")}</th>
              <th style={AMOUNT} scope="col">{t("pay.slipThisPeriod")}</th>
              <th style={AMOUNT} scope="col">{t("pay.slipYearToDate", { year: slip.yearToDate.year })}</th>
            </tr>
          </thead>
          <tbody>
            <tr><td style={CELL}>{t("pay.totalGross")}</td><td style={AMOUNT}>{money(slip.grossPayMinor)}</td><td style={AMOUNT}>{money(slip.yearToDate.grossPayMinor)}</td></tr>
            <tr><td style={CELL}>{t("pay.totalDeductions")}</td><td style={AMOUNT}>−{money(slip.totalDeductionsMinor)}</td><td style={AMOUNT}>−{money(slip.yearToDate.totalDeductionsMinor)}</td></tr>
            <tr><td style={{ ...CELL, fontWeight: 700 }}>{t("pay.slipNet")}</td><td style={{ ...AMOUNT, fontWeight: 700 }}>{money(slip.netPayMinor)}</td><td style={{ ...AMOUNT, fontWeight: 700 }}>{money(slip.yearToDate.netPayMinor)}</td></tr>
          </tbody>
        </table>

        <p className="notice" style={{ margin: 0 }}>{t("pay.slipYearNote", { year: slip.yearToDate.year })}</p>
        {independent ? <p className="notice" style={{ margin: 0 }}>{t("pay.slipIndependentNote")}</p> : null}
      </section>
    </article>
  );
}
