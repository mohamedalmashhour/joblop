import { adminCalendarBoundaries } from "./adminCalendarContent";
import { AdminCalendarPanel } from "./AdminCalendarPanel";

export default function AdminCalendarPage() {
  return (
    <main style={styles.page}>
      <header style={styles.hero}>
        <p style={styles.eyebrow}>Joblop / Administration</p>
        <h1 style={styles.title}>Review calendar</h1>
        <p style={styles.lede}>
          Authenticated client requests in one governed review queue. Opening a request does not
          approve, publish, assign, notify, or execute payment.
        </p>
      </header>
      <AdminCalendarPanel />
      <section style={styles.boundaryGrid}>
        {adminCalendarBoundaries
          .filter((boundary) => !boundary.includes("fixture"))
          .map((boundary) => (
            <article key={boundary} style={styles.boundaryCard}>
              {boundary}
            </article>
          ))}
        <article style={styles.boundaryCard}>
          Persisted review actions use current version tokens and explicit human confirmation. No
          fixture review controls are mixed into authoritative records.
        </article>
      </section>
    </main>
  );
}

const styles = {
  page: {
    background: "#000000",
    color: "#f4efe4",
    fontFamily: "Inter, system-ui, sans-serif",
    minHeight: "100vh"
  },
  hero: { background: "#000000", color: "#fff", padding: "48px clamp(18px, 5vw, 64px)" },
  eyebrow: { color: "#fff1a8", fontSize: 12, fontWeight: 900, textTransform: "uppercase" as const },
  title: { fontSize: "clamp(38px, 5vw, 60px)", margin: "8px 0" },
  lede: { color: "#faf6ec", fontSize: 18, lineHeight: 1.6, maxWidth: 820 },
  grid: {
    display: "grid",
    gap: 18,
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    padding: "32px clamp(18px, 5vw, 64px)"
  },
  card: {
    background: "#0c0c0c",
    border: "1px solid rgba(248, 184, 8, 0.16)",
    borderRadius: 14,
    boxShadow: "0 12px 30px rgba(0,0,0,.4)",
    padding: 22
  },
  h2: { color: "#f4efe4", fontSize: 24 },
  badge: {
    background: "#000000",
    borderRadius: 99,
    color: "#f4efe4",
    display: "inline-block",
    fontSize: 12,
    fontWeight: 900,
    padding: "7px 10px",
    textTransform: "uppercase" as const
  },
  button: {
    background: "#0c0c0c",
    border: "1px solid rgba(248, 184, 8, 0.3)",
    borderRadius: 8,
    color: "#fff",
    display: "inline-flex",
    fontWeight: 800,
    marginTop: 12,
    minHeight: 44,
    padding: "0 16px",
    alignItems: "center",
    textDecoration: "none"
  },
  boundaryGrid: {
    display: "grid",
    gap: 12,
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    padding: "0 clamp(18px, 5vw, 64px) 48px"
  },
  boundaryCard: { background: "#0c0c0c", border: "1px solid rgba(248, 184, 8, 0.16)", borderRadius: 10, padding: 16 }
} as const;
