"use client";

import { useEffect, useState } from "react";

// Main landing: one short loop that shows how the WHOLE platform works for everyone —
// the employer posts, Joblop checks and matches, the worker works, and everyone is settled.
// Cycles through different kinds of work so visitors see Joblop is for every field.

type Lang = "en" | "fr" | "ar";

type Copy = {
  eyebrow: string;
  title: string;
  sub: string;
  employer: string;
  joblop: string;
  worker: string;
  steps: { title: string; body: string }[];
  jobs: { icon: string; role: string }[];
  pause: string;
  play: string;
};

const T: Record<Lang, Copy> = {
  en: {
    eyebrow: "How Joblop works",
    title: "One platform. Every kind of job.",
    sub: "Employers get reliable help, workers get paid shifts, and Joblop takes care of everything in between.",
    employer: "Employer",
    joblop: "Joblop",
    worker: "Worker",
    steps: [
      { title: "The employer posts a job", body: "Any field, any day. Takes about a minute." },
      { title: "Joblop checks and matches", body: "Our team reviews the request and finds verified workers nearby." },
      { title: "The worker does the shift", body: "Confirmed by text, clock in and out on the phone." },
      { title: "Everyone is settled", body: "The employer gets the invoice by email. The worker gets paid." }
    ],
    jobs: [
      { icon: "🧹", role: "Cleaner" },
      { icon: "📦", role: "Warehouse helper" },
      { icon: "🍳", role: "Cook" },
      { icon: "🎪", role: "Event staff" },
      { icon: "🚚", role: "Driver" },
      { icon: "🦺", role: "Construction helper" }
    ],
    pause: "Pause",
    play: "Play"
  },
  fr: {
    eyebrow: "Comment fonctionne Joblop",
    title: "Une plateforme. Tous les types d’emplois.",
    sub: "Les employeurs obtiennent de l’aide fiable, les travailleurs des quarts payés, et Joblop s’occupe de tout le reste.",
    employer: "Employeur",
    joblop: "Joblop",
    worker: "Travailleur",
    steps: [
      { title: "L’employeur publie un emploi", body: "Tous les domaines, tous les jours. Environ une minute." },
      { title: "Joblop vérifie et jumelle", body: "Notre équipe examine la demande et trouve des travailleurs vérifiés à proximité." },
      { title: "Le travailleur fait le quart", body: "Confirmé par texto, arrivée et départ sur le téléphone." },
      { title: "Tout le monde est réglé", body: "L’employeur reçoit la facture par courriel. Le travailleur est payé." }
    ],
    jobs: [
      { icon: "🧹", role: "Préposé à l’entretien" },
      { icon: "📦", role: "Aide d’entrepôt" },
      { icon: "🍳", role: "Cuisinier" },
      { icon: "🎪", role: "Personnel d’événement" },
      { icon: "🚚", role: "Chauffeur" },
      { icon: "🦺", role: "Aide en construction" }
    ],
    pause: "Pause",
    play: "Lire"
  },
  ar: {
    eyebrow: "كيف يعمل Joblop",
    title: "منصة واحدة. لكل أنواع الوظائف.",
    sub: "يحصل أصحاب العمل على مساعدة موثوقة، ويحصل العمال على نوبات مدفوعة، ويتولى Joblop كل ما بينهما.",
    employer: "صاحب العمل",
    joblop: "Joblop",
    worker: "العامل",
    steps: [
      { title: "صاحب العمل ينشر وظيفة", body: "أي مجال وأي يوم. تستغرق دقيقة تقريبًا." },
      { title: "Joblop يراجع ويطابق", body: "يراجع فريقنا الطلب ويجد عمالًا موثَّقين بالقرب منك." },
      { title: "العامل يؤدي النوبة", body: "تأكيد برسالة نصية، وتسجيل الوصول والمغادرة من الهاتف." },
      { title: "تتم تسوية الجميع", body: "يتلقى صاحب العمل الفاتورة بالبريد الإلكتروني، ويحصل العامل على أجره." }
    ],
    jobs: [
      { icon: "🧹", role: "عامل تنظيف" },
      { icon: "📦", role: "مساعد مستودع" },
      { icon: "🍳", role: "طباخ" },
      { icon: "🎪", role: "طاقم فعاليات" },
      { icon: "🚚", role: "سائق" },
      { icon: "🦺", role: "مساعد بناء" }
    ],
    pause: "إيقاف",
    play: "تشغيل"
  }
};

