"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useLocale, useT } from "../../i18n/LocaleProvider";
import { AssistantActionCard } from "./AssistantActionCard";
import { cardState, parseAssistantAction, parseAssistantResult } from "./assistantCards";
import { langOf } from "../../i18n/localText";
import { contactText } from "./contactText";

// Contact Joblop for employers: AI answers first and hands over to the Joblop team when a person must
// decide. An employer sees only their own conversations; the API enforces that.

type Conversation = Readonly<{ id: string; topic: string; status: string; urgent: boolean; unread: boolean; lastMessageAt: string }>;
type Message = Readonly<{ id: string; authorKind: string; body: string; createdAt: string }>;
type ListState = { status: "loading" } | { status: "signed_out" } | { status: "error" } | { status: "ready"; items: readonly Conversation[] };

const TOPICS: Readonly<Record<string, string>> = {
  shift: "A shift",
  worker_no_show: "Worker didn't show",
  timesheet: "Timesheet",
  invoice: "Invoice",
  account: "Account",
  other: "Other"
};
const POLL_MS = 10_000;

function browserLocale() {
  const language = typeof navigator === "undefined" ? "en" : navigator.language.slice(0, 2);
  return language === "fr" || language === "ar" ? language : "en";
}

function NewMessage({ onSent }: { onSent(id: string): void }) {
  const tx = contactText[langOf(useLocale())];
  const params = useSearchParams();
  const requested = params.get("topic") ?? "";
  const [topic, setTopic] = useState(requested in TOPICS ? requested : "shift");
  const [body, setBody] = useState("");
  const [urgent, setUrgent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const relatedId = params.get("orderId");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setFailed(false);
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ topic, body, urgent, locale: browserLocale(), ...(relatedId ? { relatedType: "order", relatedId } : {}) })
      });
      if (!response.ok) return setFailed(true);
      const payload = (await response.json()) as { id: string };
      onSent(payload.id);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={(e) => void submit(e)} style={styles.card}>
      <label style={styles.label} htmlFor="contact-topic">{tx.topicLabel}</label>
      <select id="contact-topic" value={topic} onChange={(e) => setTopic(e.target.value)} style={styles.field}>
        {Object.keys(TOPICS).map((value) => <option key={value} value={value}>{tx.topics[value] ?? value}</option>)}
      </select>
      <label style={styles.label} htmlFor="contact-body">{tx.messageLabel}</label>
      <textarea id="contact-body" value={body} onChange={(e) => setBody(e.target.value)} maxLength={2000} rows={4} required style={styles.field} />
      <label style={styles.check}>
        <input type="checkbox" checked={urgent} onChange={(e) => setUrgent(e.target.checked)} />
        {tx.urgentLabel}
      </label>
      <p style={styles.muted}>{tx.noBankDetails}</p>
      {failed ? <p role="alert" style={styles.error}>{tx.sendFailed}</p> : null}
      <button type="submit" disabled={busy || !body.trim()} style={styles.button}>{busy ? tx.sending : tx.send}</button>
    </form>
  );
}

function Thread({ id, onBack }: { id: string; onBack(): void }) {
  const t = useT();
  const locale = useLocale();
  const tx = contactText[langOf(locale)];
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<readonly Message[] | null>(null);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    const response = await fetch(`/api/contact/${encodeURIComponent(id)}`, { cache: "no-store" }).catch(() => null);
    if (!response?.ok) return;
    const payload = (await response.json()) as { conversation: Conversation; messages: Message[] };
    setConversation(payload.conversation);
    setMessages(payload.messages);
  }, [id]);

  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), POLL_MS);
    return () => clearInterval(timer);
  }, [load]);

  async function post(url: string, payload: object) {
    setBusy(true);
    setFailed(false);
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...payload, locale: browserLocale() })
      });
      if (!response.ok) { setFailed(true); return false; }
      await load();
      return true;
    } catch {
      setFailed(true);
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (await post(`/api/contact/${encodeURIComponent(id)}/messages`, { body: reply })) setReply("");
  }

  // Confirm or Cancel on an assistant card. The result is written into the conversation by the API.
  async function decide(token: string, decision: "confirm" | "cancel"): Promise<string | null> {
    try {
      const response = await fetch(
        decision === "confirm"
          ? `/api/contact/${encodeURIComponent(id)}/assistant/confirm`
          : `/api/contact/${encodeURIComponent(id)}/assistant/cancel`,
        {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, locale: locale.slice(0, 2) })
      });
      const payload = (await response.json().catch(() => null)) as { status?: unknown; text?: unknown } | null;
      await load();
      // A refused card (expired, already used, switched off) comes back as 200 with status "rejected".
      if (response.ok && payload?.status !== "rejected") return null;
      return typeof payload?.text === "string" ? payload.text : t("assistant.actionFailed");
    } catch {
      return t("assistant.actionFailed");
    }
  }

  if (!messages || !conversation) return <p style={styles.muted}>{tx.loading}</p>;
  return (
    <section style={styles.card}>
      <button type="button" onClick={onBack} style={styles.ghost}>{tx.allMessages}</button>
      <p style={styles.muted}>
        {tx.topics[conversation.topic] ?? conversation.topic} · {tx.status[conversation.status] ?? conversation.status}
        {conversation.urgent ? ` · ${tx.urgent}` : ""}
      </p>
      <div role="log" aria-live="polite" style={styles.log}>
        {messages.map((m) => {
          if (m.authorKind === "assistant_action") {
            const action = parseAssistantAction(m.body);
            if (!action) return null;
            return (
              <AssistantActionCard
                key={m.id}
                action={action}
                state={cardState(action, messages)}
                locale={locale}
                t={t}
                onDecide={(decision) => decide(action.token, decision)}
              />
            );
          }
          const body = m.authorKind === "assistant_result" ? parseAssistantResult(m.body)?.text ?? "" : m.body;
          if (!body) return null;
          return (
            <div key={m.id} style={m.authorKind === "requester" ? styles.mine : styles.theirs}>
              <strong style={styles.label}>{tx.authors[m.authorKind] ?? "Joblop"}</strong>
              <div style={{ whiteSpace: "pre-wrap" }}>{body}</div>
            </div>
          );
        })}
      </div>
      {failed ? <p role="alert" style={styles.error}>{tx.sendFailed}</p> : null}
      <form onSubmit={(e) => void submit(e)}>
        <label style={styles.label} htmlFor="contact-reply">{tx.messageLabel}</label>
        <textarea id="contact-reply" value={reply} onChange={(e) => setReply(e.target.value)} maxLength={2000} rows={3} required style={styles.field} />
        <div style={styles.row}>
          <button type="submit" disabled={busy || !reply.trim()} style={styles.button}>{busy ? tx.sending : tx.send}</button>
          {conversation.status === "ai" ? (
            <button type="button" disabled={busy} onClick={() => void post(`/api/contact/${encodeURIComponent(id)}/person`, {})} style={styles.ghost}>{tx.askPerson}</button>
          ) : null}
        </div>
      </form>
    </section>
  );
}

