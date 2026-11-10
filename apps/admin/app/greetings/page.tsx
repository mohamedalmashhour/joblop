import { AdminGreetingsPanel } from "./AdminGreetingsPanel";
import { StaffGate } from "../shared/StaffGate";

export default function AdminGreetingsPage() {
  return (
    <main style={styles.page}>
      <header style={styles.hero}>
        <p style={styles.eyebrow}>Joblop / Administration</p>
        <h1 style={styles.title}>Greetings &amp; awards</h1>
        <p style={styles.lede}>
          Send holiday greeting cards and issue certificates (Super Worker, Most Reliable, Employee of the
          Month…) to workers and employers — by name, a selected set, or everyone. Each is delivered to the
          recipient&rsquo;s account and, when email is configured, emailed too. Holiday occasions come from
          the active country profile.
        </p>
      </header>
      <StaffGate>
        <AdminGreetingsPanel />
      </StaffGate>
    </main>
  );
}

const styles = {
  page: { background: "#000000", color: "#f4efe4", fontFamily: "Inter, system-ui, sans-serif", minHeight: "100vh" },
  hero: { background: "#000000", color: "#fff", padding: "48px clamp(18px, 5vw, 64px)" },
  eyebrow: { color: "#fff1a8", fontSize: 12, fontWeight: 900, textTransform: "uppercase" as const },
  title: { fontSize: "clamp(38px, 5vw, 60px)", margin: "8px 0" },
  lede: { color: "#faf6ec", fontSize: 18, lineHeight: 1.6, maxWidth: 820 }
} as const;
