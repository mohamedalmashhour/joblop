"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale } from "./i18n/LocaleProvider";

// Auto-playing "how dispatch works" motion graphic for the admin console (CSS/JS — no video asset):
// a governed dispatch flow — request lands → AI ranks matches (advisory only) → a human approves →
// worker dispatched and every step audited. Dark + gold brand. Trilingual (EN/FR/ع).
// Governance is the point: AI never dispatches; a dispatcher approves, and the audit line is recorded.

type Lang = "en" | "fr" | "ar";

const T: Record<Lang, {
  eyebrow: string; title: string; sub: string;
  steps: string[];
  reqTitle: string; residence: string; role: string; urgency: string;
  rankTitle: string; advisory: string;
  approveTitle: string; approveNote: string; approve: string; human: string;
  doneTitle: string; dispatched: string; audited: string;
  pause: string; play: string; replay: string;
  cands: { name: string; meta: string; pct: string }[];
}> = {
  en: {
    eyebrow: "SEE IT IN ACTION", title: "How dispatch works",
    sub: "AI ranks the best local workers for every request — but a human dispatcher approves, and every decision is recorded. The platform recommends; people decide.",
    steps: ["Request lands", "AI ranks matches", "Dispatcher approves", "Dispatched & audited"],
    reqTitle: "Incoming request", residence: "Laval Residence", role: "Chef · Emergency", urgency: "Needs a decision",
    rankTitle: "AI matching queue", advisory: "Advisory only — not a dispatch",
    approveTitle: "Dispatcher approves", approveNote: "Human decision required · cannot be bypassed", approve: "Approve", human: "Dispatcher",
    doneTitle: "Dispatched", dispatched: "Worker assigned & notified", audited: "Decision recorded in the audit log",
    pause: "Pause", play: "Play", replay: "Replay",
    cands: [
      { name: "Mohamed A.", meta: "Worked here 13× · can work alone", pct: "95%" },
      { name: "Sarah L.", meta: "Credential verified · 8 km", pct: "88%" },
      { name: "John D.", meta: "Food service · needs supervisor", pct: "82%" }
    ]
  },
  fr: {
    eyebrow: "VOIR EN ACTION", title: "Comment fonctionne la répartition",
    sub: "L’IA classe les meilleurs travailleurs locaux pour chaque demande — mais un répartiteur humain approuve, et chaque décision est enregistrée. La plateforme recommande; les gens décident.",
    steps: ["Demande reçue", "L’IA classe", "Le répartiteur approuve", "Réparti et consigné"],
    reqTitle: "Demande entrante", residence: "Résidence Laval", role: "Chef · Urgence", urgency: "Décision requise",
    rankTitle: "File de jumelage IA", advisory: "Consultatif seulement — pas une répartition",
    approveTitle: "Le répartiteur approuve", approveNote: "Décision humaine requise · non contournable", approve: "Approuver", human: "Répartiteur",
    doneTitle: "Réparti", dispatched: "Travailleur assigné et avisé", audited: "Décision consignée au journal d’audit",
    pause: "Pause", play: "Lecture", replay: "Rejouer",
    cands: [
      { name: "Mohamed A.", meta: "A travaillé ici 13× · peut travailler seul", pct: "95 %" },
      { name: "Sarah L.", meta: "Accréditation vérifiée · 8 km", pct: "88 %" },
      { name: "John D.", meta: "Service alimentaire · supervision requise", pct: "82 %" }
    ]
  },
  ar: {
    eyebrow: "شاهدها وهي تعمل", title: "كيف يعمل التوزيع",
    sub: "يرتّب الذكاء الاصطناعي أفضل العمال المحليين لكل طلب — لكن منسّقًا بشريًا هو من يوافق، وكل قرار يُسجَّل. المنصّة تقترح، والبشر يقرّرون.",
    steps: ["وصل الطلب", "الذكاء الاصطناعي يرتّب", "المنسّق يوافق", "تم التوزيع والتدقيق"],
    reqTitle: "طلب وارد", residence: "مقر لافال", role: "طاهٍ · طارئ", urgency: "يتطلّب قرارًا",
    rankTitle: "قائمة مطابقة الذكاء الاصطناعي", advisory: "استشاري فقط — ليس توزيعًا",
    approveTitle: "المنسّق يوافق", approveNote: "قرار بشري إلزامي · لا يمكن تجاوزه", approve: "موافقة", human: "المنسّق",
    doneTitle: "تم التوزيع", dispatched: "تم تعيين العامل وإشعاره", audited: "تم تسجيل القرار في سجل التدقيق",
    pause: "إيقاف", play: "تشغيل", replay: "إعادة",
    cands: [
      { name: "محمد أ.", meta: "عمل هنا ١٣ مرة · يعمل بمفرده", pct: "95%" },
      { name: "سارة ل.", meta: "اعتماد موثّق · ٨ كم", pct: "88%" },
      { name: "جون د.", meta: "خدمة طعام · يحتاج مشرفًا", pct: "82%" }
    ]
  }
};

