"use client";

import { useState } from "react";
import { useLocale } from "../i18n/LocaleProvider";
import { cardDetail, cardWhen, parseAssistantAction, parseAssistantResult, type AssistantAction } from "./assistantCards";
import type { AssistantCopy } from "./text";

// Staff assistant cards on the Contact desk. A card from "Ask" shows what would run, then Confirm
// (black on gold) or Cancel; nothing runs until staff press Confirm, and the API checks again then.

type Outcome = Readonly<{ status: string; text: string }>;

function CardLines({ action, copy, locale }: Readonly<{ action: AssistantAction; copy: AssistantCopy; locale: string }>) {
  const when = cardWhen(action.card, locale);
  return (
    <>
      <strong style={{ fontSize: 16 }}>{copy.titles[action.tool] ?? copy.otherTitle}</strong>
      <div style={{ fontWeight: 700 }}>{action.card.subject === "timesheet" ? copy.timesheet : action.card.subject}</div>
      {when ? <div>{when}</div> : null}
      {action.card.place ? <div>{action.card.place}</div> : null}
      {(action.card.details ?? []).map((d) => {
        const item = cardDetail(d);
        const text = item.kind === "workers" ? copy.workers(item.value) : item.kind === "minutes" ? copy.minutes(item.value) : item.kind === "action" ? copy.action(item.value) : item.value;
        return <div key={d}>{text}</div>;
      })}
      {action.card.warning === "late_cancel" ? <div role="note">{copy.lateCancel}</div> : null}
    </>
  );
}

export function StaffAssistantCard({ action, copy }: Readonly<{ action: AssistantAction; copy: AssistantCopy }>) {
  const locale = useLocale();
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const expired = !outcome && (Number.isNaN(Date.parse(action.expiresAt)) || Date.parse(action.expiresAt) <= Date.now());

  async function decide(decision: "confirm" | "cancel") {
    setBusy(true);
    try {
      const response = await fetch(decision === "confirm" ? "/api/assistant/confirm" : "/api/assistant/cancel", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token: action.token, locale: locale.slice(0, 2) })
      });
      const payload = (await response.json().catch(() => null)) as { status?: unknown; text?: unknown } | null;
      setOutcome({
        status: typeof payload?.status === "string" ? payload.status : response.ok ? "done" : "failed",
        text: typeof payload?.text === "string" ? payload.text : copy.actionFailed
      });
    } catch {
      setOutcome({ status: "failed", text: copy.actionFailed });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div role="group" aria-label={copy.cardLabel} style={styles.card}>
      <span style={styles.label}>{copy.cardLabel}</span>
      <CardLines action={action} copy={copy} locale={locale} />
      {outcome ? (
        <p role="status" style={{ margin: "6px 0 0" }}>{outcome.text}</p>
      ) : expired ? (
        <p style={{ margin: "6px 0 0" }}>{copy.expired}</p>
      ) : (
        <div style={styles.row}>
          <button type="button" disabled={busy} onClick={() => void decide("confirm")} style={styles.confirm}>{busy ? copy.working : copy.confirm}</button>
          <button type="button" disabled={busy} onClick={() => void decide("cancel")} style={styles.cancel}>{copy.cancel}</button>
        </div>
      )}
    </div>
  );
}

/** Read-only line for a card or result inside a conversation (never the token, never raw JSON). */
export function assistantMessageText(authorKind: string, body: string, copy: AssistantCopy): string {
  if (authorKind === "assistant_action") {
    const action = parseAssistantAction(body);
    if (!action) return "";
    const subject = action.card.subject === "timesheet" ? copy.timesheet : action.card.subject;
    return copy.shown(copy.titles[action.tool] ?? copy.otherTitle, subject);
  }
  if (authorKind === "assistant_result") {
    const result = parseAssistantResult(body);
    return result ? copy.result(result.status, result.text) : "";
  }
  return body;
}

const styles = {
  card: { border: "1px solid #F8B808", borderRadius: 10, color: "#f4efe4", display: "grid", gap: 4, marginTop: 12, minWidth: 0, overflowWrap: "anywhere", padding: 12, textAlign: "start" },
  label: { color: "#f8b808", fontSize: 13, fontWeight: 700 },
  row: { display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 },
  confirm: { background: "#F8B808", border: "none", borderRadius: 8, color: "#000000", cursor: "pointer", fontWeight: 800, minHeight: 44, padding: "10px 18px" },
  cancel: { background: "transparent", border: "1px solid rgba(248, 184, 8, 0.28)", borderRadius: 8, color: "#f4efe4", cursor: "pointer", fontWeight: 700, minHeight: 44, padding: "10px 18px" }
} as const;
