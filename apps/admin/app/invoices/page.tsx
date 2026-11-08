import { serverPageText } from "../i18n/serverPageText";
import { InvoiceApprovalPanel } from "./InvoiceApprovalPanel";
import { invoicesText } from "./text";

export default async function InvoiceApprovalPage() {
  const t = await serverPageText(invoicesText);
  return (
    <main style={styles.page}>
      <header style={styles.hero}>
        <p style={styles.eyebrow}>{t.eyebrow}</p>
        <h1 style={styles.title}>{t.title}</h1>
        <p style={styles.lede}>{t.lede}</p>
      </header>
      <InvoiceApprovalPanel />
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