function toLang(locale: string): Lang {
  if (locale === "ar") return "ar";
  if (locale.startsWith("fr")) return "fr";
  return "en";
}

export function AdminFlowMovie() {
  const locale = useLocale();
  const lang = toLang(locale);
  const d = T[lang];
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(true);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!playing) return;
    const dwell = [2400, 3000, 2800, 2800];
    timer.current = setTimeout(() => setStep((s) => (s + 1) % 4), dwell[step] ?? 2600);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [step, playing]);

  return (
    <section className="afm" aria-label={d.title} dir={lang === "ar" ? "rtl" : "ltr"}>
      <style>{CSS}</style>
      <div className="afm-copy">
        <span className="afm-eyebrow">{d.eyebrow}</span>
        <h2 className="afm-title">{d.title}</h2>
        <p className="afm-sub">{d.sub}</p>
        <ol className="afm-steps" aria-hidden="true">
          {d.steps.map((s, i) => (
            <li key={s} className={i === step ? "on" : i < step ? "done" : ""}>
              <span className="afm-n">{i < step ? "✓" : i + 1}</span>
              {s}
            </li>
          ))}
        </ol>
        <div className="afm-controls">
          <button type="button" onClick={() => setPlaying((p) => !p)}>
            {playing ? `⏸ ${d.pause}` : `▶ ${d.play}`}
          </button>
          <button type="button" onClick={() => { setStep(0); setPlaying(true); }}>↺ {d.replay}</button>
        </div>
      </div>

      <div className="afm-stage">
        <div className="afm-card" role="img" aria-label={d.steps[step]}>
          {/* STEP 0 — request lands */}
          {step === 0 && (
            <div className="afm-pane">
              <strong className="afm-pane-h">{d.reqTitle}</strong>
              <div className="afm-req">
                <span className="afm-dot" />
                <span className="afm-wmeta"><b>{d.residence}</b><em>{d.role}</em></span>
                <span className="afm-hot">{d.urgency}</span>
              </div>
            </div>
          )}
          {/* STEP 1 — AI ranks (advisory) */}
          {step === 1 && (
            <div className="afm-pane">
              <strong className="afm-pane-h">{d.rankTitle}</strong>
              <span className="afm-tag">{d.advisory}</span>
              {d.cands.map((c, i) => (
                <div className="afm-worker" key={c.name} style={{ animationDelay: `${i * 140}ms` }}>
                  <span className="afm-av">◆</span>
                  <span className="afm-wmeta"><b>{c.name}</b><em>{c.meta}</em></span>
                  <span className="afm-pct">{c.pct}</span>
                </div>
              ))}
            </div>
          )}
          {/* STEP 2 — human approves */}
          {step === 2 && (
            <div className="afm-pane">
              <strong className="afm-pane-h">{d.approveTitle}</strong>
              <span className="afm-note">{d.approveNote}</span>
              <div className="afm-worker afm-sel">
                <span className="afm-av">◆</span>
                <span className="afm-wmeta"><b>{d.cands[0]?.name}</b><em>{d.human}</em></span>
                <span className="afm-approve">{d.approve}</span>
              </div>
            </div>
          )}
          {/* STEP 3 — dispatched & audited */}
          {step === 3 && (
            <div className="afm-pane afm-done">
              <span className="afm-check">✓</span>
              <strong className="afm-pane-h">{d.doneTitle}</strong>
              <span className="afm-note">{d.dispatched}</span>
              <span className="afm-audit">🔒 {d.audited}</span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

const CSS = `
.afm{max-width:1080px;margin:18px auto;padding:clamp(24px,4vw,38px) clamp(18px,3vw,36px);
  display:grid;grid-template-columns:1fr 1fr;gap:clamp(24px,4vw,44px);align-items:center;
  background:radial-gradient(640px 320px at 12% 0%,rgba(248, 184, 8,.18),transparent),linear-gradient(120deg,#0b0906,#16110a 60%,#000);
  border:1px solid rgba(248, 184, 8,.22);border-radius:24px;color:#f4efe4;}
.afm[dir="rtl"]{background:radial-gradient(640px 320px at 88% 0%,rgba(248, 184, 8,.18),transparent),linear-gradient(240deg,#0b0906,#16110a 60%,#000);}
.afm-eyebrow{font-size:12px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:#f8b808;}
.afm-title{font-family:var(--font-serif,"Playfair Display",Georgia,serif);font-size:clamp(24px,3.2vw,34px);font-weight:800;line-height:1.12;letter-spacing:-.01em;margin:12px 0 10px;color:#fbf7ee;text-wrap:balance;}
.afm-sub{color:#cabfa8;font-size:clamp(14px,1.5vw,16px);line-height:1.6;margin:0 0 18px;max-width:50ch;}
.afm-steps{list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:10px;}
.afm-steps li{display:flex;align-items:center;gap:10px;font-weight:700;font-size:14.5px;color:#8a8070;transition:color .3s;}
.afm-steps li.on{color:#fbf7ee;} .afm-steps li.done{color:#b3a894;}
.afm-n{width:26px;height:26px;flex:none;border-radius:999px;display:grid;place-items:center;font-size:12px;font-weight:800;
  background:rgba(248, 184, 8,.14);border:1px solid rgba(248, 184, 8,.3);color:#f8b808;transition:all .3s;}
.afm-steps li.on .afm-n{background:#f8b808;color:#000;border-color:#f8b808;}
.afm-steps li.done .afm-n{background:rgba(248, 184, 8,.2);color:#f8b808;}
.afm-controls{display:flex;gap:10px;margin-top:18px;}
.afm-controls button{background:rgba(248, 184, 8,.1);border:1px solid rgba(248, 184, 8,.3);color:#f4efe4;font-weight:700;font-size:13px;border-radius:999px;padding:7px 14px;cursor:pointer;}
.afm-controls button:hover{background:rgba(248, 184, 8,.18);}
.afm-stage{display:flex;justify-content:center;}
.afm-card{width:min(100%,360px);min-height:264px;background:#0c0c0c;border:1px solid rgba(248, 184, 8,.22);border-radius:18px;
  box-shadow:0 30px 70px -40px rgba(0,0,0,.9);padding:18px;display:flex;}
.afm-pane{display:flex;flex-direction:column;gap:10px;width:100%;animation:afm-in .4s ease both;}
@keyframes afm-in{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:none;}}
.afm-pane-h{font-family:var(--font-serif,"Playfair Display",Georgia,serif);font-size:17px;font-weight:800;color:#fbf7ee;}
.afm-note{color:#b3a894;font-size:12.5px;}
.afm-tag{align-self:flex-start;background:rgba(248, 184, 8,.12);border:1px solid rgba(248, 184, 8,.32);color:#d8b968;font-size:11px;font-weight:800;padding:4px 10px;border-radius:999px;}
.afm-req{display:flex;align-items:center;gap:10px;background:#141210;border:1px solid rgba(240,120,120,.3);border-radius:12px;padding:12px;}
.afm-dot{width:10px;height:10px;flex:none;border-radius:999px;background:#f07878;box-shadow:0 0 0 4px rgba(240,120,120,.18);}
.afm-worker{display:flex;align-items:center;gap:10px;background:#141210;border:1px solid rgba(248, 184, 8,.16);border-radius:12px;padding:10px 12px;animation:afm-in .4s ease both;}
.afm-worker.afm-sel{border-color:rgba(248, 184, 8,.5);box-shadow:0 0 0 1px rgba(248, 184, 8,.3) inset;}
.afm-av{width:34px;height:34px;flex:none;border-radius:9px;background:#1a1510;display:grid;place-items:center;font-size:15px;color:#f8b808;}
.afm-wmeta{display:flex;flex-direction:column;min-width:0;flex:1;}
.afm-wmeta b{font-size:13.5px;color:#f4efe4;} .afm-wmeta em{font-style:normal;color:#b3a894;font-size:12px;}
.afm-pct{font-weight:800;font-size:13px;color:#f8b808;flex:none;}
.afm-hot{flex:none;background:rgba(240,120,120,.14);color:#f3a0a0;border:1px solid rgba(240,120,120,.32);font-size:11px;font-weight:800;padding:3px 9px;border-radius:999px;}
.afm-approve{flex:none;background:#f8b808;color:#000;font-size:11px;font-weight:800;padding:4px 11px;border-radius:999px;}
.afm-done{align-items:center;text-align:center;justify-content:center;gap:8px;}
.afm-check{width:56px;height:56px;border-radius:999px;display:grid;place-items:center;font-size:28px;font-weight:800;background:#f8b808;color:#000;}
.afm-audit{color:#4fe3a0;font-size:12px;font-weight:700;}
@media (max-width:860px){ .afm{grid-template-columns:1fr;} .afm-stage{order:-1;} }
`;
