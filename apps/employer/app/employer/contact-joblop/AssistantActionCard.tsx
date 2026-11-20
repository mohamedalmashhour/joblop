"use client";

import { useState } from "react";
import type { Translate } from "../../i18n/LocaleProvider";
import type { MessageKey } from "../../i18n/messages";
import { cardDetail, cardWhen, type AssistantAction, type CardState } from "./assistantCards";

// One action card from the assistant: what it would do, then Confirm (black on gold) or Cancel.
// Nothing happens until the employer presses Confirm; the API checks everything again then.

const TITLES: Readonly<Record<string, MessageKey>> = {
  create_draft_request: "assistant.title.create_draft_request",
  submit_draft: "assistant.title.submit_draft",
  confirm_timesheet: "assistant.title.confirm_timesheet",
  duplicate_request: "assistant.title.duplicate_request"
};

export function AssistantActionCard({
  action,
  state,
  locale,
  t,
  onDecide
}: Readonly<{
  action: AssistantAction;
  state: CardState;
  locale: string;
  t: Translate;
  onDecide(decision: "confirm" | "cancel"): Promise<string | null>;
}>) {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const when = cardWhen(action.card, locale);

  async function decide(decision: "confirm" | "cancel") {
    setBusy(true);
    setNote(null);
    try {
      setNote(await onDecide(decision));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div role="group" aria-label={t("assistant.cardLabel")} style={styles.card}>
      <div style={styles.label}>{t("assistant.cardLabel")}</div>
      <strong style={styles.title}>{t(TITLES[action.tool] ?? "assistant.title.other")}</strong>
      <div style={styles.subject}>{action.card.subject === "timesheet" ? t("assistant.subject.timesheet") : action.card.subject}</div>
      {when ? <div style={styles.line}>{when}</div> : null}
      {action.card.place ? <div style={styles.line}>{action.card.place}</div> : null}
      {(action.card.details ?? []).map((d) => {
        const item = cardDetail(d);
        if (item.kind === "action") return null;
        const text = item.kind === "workers" ? t("assistant.workers", { count: item.value }) : item.kind === "minutes" ? t("assistant.minutes", { count: item.value }) : item.value;
        return <div key={d} style={styles.line}>{text}</div>;
      })}
      {action.card.warning === "late_cancel" ? <p role="note" style={styles.warning}>{t("assistant.lateCancel")}</p> : null}
      {state === "pending" ? (
        <div style={styles.row}>
          <button type="button" disabled={busy} onClick={() => void decide("confirm")} style={styles.confirm}>
            {busy ? t("assistant.working") : t("assistant.confirm")}
          </button>
          <button type="button" disabled={busy} onClick={() => void decide("cancel")} style={styles.cancel}>
            {t("assistant.cancel")}
          </button>
        </div>
      ) : (
        <p style={styles.state}>{state === "expired" ? t("assistant.state.expired") : t(`assistant.state.${state}` as MessageKey)}</p>
      )}
      {note && state === "pending" ? <p role="alert" style={styles.state}>{note}</p> : null}
    </div>
  );
}

const styles = {
  card: { border: "1px solid #F8B808", color: "#f4efe4", borderRadius: 10, display: "grid", gap: 4, padding: 12, textAlign: "start", minWidth: 0, overflowWrap: "anywhere" },
  label: { color: "#f8b808", fontSize: 13, fontWeight: 700 },
  title: { fontSize: 16 },
  subject: { fontWeight: 700 },
  line: { fontSize: 14 },
  warning: { background: "rgba(248,184,8,.12)", borderRadius: 8, margin: "6px 0 0", padding: 8 },
  row: { display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 },
  confirm: { background: "#F8B808", border: "none", borderRadius: 8, color: "#000000", cursor: "pointer", fontWeight: 800, minHeight: 44, padding: "10px 18px" },
  cancel: { background: "transparent", border: "1px solid currentColor", borderRadius: 8, color: "inherit", cursor: "pointer", fontWeight: 700, minHeight: 44, padding: "10px 18px" },
  state: { fontSize: 14, margin: "6px 0 0" }
} as const;
