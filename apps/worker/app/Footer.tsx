import Link from "next/link";

// Global footer for the worker app: copyright + legal links on every page.
export function Footer({ locale }: { locale: string }) {
  const fr = locale === "fr";
  const year = new Date().getFullYear();
  return (
    <footer className="jl-footer">
      <span>© {year} JobLop · 9375-7649 Québec inc.</span>
      <nav className="jl-footer-links">
        <Link href="/terms">{fr ? "Conditions d’utilisation" : "Terms"}</Link>
        <Link href="/privacy">{fr ? "Confidentialité" : "Privacy"}</Link>
      </nav>
    </footer>
  );
}
