"use client";

import { useEffect, useState } from "react";

// Invite-a-friend panel: shows the signed-in user's shareable invite link and how many friends have
// joined with it. The link points at THIS app's landing with ?ref=CODE; a friend who signs up there is
// attributed to the inviter. Rendered inside the already-authenticated inbox, so no auth gate here.

export function InviteFriends() {
  const [code, setCode] = useState<string | null>(null);
  const [joined, setJoined] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/invite/code", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (active && d?.code) { setCode(d.code as string); setJoined(Number(d.joined) || 0); } })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);

  if (!code) return null;
  const link = typeof window !== "undefined" ? `${window.location.origin}/?ref=${code}` : `/?ref=${code}`;

  const copy = async () => {
    try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1800); }
    catch { /* clipboard unavailable — the field is selectable as a fallback */ }
  };
  const share = async () => {
    const nav = navigator as Navigator & { share?: (data: { title?: string; text?: string; url?: string }) => Promise<void> };
    if (nav.share) { try { await nav.share({ title: "Join me on Joblop", text: "Join me on Joblop", url: link }); } catch { /* cancelled */ } }
    else void copy();
  };

  return (
    <section style={styles.wrap}>
      <div style={styles.head}>
        <div>
          <h2 style={styles.title}>🎁 Invite your friends</h2>
          <p style={styles.sub}>Share your link. {joined > 0 ? `${joined} friend${joined === 1 ? " has" : "s have"} joined so far.` : "Be the first to invite someone."}</p>
        </div>
      </div>
      <div style={styles.row}>
        <input style={styles.input} readOnly value={link} onFocus={(e) => e.currentTarget.select()} aria-label="Your invite link" />
        <button type="button" style={styles.copyBtn} onClick={() => void copy()}>{copied ? "Copied ✓" : "Copy link"}</button>
        <button type="button" style={styles.shareBtn} onClick={() => void share()}>Share</button>
      </div>
    </section>
  );
}

const styles = {
  wrap: { background: "linear-gradient(135deg,#fff7ea,#fffdf7)", border: "1px solid #ece3d2", borderRadius: 14, boxShadow: "0 10px 26px rgba(6,27,65,.05)", margin: "4px 0 22px", padding: "18px 20px" },
  head: { alignItems: "center", display: "flex", justifyContent: "space-between" },
  title: { color: "#15110b", fontSize: 18, margin: "0 0 2px" },
  sub: { color: "#6b6356", fontSize: 13, margin: 0 },
  row: { display: "flex", flexWrap: "wrap" as const, gap: 8, marginTop: 12 },
  input: { background: "#fff", border: "1px solid #e3d7c0", borderRadius: 8, color: "#1b160e", flex: "1 1 240px", fontSize: 13, minHeight: 42, padding: "0 12px" },
  copyBtn: { background: "#e0a500", border: "none", borderRadius: 10, color: "#fff", cursor: "pointer", fontSize: 14, fontWeight: 800, padding: "11px 18px" },
  shareBtn: { background: "transparent", border: "1px solid #a8842f", borderRadius: 10, color: "#a8842f", cursor: "pointer", fontSize: 14, fontWeight: 800, padding: "11px 18px" }
} as const;
