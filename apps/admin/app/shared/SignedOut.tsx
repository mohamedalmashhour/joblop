"use client";

import { useEffect, useState } from "react";
import { usePageText } from "../i18n/pageText";
import { signInHref, signedOutText } from "./signedOutText";

// The one signed-out block every staff page shows instead of its content when the visitor is not
// signed in with staff access. Gold "Sign in" button; after signing in, staff land back on this page.
export function SignedOut({ compact = false }: Readonly<{ compact?: boolean }>) {
  const copy = usePageText(signedOutText);
  // The return path is read after mount so the server render and first client render match.
  const [href, setHref] = useState("/signin");
  useEffect(() => {
    setHref(signInHref(`${window.location.pathname}${window.location.search}`));
  }, []);

  return (
    <section aria-live="polite" data-signed-out="" style={compact ? { ...styles.card, ...styles.compact } : styles.card}>
      <h2 style={styles.h2}>{copy.title}</h2>
      <p style={styles.body}>{copy.body}</p>
      <a href={href} style={styles.primary}>
        {copy.signIn}
      </a>
    </section>
  );
}

const styles = {
  card: {
    background: "#0c0c0c",
    border: "1px solid rgba(248, 184, 8, 0.28)",
    borderRadius: 14,
    color: "#f4efe4",
    display: "grid",
    gap: 12,
    margin: "24px clamp(18px, 5vw, 64px)",
    maxWidth: 520,
    padding: 24
  },
  compact: { margin: "12px 0" },
  h2: { color: "#f4efe4", fontSize: 22, margin: 0 },
  body: { color: "#faf6ec", fontSize: 16, lineHeight: 1.55, margin: 0 },
  primary: {
    alignItems: "center",
    background: "#F8B808",
    borderRadius: 10,
    color: "#000000",
    display: "inline-flex",
    fontWeight: 800,
    justifySelf: "start",
    minHeight: 44,
    padding: "0 22px",
    textDecoration: "none"
  }
} as const;
