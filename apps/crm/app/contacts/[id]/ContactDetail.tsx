"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { crmApi, type Activity, type Contact } from "../../crmClient";
import { ConsentBadge, TypeBadge } from "../../Badges";
import { STAGE_LABEL, STAGES, ui, type Stage } from "../../ui";

const ACTIVITY_LABEL: Record<Activity["kind"], string> = {
  note: "Note",
  call: "Call",
  email: "Email",
  task: "Task",
  stage_change: "Stage change"
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function ContactDetail({ id }: Readonly<{ id: string }>) {
  const [contact, setContact] = useState<Contact | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await crmApi.getContact(id);
      setContact(data.contact);
      setActivities(data.activities);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load the contact.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <p style={{ color: ui.muted }}>Loading…</p>;
  if (error || !contact)
    return (
      <div>
        <p style={styles.error}>{error ?? "Contact not found."}</p>
        <Link href="/" style={styles.back}>
          ← Back to pipeline
        </Link>
      </div>
    );

  return (
    <div>
      <Link href="/" style={styles.back}>
        ← Back to pipeline
      </Link>
      <header style={styles.head}>
        <div>
          <h1 style={styles.title}>{contact.name ?? contact.email ?? contact.phone ?? "Unnamed contact"}</h1>
          <div style={styles.badgeRow}>
            <TypeBadge type={contact.type} />
            <ConsentBadge optedIn={contact.consentOptedIn} />
            <span style={styles.sourceTag}>source: {contact.source}</span>
          </div>
        </div>
      </header>

      <div style={styles.grid}>
        <section style={styles.panel}>
          <h2 style={styles.h2}>Details</h2>
          <dl style={styles.dl}>
            <Row label="Email" value={contact.email} />
            <Row label="Phone" value={contact.phone} />
            <Row label="Linked user" value={contact.linkedUserName ?? contact.linkedUserEmail} />
            <Row label="Linked employer" value={contact.linkedOrganizationName} />
            <Row label="Imported lead" value={contact.linkedLeadTitle} />
            <Row label="Assignee" value={contact.assigneeName ?? "Unassigned"} />
          </dl>

          <StageMover contact={contact} onDone={load} setError={setError} />
          <AssignEditor contact={contact} onDone={load} setError={setError} />
        </section>

        <section style={styles.panel}>
          <h2 style={styles.h2}>Activity</h2>
          <AddActivity id={id} onAdded={load} setError={setError} />
          <ol style={styles.timeline}>
            {activities.length === 0 ? (
              <li style={styles.empty}>No activity yet.</li>
            ) : (
              activities.map((a) => (
                <li key={a.id} style={styles.event}>
                  <div style={styles.eventHead}>
                    <span style={styles.eventKind}>{ACTIVITY_LABEL[a.kind]}</span>
                    <time style={styles.eventTime}>{new Date(a.createdAt).toLocaleString()}</time>
                  </div>
                  {a.body ? <p style={styles.eventBody}>{a.body}</p> : null}
                  {a.actorName ? <p style={styles.eventActor}>by {a.actorName}</p> : null}
                </li>
              ))
            )}
          </ol>
        </section>
      </div>
    </div>
  );
}

function Row({ label, value }: Readonly<{ label: string; value: string | null | undefined }>) {
  return (
    <div style={styles.row}>
      <dt style={styles.dt}>{label}</dt>
      <dd style={styles.dd}>{value ?? "—"}</dd>
    </div>
  );
}

function StageMover({
  contact,
  onDone,
  setError
}: Readonly<{ contact: Contact; onDone: () => Promise<void>; setError: (m: string | null) => void }>) {
  const [busy, setBusy] = useState(false);
  async function move(stage: Stage) {
    if (stage === contact.stage) return;
    setBusy(true);
    try {
      await crmApi.moveStage(contact.id, stage);
      await onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not move the contact.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <label style={styles.field}>
      Stage
      <select value={contact.stage} disabled={busy} onChange={(e) => move(e.target.value as Stage)} style={styles.input}>
        {STAGES.map((s) => (
          <option key={s} value={s}>
            {STAGE_LABEL[s]}
          </option>
        ))}
      </select>
    </label>
  );
}

function AssignEditor({
  contact,
  onDone,
  setError
}: Readonly<{ contact: Contact; onDone: () => Promise<void>; setError: (m: string | null) => void }>) {
  const [value, setValue] = useState(contact.assigneeUserId ?? "");
  const [busy, setBusy] = useState(false);
  async function save() {
    const trimmed = value.trim();
    if (trimmed && !UUID.test(trimmed)) {
      setError("Assignee must be a staff user id (UUID) or empty.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await crmApi.assign(contact.id, trimmed || null);
      await onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update the assignee.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <label style={styles.field}>
      Assign to (staff user id)
      <div style={{ display: "flex", gap: 8 }}>
        <input value={value} onChange={(e) => setValue(e.target.value)} placeholder="UUID or empty to unassign" style={{ ...styles.input, flex: 1 }} />
        <button type="button" onClick={save} disabled={busy} style={styles.small}>
          {busy ? "…" : "Save"}
        </button>
      </div>
    </label>
  );
}

function AddActivity({
  id,
  onAdded,
  setError
}: Readonly<{ id: string; onAdded: () => Promise<void>; setError: (m: string | null) => void }>) {
  const [kind, setKind] = useState<"note" | "call" | "email" | "task">("note");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await crmApi.addActivity(id, { kind, body: body.trim() || undefined });
      setBody("");
      await onAdded();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add the activity.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} style={styles.addForm}>
      <div style={{ display: "flex", gap: 8 }}>
        <select value={kind} onChange={(e) => setKind(e.target.value as typeof kind)} style={styles.input}>
          <option value="note">Note</option>
          <option value="call">Call</option>
          <option value="email">Email</option>
          <option value="task">Task</option>
        </select>
      </div>
      <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="What happened?" rows={3} style={styles.textarea} />
      <button type="submit" disabled={busy} style={styles.primary}>
        {busy ? "Adding…" : "Log activity"}
      </button>
    </form>
  );
}

const styles = {
  back: { color: ui.gold, display: "inline-block", fontSize: 13, fontWeight: 700, marginBottom: 16, textDecoration: "none" },
  head: { marginBottom: 22 },
  title: { fontSize: "clamp(24px, 4vw, 34px)", margin: 0 },
  badgeRow: { alignItems: "center", display: "flex", flexWrap: "wrap" as const, gap: 10, marginTop: 10 },
  sourceTag: { color: ui.muted, fontSize: 12 },
  grid: { display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" },
  panel: { background: ui.raised, border: `1px solid ${ui.hairlineSoft}`, borderRadius: 14, padding: 20 },
  h2: { fontSize: 18, margin: "0 0 14px" },
  dl: { display: "grid", gap: 10, margin: "0 0 18px" },
  row: { display: "grid", gap: 2 },
  dt: { color: ui.muted, fontSize: 11, fontWeight: 800, letterSpacing: "0.04em", textTransform: "uppercase" as const },
  dd: { color: ui.text, fontSize: 14, margin: 0 },
  field: { color: ui.muted, display: "grid", fontSize: 12, fontWeight: 700, gap: 6, marginTop: 14 },
  input: { background: ui.black, border: `1px solid ${ui.hairlineSoft}`, borderRadius: 8, color: ui.text, fontSize: 14, padding: "9px 11px" },
  small: { background: ui.gold, border: "none", borderRadius: 8, color: ui.onGold, cursor: "pointer", fontSize: 13, fontWeight: 800, padding: "0 14px" },
  addForm: { display: "grid", gap: 8, marginBottom: 16 },
  textarea: { background: ui.black, border: `1px solid ${ui.hairlineSoft}`, borderRadius: 8, color: ui.text, fontSize: 14, padding: "9px 11px", resize: "vertical" as const },
  primary: { background: ui.gold, border: "none", borderRadius: 8, color: ui.onGold, cursor: "pointer", fontSize: 13, fontWeight: 800, justifySelf: "start" as const, padding: "9px 16px" },
  timeline: { display: "grid", gap: 10, listStyle: "none", margin: 0, padding: 0 },
  event: { background: ui.raisedStrong, border: `1px solid ${ui.hairlineSoft}`, borderRadius: 10, padding: 12 },
  eventHead: { alignItems: "center", display: "flex", gap: 10, justifyContent: "space-between" },
  eventKind: { color: ui.goldSoft, fontSize: 12, fontWeight: 800 },
  eventTime: { color: ui.muted, fontSize: 11 },
  eventBody: { color: ui.text, fontSize: 14, margin: "6px 0 0", whiteSpace: "pre-wrap" as const },
  eventActor: { color: ui.muted, fontSize: 11, margin: "6px 0 0" },
  empty: { color: ui.muted, fontSize: 13 },
  error: { color: "#ff9d9d", fontSize: 14 }
} as const;
