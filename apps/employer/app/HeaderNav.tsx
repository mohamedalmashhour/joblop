"use client";

import { useState } from "react";

const HREFS = ["/how-it-works", "#employers", "#workers", "/pricing", "/about"] as const;

// Responsive primary navigation: inline on desktop, hamburger + dropdown on mobile.
// Labels (and the CTA / Sign In / menu text) are localized by the parent via props.
export function HeaderNav({
  ctaHref,
  ctaLabel,
  links,
  openLabel,
  closeLabel,
  signIn
}: {
  ctaHref: string;
  ctaLabel: string;
  links: readonly string[];
  openLabel: string;
  closeLabel: string;
  signIn: string;
}) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <div className={`jl-navroot ${open ? "open" : ""}`}>
      <style>{`
        .jl-navroot { display: flex; align-items: center; }
        .jl-panel { display: flex; align-items: center; gap: 30px; }
        .jl-links { display: flex; align-items: center; gap: 26px; }
        .jl-actions { display: flex; align-items: center; gap: 12px; }
        .jl-burger { display: none; flex-direction: column; gap: 5px; width: 44px; height: 40px; align-items: center; justify-content: center; background: var(--jl-white); border: 1px solid var(--jl-border); border-radius: 10px; cursor: pointer; }
        .jl-burger span { display: block; width: 20px; height: 2px; background: var(--jl-text); border-radius: 2px; }
        @media (max-width: 880px) {
          .jl-burger { display: flex; }
          .jl-panel {
            display: none; position: absolute; top: calc(100% + 1px); left: 0; right: 0;
            flex-direction: column; align-items: stretch; gap: 6px;
            background: var(--jl-white); border-top: 1px solid var(--jl-border);
            box-shadow: var(--jl-shadow-lg); padding: 18px 22px 24px; z-index: 50;
          }
          .jl-navroot.open .jl-panel { display: flex; }
          .jl-links { flex-direction: column; align-items: stretch; gap: 4px; }
          .jl-panel .jl-navlink { font-size: 17px; padding: 10px 2px; border-bottom: 1px solid var(--jl-cream); }
          .jl-actions { flex-direction: column; align-items: stretch; gap: 10px; margin-top: 10px; }
          .jl-panel .jl-btn { text-align: center; }
        }
      `}</style>

      <button
        type="button"
        className="jl-burger"
        aria-label={open ? closeLabel : openLabel}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span />
        <span />
        <span />
      </button>

      <div className="jl-panel">
        <nav aria-label="Primary navigation" className="jl-links">
          {HREFS.map((href, index) => (
            <a key={href} href={href} className="jl-navlink" onClick={close}>
              {links[index]}
            </a>
          ))}
        </nav>
        <div className="jl-actions">
          <a href="/signin" className="jl-btn jl-btn-ghost" onClick={close}>
            {signIn}
          </a>
          <a href={ctaHref} className="jl-btn jl-btn-primary" onClick={close}>
            {ctaLabel}
          </a>
        </div>
      </div>
    </div>
  );
}
