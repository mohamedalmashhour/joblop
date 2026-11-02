"use client";

import { useEffect, useRef, useState } from "react";

// Auto-playing "how it works" motion graphic for employers (CSS/JS — no video asset): a dashboard
// card looping through the employer flow — post a request → get matched → confirm & schedule →
// shift covered. Dark + gold brand. Trilingual (EN/FR/ع). No payment claims (money stays governed).

type Lang = "en" | "fr" | "ar";

const T: Record<Lang, {
  eyebrow: string; title: string; sub: string;
  steps: string[];
  postTitle: string; role: string; when: string; post: string;
  matchTitle: string; matched: (n: number) => string;
  confirmTitle: string; confirmed: string; scheduled: string;
  doneTitle: string; covered: string; recorded: string;
  play: string; pause: string; replay: string;
  workers: { name: string; meta: string; pct: string }[];
}> = {
  en: {
    eyebrow: "SEE IT IN ACTION", title: "How Joblop works for employers",
    sub: "Post what you need and let verified local workers come to you — matched, confirmed, and covered, all governed.",
    steps: ["Post a request", "Get matched", "Confirm & schedule", "Shift covered"],
    postTitle: "New staffing request", role: "Kitchen helper · Laval, QC", when: "Sat 8:00 AM · 6h", post: "Post request",
    matchTitle: "Matched workers", matched: (n) => `${n} available nearby`,
    confirmTitle: "Confirm your worker", confirmed: "Confirmed", scheduled: "Scheduled · Sat 8:00 AM",
    doneTitle: "Shift covered", covered: "Worker assigned", recorded: "Hours recorded fairly",
    play: "Play", pause: "Pause", replay: "Replay",
    workers: [
      { name: "Sarah M.", meta: "4.9 · 2 km", pct: "96%" },
      { name: "Ahmed R.", meta: "4.8 · 3 km", pct: "92%" },
      { name: "Maria L.", meta: "4.7 · 5 km", pct: "88%" }
    ]
  },
  fr: {
    eyebrow: "VOIR EN ACTION", title: "Comment Joblop fonctionne pour les employeurs",
    sub: "Publiez votre besoin et laissez des travailleurs locaux vérifiés venir à vous — jumelés, confirmés et comblés, le tout encadré.",
    steps: ["Publier une demande", "Être jumelé", "Confirmer et planifier", "Quart comblé"],
    postTitle: "Nouvelle demande de dotation", role: "Aide-cuisine · Laval, QC", when: "Sam 8 h 00 · 6 h", post: "Publier",
    matchTitle: "Travailleurs jumelés", matched: (n) => `${n} disponibles à proximité`,
    confirmTitle: "Confirmez votre travailleur", confirmed: "Confirmé", scheduled: "Planifié · Sam 8 h 00",
    doneTitle: "Quart comblé", covered: "Travailleur assigné", recorded: "Heures enregistrées équitablement",
    play: "Lecture", pause: "Pause", replay: "Rejouer",
    workers: [
      { name: "Sarah M.", meta: "4,9 · 2 km", pct: "96 %" },
      { name: "Ahmed R.", meta: "4,8 · 3 km", pct: "92 %" },
      { name: "Maria L.", meta: "4,7 · 5 km", pct: "88 %" }
    ]
  },
  ar: {
    eyebrow: "شاهدها وهي تعمل", title: "كيف يعمل جوب‑لوب لأصحاب العمل",
    sub: "انشر ما تحتاجه ودع العمال المحليين الموثّقين يأتون إليك — مطابقة ثم تأكيد ثم تغطية، ضمن إطار منظّم.",
    steps: ["انشر طلبًا", "احصل على مطابقة", "أكّد وجدوِل", "تمت تغطية النوبة"],
    postTitle: "طلب توظيف جديد", role: "مساعد مطبخ · لافال", when: "السبت 8:00 ص · 6 س", post: "انشر الطلب",
    matchTitle: "عمال مطابقون", matched: (n) => `${n} متاحون بالقرب منك`,
    confirmTitle: "أكّد عاملك", confirmed: "مؤكَّد", scheduled: "مجدول · السبت 8:00 ص",
    doneTitle: "تمت تغطية النوبة", covered: "تم تعيين العامل", recorded: "الساعات مسجّلة بإنصاف",
    play: "تشغيل", pause: "إيقاف", replay: "إعادة",
    workers: [
      { name: "سارة م.", meta: "4.9 · 2 كم", pct: "96%" },
      { name: "أحمد ر.", meta: "4.8 · 3 كم", pct: "92%" },
      { name: "ماريا ل.", meta: "4.7 · 5 كم", pct: "88%" }
    ]
  }
};

