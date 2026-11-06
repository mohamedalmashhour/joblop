"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useLocale, useT, type Translate } from "../i18n/LocaleProvider";
import type { MessageKey } from "../i18n/messages";

// Contact Joblop: AI answers first and hands over to the Joblop team when a person must decide.
// A worker sees only their own conversations; the API enforces that.

type Conversation = Readonly<{ id: string; topic: string; status: string; urgent: boolean; unread: boolean; lastMessageAt: string }>;
type Message = Readonly<{ id: string; authorKind: string; body: string; createdAt: string }>;
type ListState = { status: "loading" } | { status: "signed_out" } | { status: "error" } | { status: "ready"; items: readonly Conversation[] };

const TOPICS = ["shift", "pay", "documents", "account", "other"] as const;
const POLL_MS = 10_000;

const topicKey = (topic: string) => `contact.topic.${topic}` as MessageKey;
const statusKey = (status: string) => `contact.status.${status}` as MessageKey;

function NewMessage({ onSent, t }: { onSent(id: string): void; t: Translate }) {
  const locale = useLocale();
  const params = useSearchParams();
  const requested = params.get("topic");
  const [topic, setTopic] = useState<string>(TOPICS.includes(requested as (typeof TOPICS)[number]) ? (requested as string) : "shift");
  const [body, setBody] = useState("");
  const [urgent, setUrgent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const relatedType = params.get("relatedType");
  const relatedId = params.get("relatedId");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setFailed(false);
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ topic, body, urgent, locale: locale.slice(0, 2), ...(relatedType && relatedId ? { relatedType, relatedId } : {}) })
      });
      if (!response.ok) return setFailed(true);
      const payload = (await response.json()) as { id: string };
      setBody("");
      setUrgent(false);
      onSent(payload.id);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="card" onSubmit={(e) => void submit(e)} style={{ marginBottom: 16 }}>
      <label className="role" htmlFor="contact-topic">{t("contact.topicLabel")}</label>
      <select id="contact-topic" value={topic} onChange={(e) => setTopic(e.target.value)} style={{ display: "block", margin: "6px 0 12px", width: "100%" }}>
        {TOPICS.map((value) => <option key={value} value={value}>{t(topicKey(value))}</option>)}
      </select>
      <label className="role" htmlFor="contact-body">{t("contact.messageLabel")}</label>
      <textarea id="contact-body" value={body} onChange={(e) => setBody(e.target.value)} maxLength={2000} rows={4} required style={{ display: "block", margin: "6px 0 12px", width: "100%" }} />
      <label style={{ alignItems: "center", display: "flex", gap: 8, marginBottom: 12 }}>
        <input type="checkbox" checked={urgent} onChange={(e) => setUrgent(e.target.checked)} />
        {t("contact.urgentLabel")}
      </label>
      <p className="notice">{t("contact.noPrivateFiles")}</p>
      {failed ? <p className="state error" role="alert">{t("contact.sendFailed")}</p> : null}
      <button className="btn" type="submit" disabled={busy || !body.trim()}>{busy ? t("contact.sending") : t("contact.send")}</button>
    </form>
  );
}

function Thread({ id, onBack, t }: { id: string; onBack(): void; t: Translate }) {
  const locale = useLocale();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<readonly Message[] | null>(null);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const end = useRef<HTMLDivElement>(null);

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

  const count = messages?.length ?? 0;
  useEffect(() => { if (count) end.current?.scrollIntoView?.({ block: "nearest" }); }, [count]);

  async function post(url: string, payload: object) {
    setBusy(true);
    setFailed(false);
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...payload, locale: locale.slice(0, 2) })
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

  if (!messages || !conversation) return <div className="state">{t("common.loading")}</div>;
  return (
    <section className="card" aria-label={t(topicKey(conversation.topic))}>
      <button className="btn ghost" type="button" onClick={onBack}>{t("contact.back")}</button>
      <div className="chips" style={{ margin: "12px 0" }}>
        <span className="chip">{t(topicKey(conversation.topic))}</span>
        <span className="chip">{t(statusKey(conversation.status))}</span>
        {conversation.urgent ? <span className="chip status-rejected">{t("contact.urgent")}</span> : null}
      </div>
      <div role="log" aria-live="polite" style={{ display: "grid", gap: 10, marginBottom: 12 }}>
        {messages.map((m) => (
          <div key={m.id} style={{ background: m.authorKind === "requester" ? "var(--surface-2, rgba(255,255,255,.08))" : "transparent", border: "1px solid var(--line, rgba(255,255,255,.14))", borderRadius: 10, padding: 10 }}>
            <div className="role">{t(m.authorKind === "requester" ? "contact.you" : m.authorKind === "ai" ? "contact.ai" : "contact.team")}</div>
            <div style={{ whiteSpace: "pre-wrap" }}>{m.body}</div>
          </div>
        ))}
        <div ref={end} />
      </div>
      {failed ? <p className="state error" role="alert">{t("contact.sendFailed")}</p> : null}
      <form onSubmit={(e) => void submit(e)}>
        <label className="role" htmlFor="contact-reply">{t("contact.messageLabel")}</label>
        <textarea id="contact-reply" value={reply} onChange={(e) => setReply(e.target.value)} maxLength={2000} rows={3} required style={{ display: "block", margin: "6px 0 12px", width: "100%" }} />
        <div className="chips">
          <button className="btn" type="submit" disabled={busy || !reply.trim()}>{busy ? t("contact.sending") : t("contact.send")}</button>
          {conversation.status === "ai" ? (
            <button className="btn ghost" type="button" disabled={busy} onClick={() => void post(`/api/contact/${encodeURIComponent(id)}/person`, {})}>{t("contact.askPerson")}</button>
          ) : null}
        </div>
      </form>
    </section>
  );
}

export function ContactJoblop() {
  const t = useT();
  const locale = useLocale();
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

  if (state.status === "loading") return <div className="state">{t("common.loading")}</div>;
  if (state.status === "signed_out") return <div className="state">{t("contact.signIn")}</div>;
  if (state.status === "error") return <div className="state error" role="alert">{t("contact.loadFailed")}</div>;

  return (
    <>
      <section className="hero">
        <h1>{t("contact.title")}</h1>
        <p>{t("contact.lede")}</p>
      </section>
      {openId ? (
        <Thread id={openId} t={t} onBack={() => { setOpenId(null); void load(); }} />
      ) : (
        <>
          <NewMessage t={t} onSent={setOpenId} />
          {state.items.length ? <h2>{t("contact.history")}</h2> : null}
          <div style={{ display: "grid", gap: 10 }}>
            {state.items.map((c) => (
              <button key={c.id} type="button" className="card" onClick={() => setOpenId(c.id)} style={{ cursor: "pointer", textAlign: "start", width: "100%" }}>
                <div className="role">{t(topicKey(c.topic))}{c.unread ? ` · ${t("contact.newReply")}` : ""}</div>
                <div className="when">{t(statusKey(c.status))} · {new Date(c.lastMessageAt).toLocaleString(locale)}</div>
              </button>
            ))}
          </div>
        </>
      )}
    </>
  );
}
