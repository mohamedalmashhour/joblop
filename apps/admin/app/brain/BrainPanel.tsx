"use client";

import { useCallback, useEffect, useState } from "react";
import { usePageText } from "../i18n/pageText";
import { SignedOut } from "../shared/SignedOut";
import { brainText, type BrainCopy } from "./text";

// Staff Brain page: master switch (off / watch / live), per-action switches, open problems with a
// one-click "Do it", the action log with undo, and the last-24-hours summary. Refreshes every minute.

type Mode = "off" | "watch" | "live";
type Issue = {
  id: string;
  ruleKey: string;
  severity: "info" | "warning" | "urgent";
  summary: string;
  recommendedAction: string | null;
  detectedAt: string;
};
type Action = {
  id: string;
  actionKey: string;
  kind: "live" | "watch";
  actor: "brain" | "staff";
  reason: string;
  status: keyof BrainCopy["status"];
  detail: string | null;
  undoHint: string;
  canUndo: boolean;
  createdAt: string;
};
type Payload = {
  mode: Mode;
  actorConfigured: boolean;
  switches: { key: string; enabled: boolean }[];
  issues: Issue[];
  actions: Action[];
  summary: {
    found: Record<string, number>;
    done: Record<string, number>;
    simulated: Record<string, number>;
    failed: Record<string, number>;
    openIssues: number;
    needsPeople: number;
  };
};
type State = { status: "loading" } | { status: "denied" } | { status: "error" } | { status: "ready"; data: Payload };

const when = (iso: string) => new Date(iso).toLocaleString("en-CA", { dateStyle: "medium", timeStyle: "short" });
const total = (counts: Record<string, number>) => Object.values(counts).reduce((a, b) => a + b, 0);

