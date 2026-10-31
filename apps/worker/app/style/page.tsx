import type { Metadata } from "next";

// The Joblop style guide — a living showcase of the ONE design system that drives every surface
// (worker, employer, admin, mobile). Everything here reads from the shared brand tokens
// (packages/design-system → --jl-* variables), so this page IS the proof that the platform has a
// single soul: one palette, one type voice (Playfair Display + Inter), one component language.

export const metadata: Metadata = {
  title: "Joblop Style Guide",
  description: "The single Joblop design system — palette, type scale and components.",
  robots: { index: false, follow: false }
};

const swatches: { name: string; token: string; hex: string; on: string }[] = [
  { name: "Black", token: "--jl-black", hex: "#000000", on: "#faf6ec" },
  { name: "Ink", token: "--jl-ink", hex: "#0c0c0c", on: "#faf6ec" },
  { name: "Gold soft", token: "--jl-gold-soft", hex: "#f0d9a0", on: "#000000" },
  { name: "Gold", token: "--jl-gold", hex: "#c9a24b", on: "#000000" },
  { name: "Gold strong", token: "--jl-gold-strong", hex: "#b8862f", on: "#000000" },
  { name: "Gold deep", token: "--jl-gold-deep", hex: "#9a7122", on: "#faf6ec" },
  { name: "Cream", token: "--jl-cream", hex: "#faf6ec", on: "#171511" },
  { name: "Cream raised", token: "--jl-cream-raised", hex: "#fbf9f4", on: "#171511" },
  { name: "White", token: "--jl-white", hex: "#ffffff", on: "#171511" },
  { name: "Text", token: "--jl-text", hex: "#171511", on: "#faf6ec" },
  { name: "Muted", token: "--jl-muted", hex: "#6b6356", on: "#ffffff" },
  { name: "Border", token: "--jl-border", hex: "#ece3d2", on: "#171511" }
];

const semantic: { name: string; token: string; hex: string; on: string }[] = [
  { name: "Success", token: "--jl-success", hex: "#176b47", on: "#ffffff" },
  { name: "Warning", token: "--jl-warning", hex: "#8a5100", on: "#ffffff" },
  { name: "Danger", token: "--jl-danger", hex: "#b42323", on: "#ffffff" },
  { name: "Focus", token: "--jl-focus", hex: "#c9a24b", on: "#000000" }
];

const typeRows: { label: string; cls: string; sample: string; serif: boolean }[] = [
  { label: "Display · Playfair 800", cls: "sg-display", sample: "Work that fits your life", serif: true },
  { label: "H1 · Playfair 800", cls: "sg-h1", sample: "Find your next shift", serif: true },
  { label: "H2 · Playfair 800", cls: "sg-h2", sample: "Browse jobs near you", serif: true },
  { label: "H3 · Playfair 700", cls: "sg-h3", sample: "How Joblop works", serif: true },
  { label: "Body large · Inter 400", cls: "sg-body-lg", sample: "Apply once and let employers come to you. Every role is verified before it reaches you.", serif: false },
  { label: "Body · Inter 400", cls: "sg-body", sample: "Clean, readable body copy set in Inter for calm, confident reading across the platform.", serif: false },
  { label: "Small · Inter 400", cls: "sg-small", sample: "Supporting detail, captions and helper text.", serif: false },
  { label: "Label · Inter 700", cls: "sg-label", sample: "Field label", serif: false },
  { label: "Eyebrow · Inter 800", cls: "sg-eyebrow", sample: "Section eyebrow", serif: false }
];

