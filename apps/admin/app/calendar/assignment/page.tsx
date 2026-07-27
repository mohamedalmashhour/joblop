import { adminAssignmentVisibility, adminCalendarBoundaries } from "../adminCalendarContent";

export default function AdminCalendarAssignmentPage() {
  return (
    <main style={styles.page}>
      <header style={styles.hero}>
        <p style={styles.eyebrow}>Connected calendar / Admin assignment</p>
        <h1 style={styles.title}>Operational assignment visibility</h1>
        <p style={styles.lede}>
          Full fixture operational status for authorized administrators. This projection cannot
          mutate Assignment or begin Attendance.
        </p>
        <a href="/calendar/request" style={styles.button}>Back to request review</a>
      </header>
      <section style={styles.grid}>
        {Object.entries(adminAssignmentVisibility)
          .filter(([key]) => key !== "attendance")
          .map(([label, value]) => (
            <article key={label} style={styles.card}>
              <strong>{label.replaceAll(/([A-Z])/g, " $1")}</strong>
              <p>{String(value)}</p>
            </article>
          ))}
        <article style={styles.card}>
          <strong>Attendance boundary</strong>
          <p>Authority: {adminAssignmentVisibility.attendance.authority}</p>
          <p>Execution: {adminAssignmentVisibility.attendance.execution}</p>
        </article>
      </section>
      <section style={styles.grid}>
        {adminCalendarBoundaries.map((boundary) => (
          <article key={boundary} style={styles.card}>{boundary}</article>
        ))}
      </section>
    </main>
  );
}

const styles = {
  page: { background: "#f4f7fb", color: "#10233f", fontFamily: "Inter, system-ui, sans-serif", minHeight: "100vh" },
  hero: { background: "#061b41", color: "#fff", padding: "48px clamp(18px, 5vw, 64px)" },
  eyebrow: { color: "#fff1a8", fontSize: 12, fontWeight: 900, textTransform: "uppercase" as const },
  title: { fontSize: "clamp(36px, 5vw, 58px)", margin: "8px 0" },
  lede: { color: "#d6e5f8", fontSize: 18, lineHeight: 1.6, maxWidth: 820 },
  button: { alignItems: "center", background: "#fff", borderRadius: 8, color: "#061b41", display: "inline-flex", fontWeight: 800, marginTop: 12, minHeight: 44, padding: "0 16px", textDecoration: "none" },
  grid: { display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", padding: "28px clamp(18px, 5vw, 64px) 0" },
  card: { background: "#fff", border: "1px solid #dbe4f0", borderRadius: 12, padding: 20 }
} as const;
