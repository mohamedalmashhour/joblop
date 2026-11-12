"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { usePageText } from "../i18n/pageText";
import { contactDeskText } from "./text";
import { SignedOut } from "../shared/SignedOut";
import { useLocale } from "../i18n/LocaleProvider";
import { parseAssistantAction, type AssistantAction } from "./assistantCards";
import { assistantMessageText, StaffAssistantCard } from "./StaffAssistantCard";

// One list for workers and employers, urgent first and longest-waiting next. Internal notes are never
// shown to the worker or employer.

type Conversation = Readonly<{
  id: string; side: string; topic: string; status: string; urgent: boolean; unread: boolean;
  summary: string | null; handoffReason: string | null; relatedType: string | null; relatedId: string | null;
  lastMessageAt: string; requesterName?: string;
}>;
type Message = Readonly<{ id: string; authorKind: string; body: string; internal: boolean; createdAt: string }>;
type Detail = Readonly<{ conversation: Conversation; requester: { name: string; email: string | null }; messages: readonly Message[] }>;
type State = { status: "loading" } | { status: "denied" } | { status: "error" } | { status: "ready"; items: readonly Conversation[] };

// Codes sent to the API. The labels shown for them (and for status, reason and author codes) live in
// ./text.ts, keyed by these codes.
const FILTERS = ["needs_admin", "ai", "solved", "all"] as const;
const SIDES = ["", "worker", "employer"] as const;
type DeskCopy = (typeof contactDeskText)["en"];
const POLL_MS = 15_000;

function waitingFor(t: DeskCopy, iso: string) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60_000));
  if (minutes < 60) return t.minutes(minutes);
  const hours = Math.floor(minutes / 60);
  return hours < 24 ? t.hours(hours) : t.days(Math.floor(hours / 24));
}

