import { EmployerContractsPanel } from "./EmployerContractsPanel";

export default function EmployerContractsPage() {
  return (
    <main style={styles.page}>
      <header style={styles.hero}>
        <p style={styles.eyebrow}>Joblop / Finance</p>
        <h1 style={styles.title}>Employer contracts</h1>
        <p style={styles.lede}>
          Set what an employer pays per hour for each role. The employer then reviews and signs it, and
          can only request workers for roles priced here. Publishing replaces the current rate card, so
          the employer must sign again. Jobs already approved keep their rate.
        </p>
      </header>
      <EmployerContractsPanel />
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