export function EmployerFlowMovie({ lang = "en" }: { lang?: Lang }) {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(true);
  const d = T[lang];
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!playing) return;
    const dwell = [2400, 2800, 2600, 2600];
    timer.current = setTimeout(() => setStep((s) => (s + 1) % 4), dwell[step] ?? 2500);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [step, playing]);

  return (
    <section className="efm" aria-label={d.title}>
      <style>{CSS}</style>
      <div className="efm-copy">
        <span className="efm-eyebrow">{d.eyebrow}</span>
        <h2 className="efm-title">{d.title}</h2>
        <p className="efm-sub">{d.sub}</p>
        <ol className="efm-steps" aria-hidden="true">
          {d.steps.map((s, i) => (
            <li key={s} className={i === step ? "on" : i < step ? "done" : ""}>
              <span className="efm-n">{i < step ? "✓" : i + 1}</span>
              {s}
            </li>
          ))}
        </ol>
        <div className="efm-controls">
          <button type="button" onClick={() => setPlaying((p) => !p)}>
            {playing ? `⏸ ${d.pause}` : `▶ ${d.play}`}
          </button>
          <button type="button" onClick={() => { setStep(0); setPlaying(true); }}>↺ {d.replay}</button>
        </div>
      </div>

      <div className="efm-stage">
        <div className="efm-card" role="img" aria-label={d.steps[step]}>
          {/* STEP 0 — post */}
          {step === 0 && (
            <div className="efm-pane">
              <strong className="efm-pane-h">{d.postTitle}</strong>
              <div className="efm-field"><span>👤</span>{d.role}</div>
              <div className="efm-field"><span>🗓️</span>{d.when}</div>
              <div className="efm-cta">{d.post}</div>
            </div>
          )}
          {/* STEP 1 — matched */}
          {step === 1 && (
            <div className="efm-pane">
              <strong className="efm-pane-h">{d.matchTitle}</strong>
              <span className="efm-note">{d.matched(d.workers.length)}</span>
              {d.workers.map((w, i) => (
                <div className="efm-worker" key={w.name} style={{ animationDelay: `${i * 140}ms` }}>
                  <span className="efm-av">🧑‍🍳</span>
                  <span className="efm-wmeta"><b>{w.name}</b><em>{w.meta}</em></span>
                  <span className="efm-pct">{w.pct}</span>
                </div>
              ))}
            </div>
          )}
          {/* STEP 2 — confirm */}
          {step === 2 && (
            <div className="efm-pane">
              <strong className="efm-pane-h">{d.confirmTitle}</strong>
              <div className="efm-worker efm-sel">
                <span className="efm-av">🧑‍🍳</span>
                <span className="efm-wmeta"><b>{d.workers[0]?.name}</b><em>{d.scheduled}</em></span>
                <span className="efm-badge">{d.confirmed}</span>
              </div>
            </div>
          )}
          {/* STEP 3 — covered */}
          {step === 3 && (
            <div className="efm-pane efm-done">
              <span className="efm-check">✓</span>
              <strong className="efm-pane-h">{d.doneTitle}</strong>
              <span className="efm-note">{d.covered}</span>
              <span className="efm-note">{d.recorded}</span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

const CSS = `
.efm{max-width:1080px;margin:40px auto;padding:clamp(26px,4vw,40px) clamp(18px,3vw,36px);
  display:grid;grid-template-columns:1fr 1fr;gap:clamp(24px,4vw,44px);align-items:center;
  background:radial-gradient(640px 320px at 12% 0%,rgba(201,162,75,.18),transparent),linear-gradient(120deg,#0b0906,#16110a 60%,#000);
  border:1px solid rgba(201,162,75,.22);border-radius:24px;color:#f4efe4;}
.efm-eyebrow{font-size:12px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:#c9a24b;}
.efm-title{font-family:var(--font-serif,"Playfair Display",Georgia,serif);font-size:clamp(24px,3.2vw,34px);font-weight:800;line-height:1.12;letter-spacing:-.01em;margin:12px 0 10px;color:#fbf7ee;text-wrap:balance;}
.efm-sub{color:#cabfa8;font-size:clamp(14px,1.5vw,16px);line-height:1.6;margin:0 0 18px;max-width:46ch;}
.efm-steps{list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:10px;}
.efm-steps li{display:flex;align-items:center;gap:10px;font-weight:700;font-size:14.5px;color:#8a8070;transition:color .3s;}
.efm-steps li.on{color:#fbf7ee;} .efm-steps li.done{color:#b3a894;}
.efm-n{width:26px;height:26px;flex:none;border-radius:999px;display:grid;place-items:center;font-size:12px;font-weight:800;
  background:rgba(201,162,75,.14);border:1px solid rgba(201,162,75,.3);color:#c9a24b;transition:all .3s;}
.efm-steps li.on .efm-n{background:#c9a24b;color:#000;border-color:#c9a24b;}
.efm-steps li.done .efm-n{background:rgba(201,162,75,.2);color:#c9a24b;}
.efm-controls{display:flex;gap:10px;margin-top:18px;}
.efm-controls button{background:rgba(201,162,75,.1);border:1px solid rgba(201,162,75,.3);color:#f4efe4;font-weight:700;font-size:13px;border-radius:999px;padding:7px 14px;cursor:pointer;}
.efm-controls button:hover{background:rgba(201,162,75,.18);}
.efm-stage{display:flex;justify-content:center;}
.efm-card{width:min(100%,340px);min-height:260px;background:#0c0c0c;border:1px solid rgba(201,162,75,.22);border-radius:18px;
  box-shadow:0 30px 70px -40px rgba(0,0,0,.9);padding:18px;display:flex;}
.efm-pane{display:flex;flex-direction:column;gap:10px;width:100%;animation:efm-in .4s ease both;}
@keyframes efm-in{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:none;}}
.efm-pane-h{font-family:var(--font-serif,"Playfair Display",Georgia,serif);font-size:17px;font-weight:800;color:#fbf7ee;}
.efm-note{color:#b3a894;font-size:12.5px;}
.efm-field{display:flex;align-items:center;gap:10px;background:#141210;border:1px solid rgba(201,162,75,.16);border-radius:10px;padding:11px 12px;font-size:13.5px;color:#f4efe4;}
.efm-field span{opacity:.8;}
.efm-cta{margin-top:4px;text-align:center;background:#c9a24b;color:#000;font-weight:800;font-size:13.5px;border-radius:10px;padding:11px;}
.efm-worker{display:flex;align-items:center;gap:10px;background:#141210;border:1px solid rgba(201,162,75,.16);border-radius:12px;padding:10px 12px;animation:efm-in .4s ease both;}
.efm-worker.efm-sel{border-color:rgba(201,162,75,.5);box-shadow:0 0 0 1px rgba(201,162,75,.3) inset;}
.efm-av{width:34px;height:34px;flex:none;border-radius:9px;background:#1a1510;display:grid;place-items:center;font-size:17px;}
.efm-wmeta{display:flex;flex-direction:column;min-width:0;flex:1;}
.efm-wmeta b{font-size:13.5px;color:#f4efe4;} .efm-wmeta em{font-style:normal;color:#b3a894;font-size:12px;}
.efm-pct{font-weight:800;font-size:13px;color:#c9a24b;flex:none;}
.efm-badge{flex:none;background:rgba(53,224,138,.14);color:#4fe3a0;border:1px solid rgba(53,224,138,.3);font-size:11px;font-weight:800;padding:3px 9px;border-radius:999px;}
.efm-done{align-items:center;text-align:center;justify-content:center;gap:8px;}
.efm-check{width:56px;height:56px;border-radius:999px;display:grid;place-items:center;font-size:28px;font-weight:800;background:#c9a24b;color:#000;}
@media (max-width:860px){ .efm{grid-template-columns:1fr;} .efm-stage{order:-1;} }
`;
