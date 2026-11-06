import { WorkerDisputesPanel } from "./WorkerDisputesPanel";

export default function WorkerDisputesPage() {
  return (
    <main style={styles.page}>
      <header style={styles.hero}>
        <p style={styles.eyebrow}>Joblop / Finance</p>
        <h1 style={styles.title}>Worker disputes</h1>
        <p style={styles.lede}>
          A worker&apos;s open dispute pauses their payout. Settling it here records your decision, shows it to the
          worker, and returns the payout to the normal flow. No amount changes here: if the worker is owed something
          different, correct it in payroll first.
        </p>
      </header>
      <WorkerDisputesPanel />
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
