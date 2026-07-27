import { adminCalendarBoundaries } from "./adminCalendarContent";
import { AdminCalendarPanel } from "./AdminCalendarPanel";

export default function AdminCalendarPage() {
  return (
    <main style={styles.page}>
      <header style={styles.hero}>
        <p style={styles.eyebrow}>Resident Workforce OS / Administration</p>
        <h1 style={styles.title}>Review calendar</h1>
        <p style={styles.lede}>
          Authenticated client requests in one governed review queue. Opening a request does not
          approve, publish, assign, notify, or execute payment.
        </p>
        <a href="/calendar/request" style={styles.previewButton}>
          Open fixture review-controls preview
        </a>
      </header>
      <AdminCalendarPanel />
      <section style={styles.boundaryGrid}>
        {adminCalendarBoundaries.filter((boundary) => !boundary.includes("fixture")).map((boundary) => (
          <article key={boundary} style={styles.boundaryCard}>{boundary}</article>
        ))}
        <article style={styles.boundaryCard}>Authenticated request review is read-only in this phase; no fixture review controls are mixed into persisted records.</article>
      </section>
    </main>
  );
}

const styles = {
  page: { background: "#f4f7fb", color: "#10233f", fontFamily: "Inter, system-ui, sans-serif", minHeight: "100vh" },
  hero: { background: "#061b41", color: "#fff", padding: "48px clamp(18px, 5vw, 64px)" },
  eyebrow: { color: "#fff1a8", fontSize: 12, fontWeight: 900, textTransform: "uppercase" as const },
  title: { fontSize: "clamp(38px, 5vw, 60px)", margin: "8px 0" },
  lede: { color: "#d6e5f8", fontSize: 18, lineHeight: 1.6, maxWidth: 820 },
  previewButton: { alignItems: "center", background: "#fff", borderRadius: 8, color: "#061b41", display: "inline-flex", fontWeight: 800, marginTop: 12, minHeight: 44, padding: "0 16px", textDecoration: "none" },
  grid: { display: "grid", gap: 18, gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", padding: "32px clamp(18px, 5vw, 64px)" },
  card: { background: "#fff", border: "1px solid #dbe4f0", borderRadius: 14, boxShadow: "0 12px 30px rgba(6,27,65,.08)", padding: 22 },
  h2: { color: "#061b41", fontSize: 24 },
  badge: { background: "#e8f5f3", borderRadius: 99, color: "#075e58", display: "inline-block", fontSize: 12, fontWeight: 900, padding: "7px 10px", textTransform: "uppercase" as const },
  button: { background: "#0f7f78", borderRadius: 8, color: "#fff", display: "inline-flex", fontWeight: 800, marginTop: 12, minHeight: 44, padding: "0 16px", alignItems: "center", textDecoration: "none" },
  boundaryGrid: { display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", padding: "0 clamp(18px, 5vw, 64px) 48px" },
  boundaryCard: { background: "#fff", border: "1px solid #dbe4f0", borderRadius: 10, padding: 16 }
} as const;
