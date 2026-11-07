import { Suspense } from "react";
import { EmployerContactPanel } from "./EmployerContactPanel";

export default function Page() {
  return (
    <main style={styles.page}>
      <header style={styles.header}>
        <a href="/" style={styles.brand}>Joblop</a>
        <a href="/employer/dashboard" style={styles.back}>← Dashboard</a>
      </header>
      <div style={styles.body}>
        <h1 style={styles.title}>Contact Joblop</h1>
        <p style={styles.lede}>
          Our AI assistant answers right away, day and night. When a person needs to decide, it passes your
          message to the Joblop team. Your conversation is private.
        </p>
        <Suspense>
          <EmployerContactPanel />
        </Suspense>
      </div>
    </main>
  );
}

const styles = {
  page: { background: "#000000", color: "#f4efe4", fontFamily: "Inter, system-ui, sans-serif", minHeight: "100vh" },
  header: { alignItems: "center", background: "#000000", borderBottom: "1px solid rgba(248, 184, 8, 0.16)", display: "flex", justifyContent: "space-between", padding: "14px clamp(16px,4vw,48px)" },
  brand: { color: "#f4efe4", fontSize: 20, fontWeight: 900, textDecoration: "none" },
  back: { color: "#b3a994", fontSize: 14, fontWeight: 700, textDecoration: "none" },
  body: { margin: "0 auto", maxWidth: 800, padding: "24px clamp(16px,4vw,48px) 56px" },
  title: { fontSize: "clamp(26px,5vw,40px)", margin: "8px 0 6px" },
  lede: { color: "#b3a994", fontSize: 16, lineHeight: 1.6, margin: "0 0 18px", maxWidth: 760 }
} as const;