function AskAi({ conversationId }: { conversationId: string | null }) {
  const t = usePageText(contactDeskText);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [cards, setCards] = useState<readonly AssistantAction[]>([]);
  const locale = useLocale();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function ask(text: string) {
    setBusy(true);
    setFailed(false);
    setAnswer(null);
    setCards([]);
    try {
      const response = await fetch("/api/contact/ask", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question: text, conversationId, locale: locale.slice(0, 2) })
      });
      const payload = response.ok ? ((await response.json()) as { answer: string | null; cards?: unknown }) : null;
      if (payload?.answer) setAnswer(payload.answer);
      else setFailed(true);
      // Action cards from the staff assistant (only when it is switched on). Never shows the token.
      const raw: unknown[] = Array.isArray(payload?.cards) ? payload.cards : [];
      setCards(raw.map((c) => parseAssistantAction(JSON.stringify(c))).filter((c): c is AssistantAction => c !== null));
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    void ask(question);
  }

  return (
    <section style={styles.thread} aria-label={t.askTitle}>
      <h2 style={{ fontSize: 18, margin: "0 0 4px" }}>{t.askTitle}</h2>
      <p style={styles.muted}>{t.askHelp}</p>
      <form onSubmit={submit}>
        <label style={styles.label} htmlFor="desk-ask">{t.yourQuestion}</label>
        <textarea id="desk-ask" value={question} onChange={(e) => setQuestion(e.target.value)} maxLength={2000} rows={2} required style={styles.field} />
        <div style={styles.row}>
          <button type="submit" disabled={busy || !question.trim()} style={styles.button}>{busy ? t.thinking : t.ask}</button>
          {conversationId ? (
            <button type="button" disabled={busy} onClick={() => void ask("Draft a reply to this conversation.")} style={styles.ghost}>{t.draftReply}</button>
          ) : null}
        </div>
      </form>
      {failed ? <p role="alert" style={styles.error}>{t.askFailed}</p> : null}
      {answer ? <div style={{ ...styles.message, marginTop: 12, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{answer}</div> : null}
      {cards.map((card) => <StaffAssistantCard key={card.proposalId} action={card} copy={t.assistant} />)}
    </section>
  );
}

function Thread({ id, onChanged }: { id: string; onChanged(): void }) {
  const t = usePageText(contactDeskText);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [text, setText] = useState("");
  const [internal, setInternal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    const response = await fetch(`/api/contact/${encodeURIComponent(id)}`, { cache: "no-store" }).catch(() => null);
    if (response?.ok) setDetail((await response.json()) as Detail);
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
        body: JSON.stringify(payload)
      });
      if (!response.ok) { setFailed(true); return false; }
      await load();
      onChanged();
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
    if (await post(`/api/contact/${encodeURIComponent(id)}/messages`, { body: text, internal })) setText("");
  }

  if (!detail) return <p style={styles.muted}>{t.loading}</p>;
  const c = detail.conversation;
  return (
    <section style={styles.thread}>
      <h2 style={{ margin: 0 }}>{detail.requester.name}</h2>
      <p style={styles.muted}>
        {c.side === "worker" ? t.worker : t.employer} · {c.topic} · {t.status[c.status] ?? c.status}
        {c.handoffReason ? ` · ${t.reason[c.handoffReason] ?? c.handoffReason}` : ""}
        {detail.requester.email ? ` · ${detail.requester.email}` : ""}
      </p>
      {c.summary ? <p><strong>{t.aiSummary}</strong> {c.summary}</p> : null}
      {c.relatedType ? <p style={styles.muted}>{t.about(c.relatedType, c.relatedId)}</p> : null}
      <div role="log" style={styles.log}>
        {detail.messages.map((m) => (
          <div key={m.id} style={m.internal ? styles.note : styles.message}>
            <strong style={styles.label}>{t.author[m.authorKind] ?? m.authorKind}{m.internal ? t.internalTag : ""} · {new Date(m.createdAt).toLocaleString("en-CA", { timeZone: "America/Toronto" })}</strong>
            <div style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{assistantMessageText(m.authorKind, m.body, t.assistant)}</div>
          </div>
        ))}
      </div>
      {failed ? <p role="alert" style={styles.error}>{t.failed}</p> : null}
      <form onSubmit={(e) => void submit(e)}>
        <label style={styles.label} htmlFor="desk-reply">{internal ? t.internalNote : t.reply}</label>
        <textarea id="desk-reply" value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} rows={4} required style={styles.field} />
        <label style={styles.check}>
          <input type="checkbox" checked={internal} onChange={(e) => setInternal(e.target.checked)} />
          {t.internalCheck}
        </label>
        <div style={styles.row}>
          <button type="submit" disabled={busy || !text.trim()} style={styles.button}>{internal ? t.saveNote : t.sendReply}</button>
          <button type="button" disabled={busy} onClick={() => void post(`/api/contact/${encodeURIComponent(id)}/assign`, {})} style={styles.ghost}>{t.assignToMe}</button>
          {c.status === "solved" ? (
            <button type="button" disabled={busy} onClick={() => void post(`/api/contact/${encodeURIComponent(id)}/status`, { status: "needs_admin" })} style={styles.ghost}>{t.reopen}</button>
          ) : (
            <button type="button" disabled={busy} onClick={() => void post(`/api/contact/${encodeURIComponent(id)}/status`, { status: "solved" })} style={styles.ghost}>{t.markSolved}</button>
          )}
        </div>
      </form>
    </section>
  );
}

