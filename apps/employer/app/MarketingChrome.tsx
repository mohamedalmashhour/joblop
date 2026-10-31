import { JobLopLogo } from "./JobLopLogo";

// Shared header + footer for the employer marketing pages (pricing, about, contact, faq,
// how-it-works). One brand bar and footer — part of Phase 3 so these pages stop each rolling
// their own header. Uses the shared chrome classes (@rwos/design-system/chrome.css).

type MarketingPage = "about" | "how-it-works" | "pricing" | "contact";

const NAV: { href: string; label: string; key?: MarketingPage }[] = [
  { href: "/about", label: "About", key: "about" },
  { href: "/how-it-works", label: "How it works", key: "how-it-works" },
  { href: "/pricing", label: "Pricing", key: "pricing" },
  { href: "/contact", label: "Contact", key: "contact" },
  { href: "/signin", label: "Sign in" }
];

export function MarketingHeader({ active }: { active?: MarketingPage }) {
  return (
    <header className="jl-topbar">
      <div className="jl-topbar-in">
        <a href="/" className="jl-brand" aria-label="JobLop home">
          <JobLopLogo height={30} />
        </a>
        <nav aria-label="Primary navigation" className="jl-topbar-nav">
          {NAV.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className={item.key && item.key === active ? "jl-navlink jl-navlink-active" : "jl-navlink"}
              aria-current={item.key && item.key === active ? "page" : undefined}
            >
              {item.label}
            </a>
          ))}
          <a href="/signup/employer" className="jl-btn jl-btn-primary jl-btn-sm">
            Request staff
          </a>
        </nav>
      </div>
    </header>
  );
}

const FOOTER_LINKS = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/pricing", label: "Pricing" },
  { href: "/faq", label: "FAQ" }
];

export function MarketingFooter({ note }: { note?: string }) {
  const year = new Date().getFullYear();
  return (
    <footer className="jl-footer">
      <span>© {year} JobLop · 9375-7649 Québec inc.</span>
      <nav aria-label="Footer navigation" className="jl-footer-links">
        {FOOTER_LINKS.map((link) => (
          <a key={link.href} href={link.href}>
            {link.label}
          </a>
        ))}
      </nav>
      {note ? <span>{note}</span> : null}
    </footer>
  );
}