const STEP_MS = 2800;

export function PlatformLoopMovie({ lang = "en" }: { lang?: Lang }) {
  const d = T[lang];
  const [tick, setTick] = useState(0);
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setPlaying(false);
    }
  }, []);

  useEffect(() => {
    if (!playing) return;
    const id = setTimeout(() => setTick((n) => n + 1), STEP_MS);
    return () => clearTimeout(id);
  }, [tick, playing]);

  const step = tick % 4;
  const job = d.jobs[Math.floor(tick / 4) % d.jobs.length] ?? d.jobs[0]!;
  // Where the moving job card sits: employer (0) → Joblop (1) → worker (2) → back to employer (3).
  const spot = [0, 1, 2, 0][step] ?? 0;

  return (
    <section className="plm" aria-label={d.title} dir={lang === "ar" ? "rtl" : "ltr"}>
      <style>{CSS}</style>
      <div className="plm-head">
        <span className="plm-eyebrow">{d.eyebrow}</span>
        <h2 className="plm-title">{d.title}</h2>
        <p className="plm-sub">{d.sub}</p>
      </div>

      <div className="plm-track" aria-hidden="true">
        <div className="plm-line" />
        <div className={`plm-node ${spot === 0 ? "on" : ""}`}>
          <span className="plm-ic">🏢</span>
          <b>{d.employer}</b>
        </div>
        <div className={`plm-node plm-hub ${spot === 1 ? "on" : ""}`}>
          <span className="plm-ic plm-logo">
            <span className="plm-word">
              J<span>o</span>bl<span>o</span>p
            </span>
          </span>
          <b>{d.joblop}</b>
        </div>
        <div className={`plm-node ${spot === 2 ? "on" : ""}`}>
          <span className="plm-ic">👷</span>
          <b>{d.worker}</b>
        </div>
        <div className={`plm-token plm-at-${spot}`} key={`${tick}`}>
          <span>{step === 3 ? "🧾" : job.icon}</span>
          <em>{step === 3 ? "✓" : job.role}</em>
        </div>
      </div>

      <ol className="plm-steps">
        {d.steps.map((s, i) => (
          <li key={s.title} className={i === step ? "on" : ""}>
            <span className="plm-n">{i + 1}</span>
            <span className="plm-txt">
              <strong>{s.title}</strong>
              <span>{s.body}</span>
            </span>
          </li>
        ))}
      </ol>

      <div className="plm-controls">
        <button type="button" onClick={() => setPlaying((p) => !p)}>
          {playing ? `⏸ ${d.pause}` : `▶ ${d.play}`}
        </button>
      </div>
    </section>
  );
}