export function ContactDeskPanel() {
  const t = usePageText(contactDeskText);
  const [state, setState] = useState<State>({ status: "loading" });
  const [filter, setFilter] = useState<string>("needs_admin");
  const [side, setSide] = useState<string>("");
  const [openId, setOpenId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const query = new URLSearchParams({ filter, ...(side ? { side } : {}) });
      const response = await fetch(`/api/contact?${query}`, { cache: "no-store" });
      if (response.status === 401 || response.status === 403) return setState({ status: "denied" });
      if (!response.ok) return setState({ status: "error" });
      const payload = (await response.json()) as { conversations: Conversation[] };
      setState({ status: "ready", items: payload.conversations });
    } catch {
      setState({ status: "error" });
    }
  }, [filter, side]);

  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), POLL_MS);
    return () => clearInterval(timer);
  }, [load]);

  return (
    <div style={styles.body}>
      <div style={styles.row}>
        {FILTERS.map((value) => (
          <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)} style={filter === value ? styles.button : styles.ghost}>{t.filters[value] ?? value}</button>
        ))}
        {SIDES.map((value) => (
          <button key={`side-${value}`} type="button" aria-pressed={side === value} onClick={() => setSide(value)} style={side === value ? styles.button : styles.ghost}>{t.sides[value] ?? value}</button>
        ))}
      </div>
      {state.status === "denied" ? null : <AskAi conversationId={openId} />}
      {state.status === "loading" ? <p style={styles.muted}>{t.loading}</p> : null}
      {state.status === "denied" ? <SignedOut compact /> : null}
      {state.status === "error" ? <p role="alert" style={styles.error}>{t.loadError}</p> : null}
      {state.status === "ready" ? (
        <div style={styles.columns}>
          <div style={styles.list}>
            {state.items.length === 0 ? <p style={styles.muted}>{t.empty}</p> : null}
            {state.items.map((c) => (
              <button key={c.id} type="button" onClick={() => setOpenId(c.id)} style={c.id === openId ? styles.itemOpen : styles.item}>
                <strong>{c.urgent ? t.urgent : ""}{c.requesterName ?? t.unknown}{c.unread ? " ●" : ""}</strong>
                <span style={styles.muted}>{c.side === "worker" ? t.worker : t.employer} · {c.topic} · {t.status[c.status] ?? c.status}</span>
                <span style={styles.muted}>{t.lastMessage(waitingFor(t, c.lastMessageAt))}</span>
              </button>
            ))}
          </div>
          {openId ? <Thread key={openId} id={openId} onChanged={() => void load()} /> : <p style={styles.muted}>{t.chooseConversation}</p>}
        </div>
      ) : null}
    </div>
  );
}

const line = "1px solid rgba(248, 184, 8, 0.28)";
const styles = {
  body: { display: "grid", gap: 16, padding: "0 clamp(18px, 5vw, 64px) 56px" },
  columns: { alignItems: "start", display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" },
  list: { display: "grid", gap: 10 },
  item: { background: "transparent", border: line, borderRadius: 10, color: "#f4efe4", cursor: "pointer", display: "grid", font: "inherit", gap: 4, padding: 12, textAlign: "start", width: "100%" },
  itemOpen: { background: "rgba(248, 184, 8, 0.14)", border: line, borderRadius: 10, color: "#f4efe4", cursor: "pointer", display: "grid", font: "inherit", gap: 4, padding: 12, textAlign: "start", width: "100%" },
  thread: { border: line, borderRadius: 12, padding: 16 },
  log: { display: "grid", gap: 10, margin: "12px 0" },
  message: { border: line, borderRadius: 10, padding: 10 },
  note: { background: "rgba(255, 241, 168, 0.1)", border: "1px dashed rgba(255, 241, 168, 0.5)", borderRadius: 10, padding: 10 },
  label: { color: "#f8b808", display: "block", fontSize: 13, fontWeight: 700, marginBottom: 4 },
  field: { background: "#111", border: line, borderRadius: 8, boxSizing: "border-box", color: "#f4efe4", display: "block", font: "inherit", marginBottom: 12, padding: 10, width: "100%" },
  check: { alignItems: "center", display: "flex", gap: 8, marginBottom: 12 },
  muted: { color: "#b3a994", fontSize: 14 },
  error: { color: "#ff8a7a" },
  button: { background: "#f8b808", border: "none", borderRadius: 8, color: "#000", cursor: "pointer", fontWeight: 800, padding: "10px 14px" },
  ghost: { background: "transparent", border: line, borderRadius: 8, color: "#f4efe4", cursor: "pointer", fontWeight: 700, padding: "10px 14px" },
  row: { display: "flex", flexWrap: "wrap", gap: 10 }
} as const;
