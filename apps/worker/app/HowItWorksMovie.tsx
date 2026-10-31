"use client";

import { JobScannerDemo } from "./browse/JobScannerDemo";
import { useLocale } from "./i18n/LocaleProvider";

// Features the auto-playing "how JobLop works" motion graphic (the JobScanner movie) on the worker
// home, in the dark + gold brand frame. The demo itself is EN/FR; Arabic falls back to en.
export function HowItWorksMovie() {
  const locale = useLocale();
  const lang = locale.startsWith("fr") ? "fr" : "en";
  const t =
    locale === "ar"
      ? { eyebrow: "شاهدها وهي تعمل", title: "كيف يعمل جوب‑لوب", sub: "بحث واحد، والسوق كله يُفحص ويُرتّب من أجلك — ثم تتقدّم مجانًا." }
      : locale.startsWith("fr")
        ? { eyebrow: "VOIR EN ACTION", title: "Comment fonctionne Joblop", sub: "Une seule recherche — tout le marché analysé et classé pour vous, puis postulez gratuitement." }
        : { eyebrow: "SEE IT IN ACTION", title: "How Joblop works", sub: "One search — the whole market scanned and ranked for you, then apply free." };

  return (
    <section className="hiw-movie" aria-label={t.title}>
      <style>{CSS}</style>
      <div className="hiw-copy">
        <span className="hiw-eyebrow">{t.eyebrow}</span>
        <h2 className="hiw-title">{t.title}</h2>
        <p className="hiw-sub">{t.sub}</p>
      </div>
      <div className="hiw-stage">
        <JobScannerDemo lang={lang} />
      </div>
    </section>
  );
}

const CSS = `
.hiw-movie{
  max-width:1080px;margin:40px auto 8px;padding:clamp(26px,4vw,40px) clamp(18px,3vw,36px);
  display:grid;grid-template-columns:1fr 1fr;gap:clamp(24px,4vw,44px);align-items:center;
  background:radial-gradient(640px 320px at 12% 0%,rgba(201,162,75,.18),transparent),linear-gradient(120deg,#0b0906,#16110a 60%,#000);
  border:1px solid rgba(201,162,75,.22);border-radius:24px;color:#f4efe4;
}
.hiw-eyebrow{font-family:var(--jl-font-sans);font-size:12px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:#c9a24b;}
.hiw-title{font-family:var(--jl-font-serif);font-size:clamp(26px,3.4vw,38px);font-weight:800;line-height:1.1;letter-spacing:-.01em;margin:12px 0 10px;color:#fbf7ee;text-wrap:balance;}
.hiw-sub{font-family:var(--jl-font-sans);color:#cabfa8;font-size:clamp(15px,1.6vw,17px);line-height:1.6;margin:0;max-width:46ch;}
.hiw-stage{display:flex;justify-content:center;}
@media (max-width:860px){ .hiw-movie{grid-template-columns:1fr;} .hiw-stage{order:-1;} }
`;
