import type { ReactNode } from "react";
import Link from "next/link";
import { SignOutButton } from "./SignOutButton";
import { ui } from "./ui";

// The staff workspace chrome: brand + top nav (Pipeline / Leads) + sign out. Dark-first.
export function CrmShell({ active, children }: Readonly<{ active: "pipeline" | "leads"; children: ReactNode }>) {
  return (
    <div style={{ minHeight: "100vh", background: ui.black, color: ui.text }}>
      <header style={styles.topbar}>
        <div style={styles.brand}>
          <span style={styles.mark}>Joblop</span>
          <span style={styles.sub}>CRM</span>
        </div>
        <nav style={styles.nav}>
          <Link href="/" style={navLink(active === "pipeline")}>
            Pipeline
          </Link>
          <Link href="/leads" style={navLink(active === "leads")}>
            Leads
          </Link>
        </nav>
        <SignOutButton />
      </header>
      <main id="crm-main" style={styles.main}>
        {children}
      </main>
    </div>
  );
}

function navLink(isActive: boolean) {
  return {
    color: isActive ? ui.gold : ui.muted,
    fontSize: 14,
    fontWeight: 700,
    padding: "6px 2px",
    textDecoration: "none",
    borderBottom: `2px solid ${isActive ? ui.gold : "transparent"}`
  } as const;
}

const styles = {
  topbar: {
    position: "sticky" as const,
    top: 0,
    zIndex: 10,
    display: "flex",
    alignItems: "center",
    gap: 24,
    justifyContent: "space-between",
    background: ui.raisedStrong,
    borderBottom: `1px solid ${ui.hairline}`,
    padding: "13px clamp(16px, 4vw, 40px)"
  },
  brand: { display: "flex", alignItems: "baseline", gap: 8 },
  mark: { fontFamily: "var(--font-serif)", fontSize: 20, fontWeight: 800, color: ui.text },
  sub: { color: ui.gold, fontSize: 12, fontWeight: 900, letterSpacing: "0.1em", textTransform: "uppercase" as const },
  nav: { display: "flex", gap: 22, marginRight: "auto", marginLeft: 12 },
  main: { padding: "clamp(20px, 4vw, 40px)", maxWidth: 1440, margin: "0 auto" }
} as const;
