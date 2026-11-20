import { serverPageText } from "./i18n/serverPageText";
import { HomePanel } from "./HomePanel";
import { homeText } from "./homeText";

// Staff home: the staff sign-in when signed out, links to the real work pages when signed in.
// (Replaced the old dispatch demo page, which showed sample people and numbers.)
export default async function AdminHome() {
  const copy = await serverPageText(homeText);
  return (
    <main style={styles.page}>
      <header style={styles.hero}>
        <p style={styles.eyebrow}>{copy.eyebrow}</p>
        <h1 style={styles.title}>{copy.title}</h1>
        <p style={styles.lede}>{copy.lede}</p>
      </header>
      <div style={styles.body}>
        <HomePanel />
      </div>
    </main>
  );
}

const styles = {
  page: { background: "#000000", color: "#f4efe4", fontFamily: "Inter, system-ui, sans-serif", minHeight: "100vh" },
  hero: { background: "#000000", color: "#fff", padding: "40px clamp(18px, 5vw, 64px) 8px" },
  eyebrow: { color: "#fff1a8", fontSize: 12, fontWeight: 900, textTransform: "uppercase" as const },
  title: { fontSize: "clamp(34px, 5vw, 56px)", margin: "8px 0" },
  lede: { color: "#faf6ec", fontSize: 17, lineHeight: 1.6, maxWidth: 860 },
  body: { padding: "16px clamp(18px, 5vw, 64px) 56px" }
} as const;
