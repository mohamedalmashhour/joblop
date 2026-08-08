"use client";

import { useState } from "react";

const LINKS = [
  { href: "/how-it-works", label: "How It Works" },
  { href: "#employers", label: "Employers" },
  { href: "#workers", label: "Workers" },
  { href: "/pricing", label: "Pricing" },
  { href: "/about", label: "About" }
];

// Responsive primary navigation: inline on desktop, hamburger + dropdown on mobile.
export function HeaderNav({ ctaHref, ctaLabel }: { ctaHref: string; ctaLabel: string }) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <div className={`jl-navroot ${open ? "open" : ""}`}>
      <style>{`
        .jl-navroot { display: flex; align-items: center; }
        .jl-panel { display: flex; align-items: center; gap: 30px; }
        .jl-links { display: flex; align-items: center; gap: 26px; }
        .jl-actions { display: flex; align-items: center; gap: 12px; }
        .jl-link { color: #1a2340; font-weight: 700; font-size: 15px; text-decoration: none; white-space: nowrap; }
        .jl-link:hover { color: #16357a; }
        .jl-ghost { border: 1px solid #d3ddee; border-radius: 10px; padding: 9px 16px; color: #12224a; font-weight: 700; font-size: 15px; text-decoration: none; white-space: nowrap; }
        .jl-primary { background: #16357a; color: #ffffff; border-radius: 10px; padding: 10px 18px; font-weight: 700; font-size: 15px; text-decoration: none; white-space: nowrap; }
        .jl-burger { display: none; flex-direction: column; gap: 5px; width: 44px; height: 40px; align-items: center; justify-content: center; background: #ffffff; border: 1px solid #dce4f1; border-radius: 10px; cursor: pointer; }
        .jl-burger span { display: block; width: 20px; height: 2px; background: #16357a; border-radius: 2px; }
        @media (max-width: 880px) {
          .jl-burger { display: flex; }
          .jl-panel {
            display: none; position: absolute; top: calc(100% + 1px); left: 0; right: 0;
            flex-direction: column; align-items: stretch; gap: 6px;
            background: #ffffff; border-top: 1px solid #e6ecf6;
            box-shadow: 0 22px 40px rgba(8,31,73,0.12); padding: 18px 22px 24px; z-index: 50;
          }
          .jl-navroot.open .jl-panel { display: flex; }
          .jl-links { flex-direction: column; align-items: stretch; gap: 4px; }
          .jl-panel .jl-link { font-size: 17px; padding: 10px 2px; border-bottom: 1px solid #f0f3f9; }
          .jl-actions { flex-direction: column; align-items: stretch; gap: 10px; margin-top: 10px; }
          .jl-panel .jl-ghost, .jl-panel .jl-primary { text-align: center; padding: 13px 18px; font-size: 16px; }
        }
      `}</style>

      <button
        type="button"
        className="jl-burger"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span />
        <span />
        <span />
      </button>

      <div className="jl-panel">
        <nav aria-label="Primary navigation" className="jl-links">
          {LINKS.map((link) => (
            <a key={link.href} href={link.href} className="jl-link" onClick={close}>
              {link.label}
            </a>
          ))}
        </nav>
        <div className="jl-actions">
          <a href="/signin" className="jl-ghost" onClick={close}>
            Sign In
          </a>
          <a href={ctaHref} className="jl-primary" onClick={close}>
            {ctaLabel}
          </a>
        </div>
      </div>
    </div>
  );
}
