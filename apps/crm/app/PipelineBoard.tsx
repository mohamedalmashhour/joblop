"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { crmApi, type BoardColumn, type Contact } from "./crmClient";
import { ConsentBadge, TypeBadge } from "./Badges";
import { CONTACT_TYPES, STAGE_LABEL, STAGES, TYPE_LABEL, ui, type ContactType, type Stage } from "./ui";

export function PipelineBoard() {
  const [board, setBoard] = useState<BoardColumn[] | null>(null);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"" | ContactType>("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await crmApi.listContacts({ q: query || undefined, type: typeFilter || undefined });
      setBoard(data.board);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load contacts.");
    } finally {
      setLoading(false);
    }
  }, [query, typeFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const columns = useMemo(() => {
    const byStage = new Map((board ?? []).map((c) => [c.stage, c.contacts] as const));
    return STAGES.map((stage) => ({ stage, contacts: byStage.get(stage) ?? [] }));
  }, [board]);

  async function onMove(contact: Contact, stage: Stage) {
    try {
      await crmApi.moveStage(contact.id, stage);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not move the contact.");
    }
  }

  return (
    <div>
      <header style={styles.head}>
        <div>
          <h1 style={styles.title}>Pipeline</h1>
          <p style={styles.lede}>
            {loading ? "Loading…" : `${total} contact${total === 1 ? "" : "s"}`} across five stages. Staff-only.
          </p>
        </div>
        <button type="button" onClick={() => setCreating(true)} style={styles.primary}>
          + New contact
        </button>
      </header>

      <div style={styles.filters}>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name, email or phone"
          style={styles.search}
        />
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as "" | ContactType)} style={styles.select}>
          <option value="">All types</option>
          {CONTACT_TYPES.map((t) => (
            <option key={t} value={t}>
              {TYPE_LABEL[t]}
            </option>
          ))}
        </select>
      </div>

      {error ? <p style={styles.error}>{error}</p> : null}

      <div style={styles.board}>
        {columns.map((col) => (
          <section key={col.stage} style={styles.column}>
            <header style={styles.colHead}>
              <span>{STAGE_LABEL[col.stage]}</span>
              <span style={styles.count}>{col.contacts.length}</span>
            </header>
            <div style={styles.colBody}>
              {col.contacts.length === 0 ? (
                <p style={styles.empty}>No contacts</p>
              ) : (
                col.contacts.map((contact) => (
                  <article key={contact.id} style={styles.card}>
                    <div style={styles.cardTop}>
                      <Link href={`/contacts/${contact.id}`} style={styles.cardName}>
                        {contact.name ?? contact.email ?? contact.phone ?? "Unnamed contact"}
                      </Link>
                      <TypeBadge type={contact.type} />
                    </div>
                    {contact.email ? <p style={styles.cardMeta}>{contact.email}</p> : null}
                    {contact.linkedOrganizationName ? (
                      <p style={styles.cardMeta}>{contact.linkedOrganizationName}</p>
                    ) : null}
                    <div style={styles.cardFoot}>
                      <ConsentBadge optedIn={contact.consentOptedIn} />
                      {contact.assigneeName ? <span style={styles.assignee}>@ {contact.assigneeName}</span> : null}
                    </div>
                    <label style={styles.moveLabel}>
                      Move to
                      <select
                        value={contact.stage}
                        onChange={(e) => onMove(contact, e.target.value as Stage)}
                        style={styles.moveSelect}
                      >
                        {STAGES.map((s) => (
                          <option key={s} value={s}>
                            {STAGE_LABEL[s]}
                          </option>
                        ))}
                      </select>
                    </label>
                  </article>
                ))
              )}
            </div>
          </section>
        ))}
      </div>

      {creating ? (
        <NewContactDialog
          onClose={() => setCreating(false)}
          onCreated={() => {
            setCreating(false);
            void load();
          }}
        />
      ) : null}
    </div>
  );
}

function NewContactDialog({ onClose, onCreated }: Readonly<{ onClose: () => void; onCreated: () => void }>) {
  const [type, setType] = useState<ContactType>("lead");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await crmApi.createContact({
        type,
        name: name.trim() || undefined,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        source: "manual"
      });
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the contact.");
      setBusy(false);
    }
  }

  return (
    <div style={styles.overlay} role="dialog" aria-modal="true" aria-label="New contact">
      <form onSubmit={submit} style={styles.dialog}>
        <h2 style={styles.dialogTitle}>New contact</h2>
        <label style={styles.field}>
          Type
          <select value={type} onChange={(e) => setType(e.target.value as ContactType)} style={styles.input}>
            {CONTACT_TYPES.map((t) => (
              <option key={t} value={t}>
                {TYPE_LABEL[t]}
              </option>
            ))}
          </select>
        </label>
        <label style={styles.field}>
          Name
          <input value={name} onChange={(e) => setName(e.target.value)} style={styles.input} placeholder="Full name or company" />
        </label>
        <label style={styles.field}>
          Email
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" style={styles.input} />
        </label>
        <label style={styles.field}>
          Phone
          <input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" style={styles.input} />
        </label>
        {error ? <p style={styles.error}>{error}</p> : null}
        <div style={styles.dialogButtons}>
          <button type="button" onClick={onClose} style={styles.ghost}>
            Cancel
          </button>
          <button type="submit" disabled={busy} style={styles.primary}>
            {busy ? "Creating…" : "Create"}
          </button>
        </div>
      </form>
    </div>
  );
}