export function BrainPanel() {
  const copy = usePageText(brainText);
  const [state, setState] = useState<State>({ status: "loading" });
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/brain", { cache: "no-store" });
      if (response.status === 401 || response.status === 403) return setState({ status: "denied" });
      if (!response.ok) return setState({ status: "error" });
      setState({ status: "ready", data: (await response.json()) as Payload });
    } catch {
      setState({ status: "error" });
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), 60_000);
    return () => clearInterval(timer);
  }, [load]);

  const post = async (id: string, path: string, body?: Record<string, unknown>) => {
    setBusy(id);
    setNotice(null);
    try {
      const response = await fetch(path, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body ?? {}),
        cache: "no-store"
      });
      if (response.status === 401 || response.status === 403) return setState({ status: "denied" });
      if (!response.ok) setNotice(copy.actionFailed);
      else {
        const payload = (await response.json().catch(() => null)) as { detail?: unknown } | null;
        if (typeof payload?.detail === "string") setNotice(payload.detail);
      }
      await load();
    } catch {
      setNotice(copy.actionFailed);
    } finally {
      setBusy(null);
    }
  };

  if (state.status === "loading") return <p style={styles.note}>{copy.loading}</p>;
  if (state.status === "denied") return <SignedOut compact />;
  if (state.status === "error") return <p style={styles.note} role="alert">{copy.error}</p>;
  const { data } = state;
  const ruleName = (key: string) => copy.ruleNames[key] ?? key;
  const actionName = (key: string) => copy.switchNames[key] ?? key;

  return (
    <div style={styles.wrap}>
      {notice ? <p role="status" style={styles.notice}>{notice}</p> : null}

      <section style={styles.card} aria-labelledby="brain-mode">
        <h2 id="brain-mode" style={styles.h2}>{copy.modeHeading}</h2>
        <div style={styles.row}>
          {(["off", "watch", "live"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              aria-pressed={data.mode === mode}
              disabled={busy !== null}
              onClick={() => void post(`mode-${mode}`, "/api/brain/mode", { mode })}
              style={data.mode === mode ? styles.goldButton : styles.ghostButton}
            >
              {copy.modeNames[mode]}
            </button>
          ))}
          {data.mode !== "off" ? (
            <button type="button" disabled={busy !== null} onClick={() => void post("kill", "/api/brain/mode", { mode: "off" })} style={styles.stopButton}>
              {copy.killSwitch}
            </button>
          ) : null}
        </div>
        <p style={styles.help}>
          <strong>{copy.current}: {copy.modeNames[data.mode]}.</strong> {copy.modeHelp[data.mode]}
        </p>
        {!data.actorConfigured ? <p style={styles.warn}>{copy.actorMissing}</p> : null}
      </section>

      <section style={styles.card} aria-labelledby="brain-summary">
        <h2 id="brain-summary" style={styles.h2}>{copy.summaryHeading}</h2>
        <div style={styles.stats}>
          {[
            [copy.found, total(data.summary.found)],
            [copy.done, total(data.summary.done)],
            [copy.simulated, total(data.summary.simulated)],
            [copy.failed, total(data.summary.failed)],
            [copy.openNow, data.summary.openIssues],
            [copy.needsPeople, data.summary.needsPeople]
          ].map(([label, value]) => (
            <div key={String(label)} style={styles.stat}>
              <span style={styles.statValue}>{value}</span>
              <span style={styles.statLabel}>{label}</span>
            </div>
          ))}
        </div>
        {Object.keys(data.summary.found).length > 0 ? (
          <ul style={styles.list}>
            {Object.entries(data.summary.found).map(([key, count]) => (
              <li key={key}>{ruleName(key)}: {count}</li>
            ))}
          </ul>
        ) : null}
      </section>

      <section style={styles.card} aria-labelledby="brain-switches">
        <h2 id="brain-switches" style={styles.h2}>{copy.switchesHeading}</h2>
        <p style={styles.help}>{copy.switchesHelp}</p>
        <ul style={styles.switchList}>
          {data.switches.map((s) => (
            <li key={s.key} style={styles.switchRow}>
              <span>{actionName(s.key)}</span>
              <button
                type="button"
                role="switch"
                aria-checked={s.enabled}
                aria-label={actionName(s.key)}
                disabled={busy !== null}
                onClick={() => void post(`switch-${s.key}`, "/api/brain/switches", { key: s.key, enabled: !s.enabled })}
                style={s.enabled ? styles.goldButton : styles.ghostButton}
              >
                {s.enabled ? copy.on : copy.off}
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section style={styles.card} aria-labelledby="brain-issues">
        <h2 id="brain-issues" style={styles.h2}>{copy.issuesHeading}</h2>
        {data.issues.length === 0 ? (
          <p style={styles.help}>{copy.issuesEmpty}</p>
        ) : (
          <ul style={styles.issueList}>
            {data.issues.map((issue) => (
              <li key={issue.id} style={{ ...styles.issue, ...(issue.severity === "urgent" ? styles.urgent : {}) }}>
                <div style={styles.issueHead}>
                  <span style={styles.badge}>{copy.severity[issue.severity]}</span>
                  <span style={styles.muted}>{ruleName(issue.ruleKey)} · {when(issue.detectedAt)}</span>
                </div>
                <p style={styles.issueText}>{issue.summary}</p>
                <div style={styles.row}>
                  {issue.recommendedAction ? (
                    <>
                      <span style={styles.muted}>{copy.recommended}: {actionName(issue.recommendedAction)}</span>
                      <button type="button" disabled={busy !== null} onClick={() => void post(issue.id, `/api/brain/issues/${encodeURIComponent(issue.id)}/do`)} style={styles.goldButton}>
                        {copy.doIt}
                      </button>
                    </>
                  ) : (
                    <span style={styles.muted}>{copy.personNeeded}</span>
                  )}
                  <button type="button" disabled={busy !== null} onClick={() => void post(`close-${issue.id}`, `/api/brain/issues/${encodeURIComponent(issue.id)}/dismiss`)} style={styles.ghostButton}>
                    {copy.close}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section style={styles.card} aria-labelledby="brain-log">
        <h2 id="brain-log" style={styles.h2}>{copy.logHeading}</h2>
        {data.actions.length === 0 ? (
          <p style={styles.help}>{copy.logEmpty}</p>
        ) : (
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  {[copy.colWhen, copy.colWhat, copy.colWhy, copy.colResult, copy.colUndo].map((h) => (
                    <th key={h} scope="col" style={styles.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.actions.map((a) => (
                  <tr key={a.id}>
                    <td style={styles.td}>{when(a.createdAt)}</td>
                    <td style={styles.td}>
                      {actionName(a.actionKey)}
                      <span style={styles.muted}> · {a.kind === "watch" ? copy.watchOnly : a.actor === "staff" ? copy.byStaff : copy.byBrain}</span>
                    </td>
                    <td style={styles.td}>{a.reason}</td>
                    <td style={styles.td}>
                      <strong>{copy.status[a.status] ?? a.status}</strong>
                      {a.detail ? <span style={styles.muted}> · {a.detail}</span> : null}
                    </td>
                    <td style={styles.td}>
                      {a.canUndo ? (
                        <button type="button" disabled={busy !== null} onClick={() => void post(`undo-${a.id}`, `/api/brain/actions/${encodeURIComponent(a.id)}/undo`)} style={styles.goldButton}>
                          {copy.undo}
                        </button>
                      ) : (
                        <span style={styles.muted}>{a.undoHint}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

const GOLD = "#F8B808";

const styles = {
  wrap: { padding: "16px clamp(18px, 5vw, 64px) 48px", display: "grid", gap: 18 },
  note: { padding: "16px clamp(18px, 5vw, 64px)", color: "#faf6ec" },
  notice: { background: "#1a1606", border: `1px solid ${GOLD}`, borderRadius: 10, padding: "10px 14px", margin: 0 },
  card: { background: "#0c0c0c", border: "1px solid #2a2a2a", borderRadius: 14, padding: "18px 20px" },
  h2: { color: "#fff1a8", fontSize: 18, margin: "0 0 10px" },
  help: { color: "#d8d1c2", lineHeight: 1.55, margin: "8px 0 0" },
  warn: { color: "#ffd6d6", background: "rgba(220, 38, 38, 0.15)", borderRadius: 8, padding: "8px 12px", marginTop: 10 },
  row: { display: "flex", flexWrap: "wrap" as const, gap: 10, alignItems: "center" },
  goldButton: { background: GOLD, color: "#000000", border: `1px solid ${GOLD}`, borderRadius: 999, padding: "8px 16px", fontWeight: 800, cursor: "pointer" },
  ghostButton: { background: "transparent", color: "#f4efe4", border: "1px solid #5a5446", borderRadius: 999, padding: "8px 16px", fontWeight: 700, cursor: "pointer" },
  stopButton: { background: "#b91c1c", color: "#ffffff", border: "1px solid #b91c1c", borderRadius: 999, padding: "8px 16px", fontWeight: 800, cursor: "pointer" },
  stats: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10 },
  stat: { background: "#141414", borderRadius: 10, padding: "10px 12px", display: "grid" },
  statValue: { color: GOLD, fontSize: 26, fontWeight: 900 },
  statLabel: { color: "#d8d1c2", fontSize: 13 },
  list: { margin: "12px 0 0", paddingInlineStart: 18, color: "#d8d1c2" },
  switchList: { listStyle: "none", padding: 0, margin: "12px 0 0", display: "grid", gap: 8 },
  switchRow: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, borderBottom: "1px solid #1f1f1f", paddingBottom: 8 },
  issueList: { listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 10 },
  issue: { background: "#141414", borderRadius: 10, padding: "12px 14px" },
  urgent: { borderInlineStart: "4px solid #dc2626" },
  issueHead: { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" as const },
  issueText: { margin: "8px 0 10px", lineHeight: 1.5 },
  badge: { background: GOLD, color: "#000000", borderRadius: 999, padding: "2px 10px", fontSize: 12, fontWeight: 800 },
  muted: { color: "#b9b2a3", fontSize: 14 },
  tableWrap: { overflowX: "auto" as const },
  table: { width: "100%", borderCollapse: "collapse" as const, fontSize: 14 },
  th: { textAlign: "start" as const, padding: "8px 10px", borderBottom: "1px solid #3a3a3a", color: "#fff1a8" },
  td: { padding: "8px 10px", borderBottom: "1px solid #222", verticalAlign: "top" as const }
} as const;