const CSS = `
.plm{max-width:1080px;margin:40px auto;padding:clamp(26px,4vw,44px) clamp(16px,3vw,36px);
  background:radial-gradient(700px 300px at 50% 0%,rgba(248,184,8,.16),transparent),linear-gradient(180deg,#0b0906,#000);
  border:1px solid rgba(248,184,8,.22);border-radius:24px;color:#f4efe4;text-align:center;}
.plm-eyebrow{font-size:12px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:#f8b808;}
.plm-title{font-family:var(--font-serif,"Playfair Display",Georgia,serif);font-size:clamp(24px,3.4vw,36px);font-weight:800;line-height:1.12;margin:12px 0 10px;color:#fbf7ee;}
.plm-sub{color:#cabfa8;font-size:clamp(14px,1.5vw,16px);line-height:1.6;margin:0 auto 26px;max-width:60ch;}
.plm-track{position:relative;display:grid;grid-template-columns:repeat(3,1fr);align-items:center;margin:0 auto 26px;max-width:760px;min-height:190px;}
.plm-line{position:absolute;left:16.6%;right:16.6%;top:46px;height:3px;border-radius:3px;
  background:repeating-linear-gradient(90deg,rgba(248,184,8,.55) 0 10px,transparent 10px 18px);background-size:36px 3px;animation:plm-flow 1.2s linear infinite;}
[dir="rtl"] .plm-line{animation-direction:reverse;}
@keyframes plm-flow{to{background-position:36px 0;}}
.plm-node{position:relative;z-index:1;display:flex;flex-direction:column;align-items:center;gap:8px;align-self:start;}
.plm-node b{font-size:14px;color:#b3a894;transition:color .3s;}
.plm-ic{width:92px;height:92px;border-radius:24px;display:grid;place-items:center;font-size:40px;background:#141210;
  border:2px solid rgba(248,184,8,.22);transition:transform .35s,border-color .35s,box-shadow .35s;}
.plm-logo{font-size:20px;font-weight:900;color:#fff;letter-spacing:-.02em;background:#0c0c0c;}
.plm-word{white-space:nowrap;} .plm-word span{color:#f8b808;}
.plm-node.on .plm-ic{transform:scale(1.08);border-color:#f8b808;box-shadow:0 0 0 6px rgba(248,184,8,.14),0 18px 40px -18px rgba(248,184,8,.6);}
.plm-node.on b{color:#fbf7ee;}
.plm-token{position:absolute;z-index:2;top:142px;display:flex;align-items:center;gap:8px;padding:7px 12px;border-radius:999px;
  background:#f8b808;color:#111;font-weight:800;font-size:13px;white-space:nowrap;transform:translateX(-50%);
  animation:plm-pop .45s ease both;box-shadow:0 10px 24px -10px rgba(248,184,8,.7);}
.plm-token em{font-style:normal;}
.plm-at-0{left:16.6%;} .plm-at-1{left:50%;} .plm-at-2{left:83.4%;}
[dir="rtl"] .plm-at-0{left:83.4%;} [dir="rtl"] .plm-at-2{left:16.6%;}
@keyframes plm-pop{from{opacity:0;transform:translate(-50%,8px) scale(.9);}to{opacity:1;transform:translate(-50%,0) scale(1);}}
.plm-steps{list-style:none;padding:0;margin:0 auto;display:grid;grid-template-columns:repeat(4,1fr);gap:12px;max-width:1000px;text-align:start;}
.plm-steps li{display:flex;gap:10px;padding:14px;border-radius:14px;background:rgba(255,255,255,.03);border:1px solid rgba(248,184,8,.12);
  opacity:.55;transition:opacity .3s,border-color .3s,background .3s;}
.plm-steps li.on{opacity:1;border-color:rgba(248,184,8,.55);background:rgba(248,184,8,.08);}
.plm-n{width:26px;height:26px;flex:none;border-radius:999px;display:grid;place-items:center;font-size:12px;font-weight:800;background:rgba(248,184,8,.16);color:#f8b808;}
.plm-steps li.on .plm-n{background:#f8b808;color:#000;}
.plm-txt{display:flex;flex-direction:column;gap:4px;}
.plm-txt strong{font-size:14px;color:#fbf7ee;line-height:1.3;}
.plm-txt span{font-size:12.5px;color:#b3a894;line-height:1.45;}
.plm-controls{margin-top:18px;}
.plm-controls button{background:rgba(248,184,8,.1);border:1px solid rgba(248,184,8,.3);color:#f4efe4;font-weight:700;font-size:13px;border-radius:999px;padding:7px 14px;cursor:pointer;}
@media (max-width:860px){ .plm-steps{grid-template-columns:repeat(2,1fr);} }
@media (max-width:520px){ .plm-ic{width:68px;height:68px;font-size:30px;border-radius:18px;} .plm-logo{font-size:15px;}
  .plm-line{top:34px;} .plm-token{top:112px;font-size:12px;} .plm-track{min-height:160px;} .plm-steps{grid-template-columns:1fr;} .plm-node b{font-size:12px;} }
@media (prefers-reduced-motion: reduce){ .plm-line,.plm-token{animation:none;} }
`;
