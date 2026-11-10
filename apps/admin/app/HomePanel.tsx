"use client";

import { useEffect, useState } from "react";
import { usePageText } from "./i18n/pageText";
import { homeText, type HomeTile } from "./homeText";

// Staff home. Signed out: only the staff sign-in. Signed in: links to the real work pages.
// No sample numbers or names are shown here; every page behind a link loads its own live data.

type State = "loading" | "signedOut" | "signedIn" | "error";

export function HomePanel() {
  const copy = usePageText(homeText);
  const [state, setState] = useState<State>("loading");

  useEffect(() => {
    let live = true;
    void (async () => {
      try {
        const response = await fetch("/api/session", { cache: "no-store" });
        if (!live) return;
        if (response.status === 401 || response.status === 403) return setState("signedOut");
        setState(response.ok ? "signedIn" : "error");
      } catch {
        if (live) setState("error");
      }
    })();
    return () => {
      live = false;
    };
  }, []);

  if (state === "loading") return <p style={styles.note}>{copy.loading}</p>;
  if (state === "error") return <p style={styles.note}>{copy.error}</p>;
  if (state === "signedOut") {
    return (
      <section style={styles.signInCard}>
        <h2 style={styles.h2}>{copy.signedOutTitle}</h2>
        <p style={styles.body}>{copy.signedOutBody}</p>
        <a href="/signin" style={styles.primary}>
          {copy.signIn}
        </a>
      </section>
    );
  }

  return (
    <div style={styles.groups}>
      <TileGroup title={copy.groupDaily} tiles={copy.daily} />
      <TileGroup title={copy.groupMoney} tiles={copy.money} />
      <TileGroup title={copy.groupPeople} tiles={copy.people} />
    </div>
  );
}

function TileGroup({ title, tiles }: { title: string; tiles: readonly HomeTile[] }) {
  return (
    <section>
      <h2 style={styles.groupTitle}>{title}</h2>
      <div style={styles.grid}>
        {tiles.map((tile) => (
          <a href={tile.href} key={tile.href} style={styles.tile}>
            <strong style={styles.tileTitle}>{tile.title}</strong>
            <span style={styles.tileDetail}>{tile.detail}</span>
          </a>
        ))}
      </div>
    </section>
  );
}

const styles = {
  note: { color: "#b3a894", fontSize: 16, padding: "8px 0" },
  signInCard: {
    background: "#0c0c0c",
    border: "1px solid rgba(248, 184, 8, 0.28)",
    borderRadius: 14,
    display: "grid",
    gap: 12,
    maxWidth: 520,
    padding: 24
  },
  h2: { color: "#f4efe4", fontSize: 24, margin: 0 },
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
  },
  groups: { display: "grid", gap: 28 },
  groupTitle: { color: "#F8B808", fontSize: 13, fontWeight: 900, letterSpacing: "0.08em", margin: "0 0 12px", textTransform: "uppercase" as const },
  grid: { display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 230px), 1fr))" },
  tile: {
    background: "#0c0c0c",
    border: "1px solid rgba(248, 184, 8, 0.18)",
    borderRadius: 12,
    color: "#f4efe4",
    display: "grid",
    gap: 6,
    minHeight: 96,
    padding: 18,
    textDecoration: "none"
  },
  tileTitle: { fontSize: 17 },
  tileDetail: { color: "#b3a894", fontSize: 14, lineHeight: 1.45 }
} as const;
