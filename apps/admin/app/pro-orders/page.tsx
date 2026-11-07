import { ProOrdersPanel } from "./ProOrdersPanel";

export default function ProOrdersPage() {
  return (
    <main style={styles.page}>
      <header style={styles.hero}>
        <p style={styles.eyebrow}>Joblop / Administration</p>
        <h1 style={styles.title}>Worker Pro orders</h1>
        <p style={styles.lede}>
          Review and confirm Worker Pro subscriptions paid by Interac e-transfer. Confirm an order only
          after verifying the e-transfer arrived at billing@joblop.com (the reference matches the order
          id). Confirming grants Worker Pro. Card payments stay closed until payments are enabled.
        </p>
      </header>
      <ProOrdersPanel />
    </main>
  );
}

const styles = {
  page: { background: "#000000", color: "#f4efe4", fontFamily: "Inter, system-ui, sans-serif", minHeight: "100vh" },
  hero: { background: "#000000", color: "#fff", padding: "40px clamp(18px, 5vw, 64px)" },
  eyebrow: { color: "#fff1a8", fontSize: 12, fontWeight: 900, textTransform: "uppercase" as const },
  title: { fontSize: "clamp(34px, 5vw, 56px)", margin: "8px 0" },
  lede: { color: "#faf6ec", fontSize: 17, lineHeight: 1.6, maxWidth: 860 }
} as const;
