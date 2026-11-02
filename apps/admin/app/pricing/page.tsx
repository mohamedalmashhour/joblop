import { VariablePriceQuotePanel } from "./VariablePriceQuotePanel";

export default function AdminPricingPage() {
  return (
    <main style={styles.page}>
      <header style={styles.hero}>
        <p style={styles.eyebrow}>Resident Workforce OS / Administration</p>
        <h1 style={styles.title}>Variable price quote</h1>
        <p style={styles.lede}>
          Compute the full client-side quote for a job: base labour, funded allowances, the emergency
          surcharge, the out-of-base gas + travel-time surcharge, and the demand uplift toward the
          client&rsquo;s willingness-to-pay ceiling. Shows what the client is quoted and the part the
          platform keeps on top of the base margin. Computation only — it issues no invoice and moves
          no money.
        </p>
      </header>
      <VariablePriceQuotePanel />
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
