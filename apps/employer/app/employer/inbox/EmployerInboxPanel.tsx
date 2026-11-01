"use client";

import { useEffect, useState } from "react";
import { InviteFriends } from "./InviteFriends";

// Employer recipient inbox: the signed-in employer's greeting cards and certificates. Self-gates — a
// signed-out visitor is guided to sign in. Certificates are printable (new-window print view).

type Greeting = { id: string; title: string; message: string; occasionKey: string | null; templateKey: string; read: boolean; receivedAt: string };
type Certificate = { id: string; kind: string; title: string; recipientName: string; note: string | null; serial: string; read: boolean; issuedAt: string };

const TEMPLATE_ACCENT = {
  holiday: { bg: "#fffaf0", bar: "#b8862f", emoji: "🎉" },
  thank_you: { bg: "#f3f8f3", bar: "#4a7c59", emoji: "💛" },
  welcome: { bg: "#f0f6fb", bar: "#2f6fb8", emoji: "👋" },
  custom: { bg: "#fffdf7", bar: "#b8862f", emoji: "✉️" }
} as const;
const accentFor = (key: string) => (key in TEMPLATE_ACCENT ? TEMPLATE_ACCENT[key as keyof typeof TEMPLATE_ACCENT] : TEMPLATE_ACCENT.custom);

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function printCertificate(c: Certificate) {
  const w = window.open("", "_blank", "width=900,height=680");
  if (!w) return;
  const note = c.note ? `<p class="note">${escapeHtml(c.note)}</p>` : "";
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(c.title)} — ${escapeHtml(c.recipientName)}</title>
  <style>
    @page { size: landscape; margin: 0; }
    body { margin: 0; font-family: Georgia, 'Times New Roman', serif; color: #2a2114; }
    .cert { box-sizing: border-box; width: 100%; min-height: 100vh; padding: 56px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; border: 16px double #b8862f; }
    .brand { letter-spacing: .3em; text-transform: uppercase; font-size: 14px; color: #b8862f; font-weight: 700; }
    h1 { font-size: 46px; margin: 18px 0 6px; }
    .sub { font-size: 16px; color: #6b6356; margin-bottom: 28px; }
    .name { font-size: 38px; font-weight: 700; border-bottom: 2px solid #e3d7c0; padding: 0 40px 10px; margin: 8px 0 18px; }
    .note { font-size: 18px; max-width: 620px; line-height: 1.6; }
    .foot { margin-top: 36px; font-size: 13px; color: #8a8070; }
  </style></head><body>
  <div class="cert">
    <div class="brand">Joblop</div>
    <h1>${escapeHtml(c.title)}</h1>
    <div class="sub">This certificate is proudly awarded to</div>
    <div class="name">${escapeHtml(c.recipientName)}</div>
    ${note}
    <div class="foot">Issued ${new Date(c.issuedAt).toLocaleDateString()} · Serial ${escapeHtml(c.serial)}</div>
  </div>
  <script>window.onload = function(){ setTimeout(function(){ window.print(); }, 150); };</script>
  </body></html>`);
  w.document.close();
}

export function EmployerInboxPanel() {
  const [authState, setAuthState] = useState<"loading" | "signed_in" | "signed_out">("loading");
  const [greetings, setGreetings] = useState<Greeting[]>([]);
  const [certs, setCerts] = useState<Certificate[]>([]);

  useEffect(() => {
    let active = true;
    fetch("/api/session", { cache: "no-store" })
      .then((r) => { if (!active) return false; setAuthState(r.ok ? "signed_in" : "signed_out"); return r.ok; })
      .then((ok) => {
        if (!ok || !active) return;
        void fetch("/api/inbox/greetings", { cache: "no-store" }).then((r) => r.json()).then((d) => active && setGreetings((d.greetings ?? []) as Greeting[])).catch(() => undefined);
        void fetch("/api/inbox/certificates", { cache: "no-store" }).then((r) => r.json()).then((d) => active && setCerts((d.certificates ?? []) as Certificate[])).catch(() => undefined);
      })
      .catch(() => { if (active) setAuthState("signed_out"); });
    return () => { active = false; };
  }, []);

  const markGreetingRead = (id: string) => {
    setGreetings((prev) => prev.map((g) => (g.id === id ? { ...g, read: true } : g)));
    void fetch(`/api/inbox/greetings/${id}/read`, { method: "POST", headers: { "content-type": "application/json" } }).catch(() => undefined);
  };

  if (authState === "loading") return <section style={styles.wrap}><p style={styles.hint}>Loading…</p></section>;
  if (authState === "signed_out")
    return (
      <section style={styles.wrap}>
        <div style={{ textAlign: "center", padding: "36px 16px" }}>
          <h2 style={{ margin: "0 0 8px" }}>Sign in to see your greetings &amp; awards</h2>
          <p style={styles.hint}>Your greeting cards and certificates are part of your Joblop account.</p>
          <a href="/signin" style={styles.signin}>Sign in</a>
        </div>
      </section>
    );

  return (
    <section style={styles.wrap}>
      <InviteFriends />
      <h2 style={styles.section}>Certificates</h2>
      {certs.length === 0 ? <p style={styles.hint}>No certificates yet.</p> : (
        <div style={styles.grid}>
          {certs.map((c) => (
            <article key={c.id} style={styles.certCard}>
              <div style={styles.ribbon}>🏅</div>
              <h3 style={styles.certTitle}>{c.title}</h3>
              <p style={styles.certName}>{c.recipientName}</p>
              {c.note ? <p style={styles.certNote}>{c.note}</p> : null}
              <p style={styles.certMeta}>Serial {c.serial} · {new Date(c.issuedAt).toLocaleDateString()}</p>
              <button type="button" style={styles.printBtn} onClick={() => printCertificate(c)}>Print / save PDF</button>
            </article>
          ))}
        </div>
      )}

      <h2 style={{ ...styles.section, marginTop: 28 }}>Greeting cards</h2>
      {greetings.length === 0 ? <p style={styles.hint}>No greetings yet.</p> : (
        <div style={styles.grid}>
          {greetings.map((g) => {
            const a = accentFor(g.templateKey);
            return (
              <article key={g.id} style={{ ...styles.greetCard, background: a.bg, borderTop: `5px solid ${a.bar}` }} onMouseEnter={() => { if (!g.read) markGreetingRead(g.id); }}>
                <div style={styles.greetHead}>
                  <span style={styles.greetEmoji}>{a.emoji}</span>
                  {!g.read ? <span style={styles.unread}>New</span> : null}
                </div>
                <h3 style={styles.greetTitle}>{g.title}</h3>
                <p style={styles.greetMsg}>{g.message}</p>
                <p style={styles.certMeta}>{new Date(g.receivedAt).toLocaleDateString()}</p>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

const styles = {
  wrap: { padding: "8px 0 48px" },
  section: { color: "#15110b", fontSize: 20, margin: "10px 0 12px" },
  hint: { color: "#8a8070", fontSize: 13, fontWeight: 500 },
  signin: { background: "#a8842f", borderRadius: 12, color: "#fff", display: "inline-block", fontWeight: 800, marginTop: 14, padding: "12px 24px", textDecoration: "none" },
  grid: { display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" },
  certCard: { background: "#fffdf7", border: "1px solid #ece3d2", borderRadius: 14, boxShadow: "0 10px 26px rgba(6,27,65,.06)", padding: "22px 20px", textAlign: "center" as const },
  ribbon: { fontSize: 34 },
  certTitle: { color: "#8a5a00", fontSize: 19, margin: "8px 0 4px" },
  certName: { color: "#15110b", fontSize: 16, fontWeight: 800, margin: "0 0 8px" },
  certNote: { color: "#6b6356", fontSize: 13, lineHeight: 1.5, margin: "0 0 8px" },
  certMeta: { color: "#8a8070", fontSize: 11, margin: "6px 0 0" },
  printBtn: { background: "#b8862f", border: "none", borderRadius: 10, color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 800, marginTop: 12, padding: "10px 16px" },
  greetCard: { border: "1px solid #ece3d2", borderRadius: 14, boxShadow: "0 10px 26px rgba(6,27,65,.05)", padding: "18px 18px 16px" },
  greetHead: { alignItems: "center", display: "flex", justifyContent: "space-between" },
  greetEmoji: { fontSize: 26 },
  unread: { background: "#b23b2e", borderRadius: 999, color: "#fff", fontSize: 10, fontWeight: 800, padding: "2px 8px", textTransform: "uppercase" as const },
  greetTitle: { color: "#15110b", fontSize: 17, margin: "8px 0 6px" },
  greetMsg: { color: "#3a342b", fontSize: 14, lineHeight: 1.55, margin: 0, whiteSpace: "pre-wrap" as const }
} as const;
