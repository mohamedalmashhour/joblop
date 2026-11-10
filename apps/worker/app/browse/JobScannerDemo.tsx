"use client";

import { useEffect, useState } from "react";
import { JOB_SCANNER_DEMO } from "@rwos/shared";

// A short, auto-playing marketing "movie" (CSS/JS motion graphic — no video asset): a phone frame
// looping through how a worker scans for jobs — search once → JobScanner scans the market → ranked
// matches → apply free. Loops forever; pauses when off-screen isn't needed (it's cheap). Bilingual.

// The words live in @rwos/shared so the phone app plays the same demo with the same EN/FR/AR words.
type Lang = "en" | "fr" | "ar";

const DEMO = JOB_SCANNER_DEMO;

export function JobScannerDemo({ lang = "en" }: { lang?: Lang }) {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(true);
  const d = DEMO[lang];

  useEffect(() => {
    if (!playing) return;
    const durations = [2000, 2600, 2600, 2400]; // per-step dwell
    const id = setTimeout(() => setStep((s) => (s + 1) % 4), durations[step]);
    return () => clearTimeout(id);
  }, [step, playing]);

  return (
    <div className="jsd">
      <style>{CSS}</style>
      <div className="jsd-phone">
        <div className="jsd-notch" />
        <div className="jsd-screen">
          <div className="jsd-bar"><span className="jsd-dot" /> JobScanner</div>

          {/* STEP 0 — search */}
          <div className={`jsd-stage ${step === 0 ? "on" : ""}`} aria-hidden={step !== 0}>
            <div className="jsd-search"><span>🔎</span><span className="jsd-typed">{d.typed}<i className="jsd-caret" /></span></div>
            <div className="jsd-hint">{d.steps[0]}</div>
          </div>

          {/* STEP 1 — scan */}
          <div className={`jsd-stage ${step === 1 ? "on" : ""}`} aria-hidden={step !== 1}>
            <div className="jsd-radar"><span className="jsd-sweep" /><span className="jsd-ping jsd-p1" /><span className="jsd-ping jsd-p2" /><span className="jsd-ping jsd-p3" /></div>
            <div className="jsd-chips">{d.chips.map((c, i) => <span key={c} style={{ animationDelay: `${i * 0.2}s` }}>{c}</span>)}</div>
            <div className="jsd-hint">{d.scanning}</div>
          </div>

          {/* STEP 2 — ranked results */}
          <div className={`jsd-stage ${step === 2 ? "on" : ""}`} aria-hidden={step !== 2}>
            <div className="jsd-rank">{d.ranked}</div>
            {d.jobs.map((j, i) => (
              <div key={i} className="jsd-card" style={{ animationDelay: `${i * 0.18}s` }}>
                <span className="jsd-ic">🩺</span>
                <span className="jsd-cmain"><strong>{j.role}</strong><em>{j.area}</em></span>
                {j.urgent ? <span className="jsd-u">{d.urgent}</span> : null}
                <span className="jsd-pay">{j.pay}</span>
              </div>
            ))}
          </div>

          {/* STEP 3 — apply */}
          <div className={`jsd-stage ${step === 3 ? "on" : ""}`} aria-hidden={step !== 3}>
            <div className="jsd-card jsd-card-top">
              <span className="jsd-ic">🩺</span>
              <span className="jsd-cmain"><strong>{d.jobs[0].role}</strong><em>{d.jobs[0].area}</em></span>
              <span className="jsd-pay">{d.jobs[0].pay}</span>
            </div>
            <div className="jsd-applybtn">{d.apply}<span className="jsd-tap" /></div>
            <div className="jsd-applied">{d.applied}</div>
          </div>
        </div>
      </div>
      <div className="jsd-steps">
        {d.steps.map((s, i) => (
          <button key={i} className={`jsd-step ${step === i ? "on" : ""} ${step > i ? "done" : ""}`} onClick={() => { setStep(i); setPlaying(false); }}>
            <span className="jsd-num">{step > i ? "✓" : i + 1}</span>{s}
          </button>
        ))}
      </div>
      <div className="jsd-controls">
        <button className="jsd-ctl jsd-ctl-main" onClick={() => setPlaying((p) => !p)} aria-label={playing ? d.pause : d.watch}>
          {playing ? `⏸ ${d.pause}` : `▶ ${d.watch}`}
        </button>
        <button className="jsd-ctl" onClick={() => { setStep(0); setPlaying(true); }} aria-label={d.replay}>↻ {d.replay}</button>
      </div>
    </div>
  );
}