export default function StyleGuidePage() {
  return (
    <main className="sg">
      <style>{CSS}</style>

      <header className="sg-hero">
        <span className="sg-eyebrow sg-eyebrow-gold">Joblop Design System</span>
        <h1 className="sg-display">One platform, one soul</h1>
        <p className="sg-body-lg sg-hero-sub">
          Every Joblop surface — worker, employer, admin and mobile — is built from the same tokens:
          one palette of black &amp; gold on warm cream, one type voice in Playfair Display and Inter,
          and one set of components. This page is the source of truth you can see.
        </p>
      </header>

      <section className="sg-sec">
        <h2 className="sg-h2">Color</h2>
        <p className="sg-body sg-sec-sub">Pure black for dark surfaces, a warm gold scale for action and accent, warm cream light surfaces. No blue, no teal.</p>
        <div className="sg-swatches">
          {swatches.map((s) => (
            <div key={s.token} className="sg-swatch" style={{ background: `var(${s.token})`, color: s.on }}>
              <strong>{s.name}</strong>
              <code>{s.hex}</code>
              <span className="sg-swatch-token">{s.token}</span>
            </div>
          ))}
        </div>
        <h3 className="sg-h3 sg-sub-h">Semantic</h3>
        <div className="sg-swatches">
          {semantic.map((s) => (
            <div key={s.token} className="sg-swatch sg-swatch-sm" style={{ background: `var(${s.token})`, color: s.on }}>
              <strong>{s.name}</strong>
              <code>{s.hex}</code>
            </div>
          ))}
        </div>
      </section>

      <section className="sg-sec">
        <h2 className="sg-h2">Typography</h2>
        <p className="sg-body sg-sec-sub">Playfair Display for headings, Inter for everything else — the one brand voice, everywhere.</p>
        <div className="sg-type">
          {typeRows.map((r) => (
            <div key={r.cls} className="sg-type-row">
              <span className="sg-type-label">{r.label}</span>
              <span className={r.cls}>{r.sample}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="sg-sec">
        <h2 className="sg-h2">Buttons</h2>
        <p className="sg-body sg-sec-sub">Gold carries action; black-on-gold keeps it legible. Secondary and ghost stay quiet.</p>
        <div className="sg-btns">
          <button type="button" className="sg-btn sg-btn-primary">Apply now</button>
          <button type="button" className="sg-btn sg-btn-dark">Post a job</button>
          <button type="button" className="sg-btn sg-btn-ghost">Learn more</button>
          <button type="button" className="sg-btn sg-btn-primary" disabled>Disabled</button>
        </div>
      </section>

      <section className="sg-sec">
        <h2 className="sg-h2">Cards &amp; badges</h2>
        <p className="sg-body sg-sec-sub">One card language: warm surface, soft border, measured shadow.</p>
        <div className="sg-cards">
          <article className="sg-card">
            <span className="sg-tag">Verified employer</span>
            <h3 className="sg-h3">Overnight care assistant</h3>
            <p className="sg-small sg-card-meta">Résidence Soleil · Laval, QC · 2.4 km away</p>
            <p className="sg-body">Support residents through the night shift. Training provided; references checked before posting.</p>
            <div className="sg-card-foot">
              <span className="sg-pay">$24.50/hr</span>
              <button type="button" className="sg-btn sg-btn-primary sg-btn-sm">Apply</button>
            </div>
          </article>
          <article className="sg-card">
            <h3 className="sg-h3">Status badges</h3>
            <div className="sg-badges">
              <span className="sg-badge sg-badge-success">Approved</span>
              <span className="sg-badge sg-badge-warning">Awaiting approval</span>
              <span className="sg-badge sg-badge-danger">Payment failed</span>
              <span className="sg-badge sg-badge-neutral">Draft</span>
              <span className="sg-badge sg-badge-selected">Selected</span>
            </div>
            <h3 className="sg-h3 sg-sub-h">Inputs</h3>
            <label className="sg-field">
              <span className="sg-label">Job title</span>
              <input className="sg-input" type="text" defaultValue="Kitchen helper" />
            </label>
            <label className="sg-field">
              <span className="sg-label">City</span>
              <select className="sg-input" defaultValue="Montréal">
                <option>Montréal</option>
                <option>Laval</option>
                <option>Longueuil</option>
              </select>
            </label>
          </article>
        </div>
      </section>

      <footer className="sg-foot">
        <span className="sg-eyebrow sg-eyebrow-gold">packages/design-system</span>
        <p className="sg-small">Change a token here and it changes everywhere. That is the whole point.</p>
      </footer>
    </main>
  );
}

const CSS = `
.sg{max-width:1120px;margin:0 auto;padding:clamp(28px,5vw,56px) max(18px,env(safe-area-inset-left)) 64px max(18px,env(safe-area-inset-right));color:var(--jl-text);}
.sg-hero{padding:clamp(28px,6vw,64px) 0 clamp(20px,3vw,34px);border-bottom:1px solid var(--jl-border);}
.sg-hero-sub{max-width:62ch;color:var(--jl-muted);margin:18px 0 0;}
.sg-sec{padding:clamp(30px,5vw,52px) 0;border-bottom:1px solid var(--jl-border);}
.sg-sec-sub{color:var(--jl-muted);max-width:60ch;margin:6px 0 24px;}
.sg-sub-h{margin:30px 0 14px;}
/* Type scale (mirrors design-system typeScale) */
.sg-display{font-family:var(--jl-font-serif);font-size:clamp(2.5rem,5.2vw,4rem);font-weight:800;line-height:1.04;letter-spacing:-.015em;margin:8px 0 0;text-wrap:balance;}
.sg-h1{font-family:var(--jl-font-serif);font-size:clamp(2rem,4vw,3rem);font-weight:800;line-height:1.08;letter-spacing:-.012em;margin:0;text-wrap:balance;}
.sg-h2{font-family:var(--jl-font-serif);font-size:clamp(1.5rem,2.6vw,2.125rem);font-weight:800;line-height:1.16;letter-spacing:-.01em;margin:0 0 2px;text-wrap:balance;}
.sg-h3{font-family:var(--jl-font-serif);font-size:clamp(1.25rem,1.8vw,1.5rem);font-weight:700;line-height:1.22;margin:0;text-wrap:balance;}
.sg-body-lg{font-family:var(--jl-font-sans);font-size:1.125rem;line-height:1.6;margin:0;}
.sg-body{font-family:var(--jl-font-sans);font-size:1rem;line-height:1.55;margin:0;}
.sg-small{font-family:var(--jl-font-sans);font-size:.875rem;line-height:1.5;margin:0;}
.sg-label{font-family:var(--jl-font-sans);font-size:.8125rem;font-weight:700;letter-spacing:.01em;}
.sg-eyebrow{font-family:var(--jl-font-sans);font-size:.75rem;font-weight:800;letter-spacing:.09em;text-transform:uppercase;}
.sg-eyebrow-gold{color:var(--jl-gold-text);}
/* Color swatches */
.sg-swatches{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px;}
.sg-swatch{border-radius:var(--jl-radius-md);padding:16px;min-height:104px;display:flex;flex-direction:column;gap:3px;border:1px solid rgba(0,0,0,.06);box-shadow:var(--jl-shadow-xs);}
.sg-swatch-sm{min-height:84px;}
.sg-swatch strong{font-family:var(--jl-font-sans);font-size:.95rem;font-weight:700;}
.sg-swatch code{font-family:var(--jl-font-mono);font-size:.78rem;opacity:.92;}
.sg-swatch-token{font-family:var(--jl-font-mono);font-size:.68rem;opacity:.7;margin-top:auto;}
/* Type rows */
.sg-type{display:flex;flex-direction:column;gap:20px;}
.sg-type-row{display:flex;flex-direction:column;gap:6px;}
.sg-type-label{font-family:var(--jl-font-mono);font-size:.72rem;letter-spacing:.04em;text-transform:uppercase;color:var(--jl-muted);}
/* Buttons */
.sg-btns{display:flex;gap:12px;flex-wrap:wrap;align-items:center;}
.sg-btn{font-family:var(--jl-font-sans);font-weight:700;font-size:.95rem;border:0;border-radius:var(--jl-radius-md);padding:12px 22px;cursor:pointer;min-height:var(--jl-touch-minimum);transition:background var(--jl-motion-standard) var(--jl-motion-easing),transform var(--jl-motion-fast) var(--jl-motion-easing);}
.sg-btn-sm{padding:9px 16px;font-size:.875rem;}
.sg-btn-primary{background:var(--jl-gold-strong);color:var(--jl-on-gold);}
.sg-btn-primary:hover{background:var(--jl-gold-deep);}
.sg-btn-dark{background:var(--jl-black);color:var(--jl-on-black);}
.sg-btn-dark:hover{background:var(--jl-ink);}
.sg-btn-ghost{background:transparent;color:var(--jl-text);border:1px solid var(--jl-border-strong);}
.sg-btn-ghost:hover{background:var(--jl-cream);}
.sg-btn:disabled{opacity:.5;cursor:default;}
.sg-btn:focus-visible{outline:2px solid var(--jl-focus);outline-offset:2px;}
/* Cards */
.sg-cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:18px;}
.sg-card{background:var(--jl-white);border:1px solid var(--jl-border);border-radius:var(--jl-radius-lg);padding:22px;box-shadow:var(--jl-shadow-md);display:flex;flex-direction:column;gap:10px;}
.sg-card-meta{color:var(--jl-muted);}
.sg-card-foot{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:6px;}
.sg-pay{font-family:var(--jl-font-sans);font-weight:800;font-size:1.05rem;color:var(--jl-gold-deep);font-variant-numeric:tabular-nums;}
.sg-tag{align-self:flex-start;font-family:var(--jl-font-sans);font-size:.68rem;font-weight:800;letter-spacing:.07em;text-transform:uppercase;color:var(--jl-gold-text);background:var(--jl-cream-contrast);border:1px solid #f0e0bf;padding:4px 10px;border-radius:var(--jl-radius-pill);}
/* Badges */
.sg-badges{display:flex;gap:8px;flex-wrap:wrap;}
.sg-badge{font-family:var(--jl-font-sans);font-size:.78rem;font-weight:700;padding:4px 11px;border-radius:var(--jl-radius-pill);border:1px solid transparent;}
.sg-badge-success{background:#e7f6ed;color:var(--jl-success);border-color:#9fd8bc;}
.sg-badge-warning{background:#fff1d6;color:var(--jl-warning);border-color:#e8d782;}
.sg-badge-danger{background:#fde8e8;color:var(--jl-danger);border-color:#efb3b3;}
.sg-badge-neutral{background:#f4efe3;color:var(--jl-gold-text);border-color:var(--jl-border);}
.sg-badge-selected{background:var(--jl-gold-strong);color:var(--jl-on-gold);border-color:var(--jl-gold-strong);}
/* Inputs */
.sg-field{display:flex;flex-direction:column;gap:5px;margin-top:14px;}
.sg-input{font-family:var(--jl-font-sans);font-size:.95rem;color:var(--jl-text);background:var(--jl-cream-raised);border:1px solid var(--jl-border-strong);border-radius:var(--jl-radius-sm);padding:11px 13px;min-height:var(--jl-touch-minimum);}
.sg-input:focus-visible{outline:2px solid var(--jl-focus);outline-offset:1px;border-color:var(--jl-gold);background:var(--jl-white);}
/* Footer */
.sg-foot{padding:34px 0 0;display:flex;flex-direction:column;gap:6px;}
.sg-foot .sg-small{color:var(--jl-muted);}
@media (max-width:560px){
  .sg-btns{gap:10px;}
}
`;