export function EmployerContactPanel() {
  const tx = contactText[langOf(useLocale())];
  const [state, setState] = useState<ListState>({ status: "loading" });
  const [openId, setOpenId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/contact", { cache: "no-store" });
      if (response.status === 401 || response.status === 403) return setState({ status: "signed_out" });
      if (!response.ok) return setState({ status: "error" });
      const payload = (await response.json()) as { conversations: Conversation[] };
      setState({ status: "ready", items: payload.conversations });
    } catch {
      setState({ status: "error" });
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  if (state.status === "loading") return <p style={styles.muted}>{tx.loading}</p>;
  if (state.status === "signed_out") return <p style={styles.muted}>{tx.signIn}</p>;
  if (state.status === "error") return <p role="alert" style={styles.error}>{tx.loadFailed}</p>;
  if (openId) return <Thread id={openId} onBack={() => { setOpenId(null); void load(); }} />;

  return (
    <>
      <NewMessage onSent={setOpenId} />
      {state.items.length ? <h2 style={{ fontSize: 20 }}>{tx.history}</h2> : null}
      <div style={styles.list}>
        {state.items.map((c) => (
          <button key={c.id} type="button" onClick={() => setOpenId(c.id)} style={styles.item}>
            <strong>{tx.topics[c.topic] ?? c.topic}{c.unread ? ` · ${tx.newReply}` : ""}</strong>
            <span style={styles.muted}>{tx.status[c.status] ?? c.status} · {new Date(c.lastMessageAt).toLocaleString()}</span>
          </button>
        ))}
      </div>
    </>
  );
}

const line = "1px solid rgba(248, 184, 8, 0.24)";
const styles = {
  card: { border: line, borderRadius: 12, marginBottom: 16, padding: 16 },
  label: { color: "#f8b808", display: "block", fontSize: 13, fontWeight: 700, marginBottom: 4 },
  field: { background: "#111", border: line, borderRadius: 8, boxSizing: "border-box", color: "#f4efe4", display: "block", font: "inherit", marginBottom: 12, padding: 10, width: "100%" },
  check: { alignItems: "center", display: "flex", gap: 8, marginBottom: 12 },
  muted: { color: "#b3a994", fontSize: 14 },
  error: { color: "#ff8a7a" },
  button: { background: "#f8b808", border: "none", borderRadius: 8, color: "#000", cursor: "pointer", fontWeight: 800, padding: "10px 16px" },
  ghost: { background: "transparent", border: line, borderRadius: 8, color: "#f4efe4", cursor: "pointer", fontWeight: 700, padding: "10px 16px" },
  row: { display: "flex", flexWrap: "wrap", gap: 10 },
  log: { display: "grid", gap: 10, marginBottom: 12 },
  mine: { background: "rgba(248, 184, 8, 0.1)", border: line, borderRadius: 10, overflowWrap: "anywhere", padding: 10 },
  theirs: { border: line, borderRadius: 10, overflowWrap: "anywhere", padding: 10 },
  list: { display: "grid", gap: 10 },
  item: { background: "transparent", border: line, borderRadius: 10, color: "#f4efe4", cursor: "pointer", display: "grid", font: "inherit", gap: 4, padding: 12, textAlign: "start", width: "100%" }
} as const;