const styles = {
  head: { alignItems: "flex-end", display: "flex", gap: 16, justifyContent: "space-between", marginBottom: 20 },
  title: { fontSize: "clamp(26px, 4vw, 38px)", margin: 0 },
  lede: { color: ui.muted, fontSize: 14, margin: "6px 0 0" },
  filters: { display: "flex", flexWrap: "wrap" as const, gap: 12, marginBottom: 18 },
  search: {
    background: ui.raised,
    border: `1px solid ${ui.hairlineSoft}`,
    borderRadius: 10,
    color: ui.text,
    flex: "1 1 240px",
    fontSize: 14,
    padding: "10px 12px"
  },
  select: { background: ui.raised, border: `1px solid ${ui.hairlineSoft}`, borderRadius: 10, color: ui.text, fontSize: 14, padding: "10px 12px" },
  board: { display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))" },
  column: { background: ui.raised, border: `1px solid ${ui.hairlineSoft}`, borderRadius: 14, display: "flex", flexDirection: "column" as const, minHeight: 200 },
  colHead: {
    alignItems: "center",
    borderBottom: `1px solid ${ui.hairline}`,
    color: ui.goldSoft,
    display: "flex",
    fontSize: 13,
    fontWeight: 800,
    justifyContent: "space-between",
    letterSpacing: "0.04em",
    padding: "12px 14px",
    textTransform: "uppercase" as const
  },
  count: { background: "rgba(248,184,8,0.12)", borderRadius: 999, color: ui.goldSoft, fontSize: 12, padding: "1px 8px" },
  colBody: { display: "grid", gap: 10, padding: 12 },
  empty: { color: ui.muted, fontSize: 13, margin: 0, padding: "8px 2px" },
  card: { background: ui.raisedStrong, border: `1px solid ${ui.hairlineSoft}`, borderRadius: 10, display: "grid", gap: 8, padding: 12 },
  cardTop: { alignItems: "center", display: "flex", gap: 8, justifyContent: "space-between" },
  cardName: { color: ui.text, fontSize: 14, fontWeight: 700, textDecoration: "none" },
  cardMeta: { color: ui.muted, fontSize: 12, margin: 0 },
  cardFoot: { alignItems: "center", display: "flex", flexWrap: "wrap" as const, gap: 8 },
  assignee: { color: ui.muted, fontSize: 11, fontWeight: 700 },
  moveLabel: { color: ui.muted, display: "grid", fontSize: 11, gap: 4 },
  moveSelect: { background: ui.black, border: `1px solid ${ui.hairlineSoft}`, borderRadius: 8, color: ui.text, fontSize: 12, padding: "6px 8px" },
  primary: { background: ui.gold, border: "none", borderRadius: 10, color: ui.onGold, cursor: "pointer", fontSize: 14, fontWeight: 800, padding: "11px 16px" },
  ghost: { background: "transparent", border: `1px solid ${ui.hairlineSoft}`, borderRadius: 10, color: ui.muted, cursor: "pointer", fontSize: 14, fontWeight: 700, padding: "11px 16px" },
  error: { color: "#ff9d9d", fontSize: 13, margin: "0 0 12px" },
  overlay: {
    alignItems: "center",
    background: "rgba(0,0,0,0.72)",
    display: "flex",
    inset: 0,
    justifyContent: "center",
    padding: 16,
    position: "fixed" as const,
    zIndex: 50
  },
  dialog: { background: ui.raised, border: `1px solid ${ui.hairline}`, borderRadius: 16, display: "grid", gap: 12, maxWidth: 420, padding: 24, width: "100%" },
  dialogTitle: { fontSize: 22, margin: "0 0 4px" },
  field: { color: ui.muted, display: "grid", fontSize: 13, fontWeight: 700, gap: 6 },
  input: { background: ui.black, border: `1px solid ${ui.hairlineSoft}`, borderRadius: 10, color: ui.text, fontSize: 15, padding: "10px 12px" },
  dialogButtons: { display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 6 }
} as const;
