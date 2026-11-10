"use client";

import { useState } from "react";

// Absolute anchors ("/#employers") so the same menu works from every page, not just the home page.
const HREFS = ["/how-it-works", "/#employers", "/#workers", "/pricing", "/about"] as const;

// Responsive primary navigation: inline on desktop, hamburger + dropdown on mobile.
// Labels (and the CTA / Sign In / menu text) are localized by the parent via props.
export function HeaderNav({
  ctaHref,
  ctaLabel,
  links,
  openLabel,
  closeLabel,
  signIn,
  current
}: {
  ctaHref: string;
  ctaLabel: string;
  links: readonly string[];
  openLabel: string;
  closeLabel: string;
  signIn: string;
  current?: string | undefined;
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
        .jl-link { color: #b3a894; font-weight: 700; font-size: 15px; text-decoration: none; white-space: nowrap; }
        .jl-link:hover, .jl-link[aria-current="page"] { color: #f4efe4; }
        .jl-link[aria-current="page"] { text-decoration: underline; text-decoration-color: #f8b808; text-underline-offset: 6px; }
        .jl-ghost { display: inline-flex; align-items: center; justify-content: center; min-height: 44px; box-sizing: border-box; border: 1px solid rgba(248, 184, 8,0.34); border-radius: 10px; padding: 9px 16px; color: #f4efe4; font-weight: 700; font-size: 15px; text-decoration: none; white-space: nowrap; }
        .jl-primary { display: inline-flex; align-items: center; justify-content: center; min-height: 44px; box-sizing: border-box; background: #f8b808; color: #000000; border-radius: 10px; padding: 10px 18px; font-weight: 800; font-size: 15px; text-decoration: none; white-space: nowrap; }
        .jl-burger { display: none; flex-direction: column; gap: 5px; width: 44px; height: 44px; align-items: center; justify-content: center; background: #0c0c0c; border: 1px solid rgba(248, 184, 8,0.16); border-radius: 10px; cursor: pointer; }
        .jl-burger span { display: block; width: 20px; height: 2px; background: #f8b808; border-radius: 2px; }
        @media (max-width: 1100px) {
          .jl-burger { display: flex; }
          .jl-panel {
            display: none; position: absolute; top: calc(100% + 1px); left: 0; right: 0;
            flex-direction: column; align-items: stretch; gap: 6px;
            background: #0c0c0c; border-top: 1px solid rgba(248, 184, 8,0.16);
            box-shadow: 0 22px 40px rgba(0,0,0,0.6); padding: 18px 22px 24px; z-index: 50;
          }
          .jl-navroot.open .jl-panel { display: flex; }
          .jl-links { flex-direction: column; align-items: stretch; gap: 4px; }
          .jl-panel .jl-link { font-size: 17px; padding: 10px 2px; border-bottom: 1px solid rgba(248, 184, 8,0.16); }
          .jl-actions { flex-direction: column; align-items: stretch; gap: 10px; margin-top: 10px; }
          .jl-panel .jl-ghost, .jl-panel .jl-primary { text-align: center; padding: 13px 18px; font-size: 16px; }
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
            <a key={href} href={href} className="jl-link" onClick={close} aria-current={href === current ? "page" : undefined}>
              {links[index]}
            </a>
          ))}
        </nav>
        <div className="jl-actions">
          <a href="/signin" className="jl-ghost" onClick={close} aria-current={current === "/signin" ? "page" : undefined}>
            {signIn}
          </a>
          <a href={ctaHref} className="jl-primary" onClick={close}>
            {ctaLabel}
          </a>
        </div>
      </div>
    </div>
  );
}
