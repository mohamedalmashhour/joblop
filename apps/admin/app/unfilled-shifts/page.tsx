import { serverPageText } from "../i18n/serverPageText";
import { UnfilledShiftsPanel } from "./UnfilledShiftsPanel";
import { unfilledShiftsText } from "./text";

export default async function UnfilledShiftsPage() {
  const copy = await serverPageText(unfilledShiftsText);
  return (
    <main style={styles.page}>
      <header style={styles.hero}>
        <p style={styles.eyebrow}>{copy.eyebrow}</p>
        <h1 style={styles.title}>{copy.title}</h1>
        <p style={styles.lede}>{copy.lede}</p>
      </header>
      <UnfilledShiftsPanel />
    </main>
  );
}

const styles = {
  page: { background: "#000000", color: "#f4efe4", fontFamily: "Inter, system-ui, sans-serif", minHeight: "100vh" },
  hero: { background: "#000000", color: "#fff", padding: "40px clamp(18px, 5vw, 64px) 8px" },
  eyebrow: { color: "#fff1a8", fontSize: 12, fontWeight: 900, textTransform: "uppercase" as const },
  title: { fontSize: "clamp(34px, 5vw, 56px)", margin: "8px 0" },
  lede: { color: "#faf6ec", fontSize: 17, lineHeight: 1.6, maxWidth: 860 }
} as const;
