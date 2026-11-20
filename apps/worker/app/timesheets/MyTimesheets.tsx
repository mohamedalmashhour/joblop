"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useT } from "../i18n/LocaleProvider";
import type { MessageKey } from "../i18n/messages";
import { resolveDeniedKind } from "../resolveDenied";

type Sheet = Readonly<{
  timesheetId: string;
  status: string;
  scheduledStartAt: string;
  payableMinutes: number | null;
  breakMinutes: number;
  workerReviewStatus: string;
  version: number;
  employerName: string;
  areaLabel: string | null;
}>;
type State =
  | { status: "loading" }
  | { status: "signed_out" }
  | { status: "needs_setup" }
  | { status: "error" }
  | { status: "ready"; items: readonly Sheet[] };

const STATUS_KEY: Record<string, MessageKey> = {
  worker_review: "ts.statusYourTurn",
  employer_review: "ts.statusEmployer",
  platform_review: "ts.statusJoblop",
  approved: "ts.statusApproved",
  locked: "ts.statusLocked",
  rejected: "ts.statusRejected"
};

export function MyTimesheets() {
  const t = useT();
  const locale = useLocale();
  const [state, setState] = useState<State>({ status: "loading" });
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [disputing, setDisputing] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/timesheets", { cache: "no-store" });
      if (r.status === 401) return setState({ status: await resolveDeniedKind() });
      if (!r.ok) return setState({ status: "error" });
      setState({ status: "ready", items: ((await r.json()) as { items: Sheet[] }).items });
    } catch {
      setState({ status: "error" });
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const respond = async (sheet: Sheet, action: "confirm" | "dispute") => {
    setBusy(sheet.timesheetId);
    setNotice("");
    try {
      const r = await fetch(`/api/timesheets/${encodeURIComponent(sheet.timesheetId)}/${action}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ expectedVersion: sheet.version, ...(action === "dispute" ? { reason } : {}) })
      });
      setNotice(r.ok ? t(action === "confirm" ? "ts.confirmed" : "ts.disputed") : t("ts.actionFailed"));
      setDisputing(null);
      setReason("");
      await load();
    } finally {
      setBusy(null);
    }
  };

  if (state.status === "loading") return <div className="state">{t("common.loading")}</div>;
  if (state.status === "signed_out") return <div className="state">{t("ts.signInPrompt")}</div>;
  if (state.status === "needs_setup") return <div className="state">{t("common.needsWorkerSetup")}<div style={{ marginTop: 12 }}><a className="btn" href="/onboarding">{t("common.setUpWorker")}</a></div></div>;
  if (state.status === "error") return <div className="state error" role="alert">{t("ts.loadError")}</div>;

  return (
    <>
      <section className="hero">
        <h1>{t("ts.title")}</h1>
        <p>{t("ts.intro")}</p>
      </section>
      {notice ? <p className="notice" role="status" style={{ color: "var(--accent)" }}>{notice}</p> : null}
      <div className="results" style={{ paddingBottom: 48 }}>
        {state.items.length === 0 ? <div className="state">{t("ts.none")}</div> : state.items.map((s) => {
          const payable = s.payableMinutes ?? 0;
          const yourTurn = s.status === "worker_review" && s.workerReviewStatus !== "confirmed";
          return (
            <article key={s.timesheetId} className="card">
              <div className="role">{s.employerName}</div>
              <div className="when">{new Date(s.scheduledStartAt).toLocaleDateString(locale, { timeZone: "America/Toronto" })}{s.areaLabel ? ` · ${s.areaLabel}` : ""}</div>
              <div className="when"><strong>{t("ts.payable", { hours: Math.floor(payable / 60), minutes: payable % 60 })}</strong></div>
              <div className="chips"><span className={`chip ${yourTurn ? "status-pending" : "status-verified"}`}>{t(STATUS_KEY[s.status] ?? "ts.statusProcessing")}</span></div>
              {yourTurn ? (
                <div className="chips" style={{ marginTop: 8 }}>
                  <button className="btn" type="button" disabled={busy !== null} onClick={() => void respond(s, "confirm")}>{t("ts.confirm")}</button>
                  <button className="btn ghost" type="button" disabled={busy !== null} onClick={() => setDisputing(s.timesheetId)}>{t("ts.dispute")}</button>
                </div>
              ) : null}
              {disputing === s.timesheetId ? (
                <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
                  <label htmlFor={`reason-${s.timesheetId}`}>{t("ts.disputeReason")}</label>
                  <textarea id={`reason-${s.timesheetId}`} rows={3} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} />
                  <div className="chips">
                    <button className="btn" type="button" disabled={busy !== null || !reason.trim()} onClick={() => void respond(s, "dispute")}>{t("ts.sendDispute")}</button>
                    <button className="btn ghost" type="button" onClick={() => setDisputing(null)}>{t("doc.cancel")}</button>
                  </div>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </>
  );
}
