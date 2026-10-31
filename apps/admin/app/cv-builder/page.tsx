import { CvWizard } from "./CvWizard";

export default function CvBuilderPage() {
  return (
    <main style={styles.page}>
      <header style={styles.hero}>
        <p style={styles.eyebrow}>Resident Workforce OS / JobScanner</p>
        <h1 style={styles.title}>CV Builder</h1>
        <p style={styles.lede}>
          A guided, tap-to-answer builder — short questions with ready options, per-trade skill
          suggestions, and multiple designs for different jobs. Workers get a real CV + cover letter in
          minutes, in French or English. Drafts are advisory; the worker reviews and edits before applying.
        </p>
      </header>
      <CvWizard />
    </main>
  );
}

const styles = {
  page: { background: "#fbf9f4", color: "#171511", fontFamily: "Inter, system-ui, sans-serif", minHeight: "100vh" },
  hero: { background: "#000000", color: "#fff", padding: "40px clamp(18px, 5vw, 64px)" },
  eyebrow: { color: "#fff1a8", fontSize: 12, fontWeight: 900, textTransform: "uppercase" as const },
  title: { fontSize: "clamp(34px, 5vw, 56px)", margin: "8px 0" },
  lede: { color: "#faf6ec", fontSize: 17, lineHeight: 1.6, maxWidth: 860 }
} as const;