const CSS = `
.jsd{display:flex;flex-direction:column;align-items:center;gap:20px;}
.jsd-phone{position:relative;width:248px;height:430px;background:#15110b;border-radius:34px;padding:10px;box-shadow:0 36px 80px -34px rgba(0,0,0,.6),inset 0 0 0 2px rgba(255,255,255,.06);}
.jsd-notch{position:absolute;top:10px;left:50%;transform:translateX(-50%);width:84px;height:18px;background:#15110b;border-radius:0 0 12px 12px;z-index:3;}
.jsd-screen{position:relative;width:100%;height:100%;background:linear-gradient(180deg,#1b160e,#120e08);border-radius:26px;overflow:hidden;}
.jsd-bar{display:flex;align-items:center;gap:7px;color:#f0e2c0;font-weight:800;font-size:13px;padding:22px 16px 10px;}
.jsd-dot{width:7px;height:7px;border-radius:50%;background:#f8b808;box-shadow:0 0 10px #f8b808;}
.jsd-stage{position:absolute;inset:48px 0 0;padding:10px 16px;opacity:0;transform:translateY(10px);transition:opacity .4s,transform .4s;pointer-events:none;display:flex;flex-direction:column;}
.jsd-stage.on{opacity:1;transform:none;}
/* search */
.jsd-search{display:flex;align-items:center;gap:8px;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.14);border-radius:12px;padding:13px 14px;color:#fff;font-size:16px;margin-top:40px;}
.jsd-typed{position:relative;font-weight:700;}
.jsd-caret{display:inline-block;width:2px;height:16px;background:#f8b808;margin-left:2px;vertical-align:middle;animation:jsdblink 1s steps(1) infinite;}
@keyframes jsdblink{50%{opacity:0;}}
.jsd-hint{color:#cbb482;font-size:12.5px;text-align:center;margin-top:auto;padding-bottom:6px;}
/* radar */
.jsd-radar{position:relative;width:150px;height:150px;margin:18px auto 6px;border-radius:50%;background:radial-gradient(circle,rgba(240,217,160,.22),rgba(248, 184, 8,.05) 55%,transparent 72%),repeating-radial-gradient(circle,transparent 0 23px,rgba(224,195,110,.16) 23px 24px);box-shadow:inset 0 0 0 1px rgba(224,195,110,.5),0 0 26px rgba(248, 184, 8,.22);}
.jsd-radar::after{content:"";position:absolute;inset:0;border-radius:50%;background:linear-gradient(rgba(224,195,110,.22),rgba(224,195,110,.22)) center/1px 100% no-repeat,linear-gradient(rgba(224,195,110,.22),rgba(224,195,110,.22)) center/100% 1px no-repeat;}
.jsd-sweep{position:absolute;inset:0;border-radius:50%;background:conic-gradient(from 0deg,rgba(240,217,160,.6),rgba(240,217,160,.08) 35%,transparent 55%);animation:jsdspin 1.6s linear infinite;}
.jsd-sweep::before{content:"";position:absolute;top:50%;left:50%;width:50%;height:2px;transform-origin:left center;background:linear-gradient(90deg,rgba(245,224,160,.95),transparent);box-shadow:0 0 8px rgba(240,217,160,.7);}
@keyframes jsdspin{to{transform:rotate(360deg);}}
.jsd-ping{position:absolute;width:8px;height:8px;border-radius:50%;background:#f3dd9e;box-shadow:0 0 12px #f0d9a0,0 0 4px #fff6df;opacity:0;animation:jsdping 1.6s ease-out infinite;z-index:2;}
.jsd-p1{top:30%;left:60%;animation-delay:.2s;}
.jsd-p2{top:62%;left:38%;animation-delay:.7s;}
.jsd-p3{top:48%;left:70%;animation-delay:1.1s;}
@keyframes jsdping{0%{opacity:0;transform:scale(.4);}30%{opacity:1;}100%{opacity:0;transform:scale(1.4);}}
.jsd-chips{display:flex;flex-wrap:wrap;gap:6px;justify-content:center;margin:4px 0;}
.jsd-chips span{background:rgba(255,255,255,.1);color:#f0e2c0;font-size:11px;font-weight:700;padding:4px 9px;border-radius:999px;opacity:0;animation:jsdpop .5s ease forwards;}
@keyframes jsdpop{to{opacity:1;}}
/* results */
.jsd-rank{color:#f8b808;font-size:11px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;margin:38px 0 10px;}
.jsd-card{display:flex;align-items:center;gap:9px;background:#fff;border-radius:11px;padding:10px 11px;margin-bottom:8px;opacity:0;transform:translateY(8px);animation:jsdrise .5s ease forwards;}
@keyframes jsdrise{to{opacity:1;transform:none;}}
.jsd-ic{width:30px;height:30px;border-radius:8px;background:#f6efdd;display:grid;place-items:center;font-size:15px;flex:0 0 auto;}
.jsd-cmain{display:flex;flex-direction:column;flex:1;min-width:0;}
.jsd-cmain strong{font-size:13px;color:#171511;}
.jsd-cmain em{font-style:normal;font-size:11px;color:#6b6356;}
.jsd-u{background:#fdece5;color:#e8562a;font-size:9px;font-weight:800;padding:2px 6px;border-radius:999px;text-transform:uppercase;}
.jsd-pay{font-weight:800;font-size:13px;color:#e0a500;}
/* apply */
.jsd-card-top{margin-top:56px;}
.jsd-applybtn{position:relative;margin-top:14px;background:linear-gradient(90deg,#a8842f,#f8b808);color:#1a1406;font-weight:800;text-align:center;padding:13px;border-radius:12px;overflow:hidden;}
.jsd-tap{position:absolute;top:50%;left:50%;width:16px;height:16px;border-radius:50%;background:rgba(255,255,255,.7);transform:translate(-50%,-50%) scale(0);animation:jsdtap 2.4s ease-out infinite;}
@keyframes jsdtap{0%,60%{transform:translate(-50%,-50%) scale(0);opacity:.8;}80%{transform:translate(-50%,-50%) scale(9);opacity:0;}100%{opacity:0;}}
.jsd-applied{margin-top:12px;text-align:center;color:#58f0a8;font-weight:800;font-size:14px;opacity:0;animation:jsdfade .5s ease forwards;animation-delay:1.4s;}
@keyframes jsdfade{to{opacity:1;}}
/* step rail */
.jsd-steps{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;max-width:420px;}
.jsd-step{display:flex;align-items:center;gap:7px;font-size:12.5px;font-weight:700;color:#b3a894;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:999px;padding:6px 12px;transition:color .3s,border-color .3s;cursor:pointer;font-family:inherit;}
.jsd-step:hover{border-color:rgba(248, 184, 8,.5);}
.jsd-step.on{color:#fff;border-color:#f8b808;}
.jsd-step.done{color:#58f0a8;}
.jsd-num{width:18px;height:18px;border-radius:50%;background:rgba(255,255,255,.12);display:grid;place-items:center;font-size:11px;font-weight:800;}
.jsd-step.on .jsd-num{background:#f8b808;color:#000;}
.jsd-step.done .jsd-num{background:#1fbf6b;color:#06220f;}
.jsd-controls{display:flex;gap:10px;flex-wrap:wrap;justify-content:center;}
.jsd-ctl{font-family:inherit;cursor:pointer;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.06);color:#f0e2c0;font-weight:700;font-size:13px;padding:9px 16px;border-radius:999px;transition:background .2s,border-color .2s;}
.jsd-ctl:hover{background:rgba(255,255,255,.12);border-color:rgba(248, 184, 8,.5);}
.jsd-ctl-main{background:linear-gradient(90deg,#a8842f,#f8b808);color:#1a1406;border:0;font-weight:800;}
.jsd-ctl-main:hover{filter:brightness(1.08);background:linear-gradient(90deg,#a8842f,#f8b808);}
`;
