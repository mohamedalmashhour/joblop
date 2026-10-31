import Link from "next/link";

// Global footer for the worker app: copyright + legal links on every page.
export function Footer({ locale }: { locale: string }) {
  const fr = locale === "fr";
  const year = new Date().getFullYear();
  return (
    <footer
      style={{
        borderTop: "1px solid rgba(201, 162, 75, 0.16)",
        background: "#000000",
        marginTop: 56,
        padding: "22px 16px",
        display: "flex",
        gap: 16,
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: "space-between",
        fontSize: 12.5,
        color: "#b3a894"
      }}
    >
      <span>© {year} Joblop · 9375-7649 Québec inc.</span>
      <nav style={{ display: "flex", gap: 20 }}>
        <Link href="/terms" style={{ color: "#c9a24b", textDecoration: "none" }}>
          {fr ? "Conditions d’utilisation" : "Terms"}
        </Link>
        <Link href="/privacy" style={{ color: "#c9a24b", textDecoration: "none" }}>
          {fr ? "Confidentialité" : "Privacy"}
        </Link>
      </nav>
    </footer>
  );
}
