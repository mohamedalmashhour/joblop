"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale } from "../i18n/LocaleProvider";

// Two short in-app animated explainers — "How Joblop works" and "Meet JobScanner".
// Pure CSS/JS motion; follows the site language (Bill 96). No external assets.

type Scene = {
  chip: string;
  title: string;
  body: string;
  art: string;
  big?: string;
  flow?: ReadonlyArray<readonly [string, string]>;
};

const SCENE_MS = 5200;

const FILMS: Record<"en" | "fr", ReadonlyArray<ReadonlyArray<Scene>>> = {
  en: [
    [
      { chip: "Joblop", title: "Staffing that runs itself", body: "From a job request to money in the worker's account — every step tracked, nothing lost.", art: "🧭" },
      { chip: "Step 1 · Employer", title: "The employer posts a job", body: "Role, date, how many workers, where. It lands as a request on their calendar.", art: "📝", flow: [["Request", "#e8a13a"]] },
      { chip: "Step 2 · Admin", title: "Joblop reviews & prices it", body: "An admin checks the request and sets the governed rate. No job goes out unpriced.", art: "✅", flow: [["Request", "#e8a13a"], ["Approved", "#9a7122"], ["Priced", "#b8862f"]] },
      { chip: "Step 3 · Worker", title: "A worker gets the offer — and accepts", body: "The right worker is matched, sees the shift, signs their classification, and accepts.", art: "🤝", flow: [["Offer sent", "#b8862f"], ["Accepted", "#9a7122"]] },
      { chip: "Step 4 · In sync", title: "Everyone's calendar updates at once", body: "Employer sees “accepted”. Admin sees who is on it. Finance sees when payment is due.", art: "📅", flow: [["Employer", "#e8a13a"], ["Admin", "#b8862f"], ["Finance", "#9a7122"]] },
      { chip: "Step 5 · The shift", title: "Work happens, check-in to check-out", body: "The worker checks in and out. When it's done, all three sides see the job close.", art: "⏱️", flow: [["Check-in", "#9a7122"], ["Check-out", "#9a7122"], ["Finished", "#b8862f"]] },
      { chip: "Step 6 · Review", title: "48-hour review window", body: "After the shift, the amount is held 48h in case the client raises anything — the worker isn't told it's theirs yet.", art: "🛡️", flow: [["Finished", "#b8862f"], ["48h review", "#e8a13a"]] },
      { chip: "Step 7 · Registered", title: "Then it's registered in the worker's account", body: "No dispute in 48h? The amount is confirmed and the worker is notified it's now in their account.", art: "💰", flow: [["Registered", "#9a7122"], ["Worker notified", "#b8862f"]] },
      { chip: "Step 8 · Paid", title: "Paid out on the 14-day cycle", body: "Finance invoices the employer's card; the worker is paid on the regular cycle, confirmed with Stripe.", art: "💳", flow: [["Invoice", "#e8a13a"], ["14-day cycle", "#b8862f"], ["Paid", "#9a7122"]] },
      { chip: "Done", title: "One flow. Three sides. Zero guesswork.", body: "That's Joblop — governed staffing from request to payout.", art: "🎉" }
    ],
    [
      { chip: "JobScanner", title: "The Skyscanner for jobs", body: "One search across trusted job feeds — so you see every local opening in one place.", art: "🛰️" },
      { chip: "How", title: "We scan partner feeds — the right way", body: "JobScanner pulls from licensed partners like Adzuna. Partner feeds only, never scraping.", art: "🔗", flow: [["Partner feeds", "#b8862f"], ["No scraping", "#9a7122"]] },
      { chip: "Now live", title: "Real local jobs, today", body: "Cooks, kitchen supervisors, food service, childcare and more — real openings near you.", art: "📍", big: "85" },
      { chip: "Search", title: "Type your trade — see only your trade", body: "Search “cook” and you get cook jobs. Smart matching keeps the noise out.", art: "🔎", flow: [["Search “cook”", "#e8a13a"], ["Only relevant", "#9a7122"]] },
      { chip: "Apply", title: "Build a CV, apply with help", body: "An AI wizard builds your CV, then Assisted Apply helps you apply — never silently, always you in control.", art: "📄", flow: [["AI CV", "#b8862f"], ["Assisted Apply", "#9a7122"]] },
      { chip: "Join", title: "Open an account, catch every job", body: "Sign up free, track openings, and be first when the right shift appears.", art: "🚀" }
    ]
  ],
  fr: [
    [
      { chip: "Joblop", title: "Le recrutement qui se gère tout seul", body: "De la demande d'emploi à l'argent versé au travailleur — chaque étape suivie, rien de perdu.", art: "🧭" },
      { chip: "Étape 1 · Employeur", title: "L'employeur publie un emploi", body: "Poste, date, nombre de travailleurs, lieu. Ça arrive comme demande dans son calendrier.", art: "📝", flow: [["Demande", "#e8a13a"]] },
      { chip: "Étape 2 · Admin", title: "Joblop vérifie et fixe le tarif", body: "Un admin vérifie la demande et fixe le tarif encadré. Aucun emploi ne part sans tarif.", art: "✅", flow: [["Demande", "#e8a13a"], ["Approuvé", "#9a7122"], ["Tarifé", "#b8862f"]] },
      { chip: "Étape 3 · Travailleur", title: "Un travailleur reçoit l'offre — et accepte", body: "Le bon travailleur est jumelé, voit le quart, signe son statut et accepte.", art: "🤝", flow: [["Offre envoyée", "#b8862f"], ["Acceptée", "#9a7122"]] },
      { chip: "Étape 4 · Synchro", title: "Tous les calendriers se mettent à jour", body: "L'employeur voit « accepté ». L'admin voit qui travaille. La finance voit quand payer.", art: "📅", flow: [["Employeur", "#e8a13a"], ["Admin", "#b8862f"], ["Finance", "#9a7122"]] },
      { chip: "Étape 5 · Le quart", title: "Le travail se fait, de l'arrivée au départ", body: "Le travailleur pointe à l'arrivée et au départ. Une fois fini, les trois côtés voient l'emploi se clôturer.", art: "⏱️", flow: [["Arrivée", "#9a7122"], ["Départ", "#9a7122"], ["Terminé", "#b8862f"]] },
      { chip: "Étape 6 · Révision", title: "Fenêtre de révision de 48 heures", body: "Après le quart, le montant est retenu 48 h au cas où le client signale un problème — le travailleur n'est pas encore informé.", art: "🛡️", flow: [["Terminé", "#b8862f"], ["Révision 48 h", "#e8a13a"]] },
      { chip: "Étape 7 · Enregistré", title: "Puis enregistré dans le compte du travailleur", body: "Aucun litige en 48 h ? Le montant est confirmé et le travailleur est avisé qu'il est maintenant dans son compte.", art: "💰", flow: [["Enregistré", "#9a7122"], ["Travailleur avisé", "#b8862f"]] },
      { chip: "Étape 8 · Payé", title: "Versé selon le cycle de 14 jours", body: "La finance facture la carte de l'employeur ; le travailleur est payé au cycle régulier, confirmé via Stripe.", art: "💳", flow: [["Facture", "#e8a13a"], ["Cycle 14 j", "#b8862f"], ["Payé", "#9a7122"]] },
      { chip: "Terminé", title: "Un flux. Trois côtés. Aucune incertitude.", body: "Voilà Joblop — un recrutement encadré, de la demande au versement.", art: "🎉" }
    ],
    [
      { chip: "JobScanner", title: "Le Skyscanner de l'emploi", body: "Une seule recherche sur des fils d'emploi fiables — vous voyez tous les postes locaux au même endroit.", art: "🛰️" },
      { chip: "Comment", title: "On balaie les fils partenaires — correctement", body: "JobScanner puise chez des partenaires licenciés comme Adzuna. Fils partenaires seulement, jamais de scraping.", art: "🔗", flow: [["Fils partenaires", "#b8862f"], ["Sans scraping", "#9a7122"]] },
      { chip: "En ligne", title: "De vrais emplois locaux, aujourd'hui", body: "Cuisiniers, superviseurs, service alimentaire, garde d'enfants et plus — de vrais postes près de vous.", art: "📍", big: "85" },
      { chip: "Recherche", title: "Tapez votre métier — ne voyez que votre métier", body: "Cherchez « cuisinier » et vous obtenez des emplois de cuisinier. Le jumelage évite le bruit.", art: "🔎", flow: [["Recherche « cuisinier »", "#e8a13a"], ["Pertinent seulement", "#9a7122"]] },
      { chip: "Postuler", title: "Créez un CV, postulez avec de l'aide", body: "Un assistant IA crée votre CV, puis Assisted Apply vous aide à postuler — jamais en silence, toujours vous aux commandes.", art: "📄", flow: [["CV par IA", "#b8862f"], ["Assisted Apply", "#9a7122"]] },
      { chip: "Rejoindre", title: "Ouvrez un compte, ne ratez aucun emploi", body: "Inscrivez-vous gratuitement, suivez les postes et soyez le premier au bon quart.", art: "🚀" }
    ]
  ]
};

const COPY = {
  en: { h1: "How Joblop works", sub: "Two short explainers — the platform, and JobScanner.", tab0: "How Joblop works", tab1: "Meet JobScanner", pause: "Pause", play: "Play", back: "Back", next: "Next", replay: "Replay", cta: "Create your free account" },
  fr: { h1: "Comment fonctionne Joblop", sub: "Deux courts explicatifs — la plateforme, et JobScanner.", tab0: "Comment ça marche", tab1: "Découvrez JobScanner", pause: "Pause", play: "Lecture", back: "Retour", next: "Suivant", replay: "Rejouer", cta: "Créez votre compte gratuit" }
};

export function HowItWorks() {
  const locale = useLocale();
  const lang: "en" | "fr" = locale.startsWith("fr") ? "fr" : "en";
  const c = COPY[lang];
  const [film, setFilm] = useState(0);
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const raf = useRef<number | null>(null);
  const started = useRef(0);

  const scenes = FILMS[lang][film] ?? FILMS[lang][0] ?? [];
  const count = scenes.length || 1;

  const stop = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    if (raf.current) cancelAnimationFrame(raf.current);
    timer.current = null;
    raf.current = null;
  }, []);

  useEffect(() => {
    stop();
    if (!playing) return;
    started.current = performance.now();
    setProgress(0);
    const loop = () => {
      const p = Math.min(1, (performance.now() - started.current) / SCENE_MS);
      setProgress(p);
      if (p < 1) raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
    timer.current = setTimeout(() => {
      setIdx((i) => (i + 1) % count);
    }, SCENE_MS);
    return stop;
  }, [playing, idx, film, lang, count, stop]);

  // reset to first scene when the film or language changes
  useEffect(() => { setIdx(0); setPlaying(true); }, [film, lang]);

  const go = (i: number) => { setIdx(((i % count) + count) % count); setPlaying(true); };

  return (
    <div className="hiw">
      <style>{`
        .hiw{max-width:900px;margin:0 auto;padding:22px 16px 48px}
        .hiw h1{font-size:clamp(24px,4vw,34px);letter-spacing:-.02em;margin:0 0 4px}
        .hiw .sub{color:var(--muted,#6b6356);margin:0 0 18px;font-size:15px}
        .hiw .tabs{display:flex;gap:10px;margin-bottom:14px;flex-wrap:wrap}
        .hiw .tab{flex:1;min-width:200px;text-align:left;border:1px solid var(--border,#dce7e3);
          background:var(--card,#fff);border-radius:14px;padding:12px 15px;cursor:pointer;display:flex;gap:12px;
          align-items:center;color:inherit;font:inherit;transition:border-color .2s,transform .15s}
        .hiw .tab:hover{transform:translateY(-1px)}
        .hiw .tab[aria-pressed="true"]{border-color:#a8842f;box-shadow:0 0 0 2px rgba(11,122,111,.18)}
        .hiw .tab .ic{width:40px;height:40px;border-radius:11px;flex:none;display:grid;place-items:center;
          background:rgba(11,122,111,.1);font-size:21px}
        .hiw .tab b{display:block;font-size:14.5px;font-weight:800}
        .hiw .stage{position:relative;border-radius:18px;overflow:hidden;aspect-ratio:16/10;
          background:linear-gradient(160deg,#1b160e,#15110b);color:#faf6ec;box-shadow:0 18px 50px rgba(6,40,36,.18)}
        @media(max-width:560px){.hiw .stage{aspect-ratio:4/5}}
        .hiw .scene{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:center;
          padding:clamp(20px,5vw,46px)}
        .hiw .chip{align-self:flex-start;font-size:11.5px;font-weight:800;letter-spacing:.09em;text-transform:uppercase;
          color:#e3d7c0;border:1px solid rgba(159,202,191,.3);border-radius:999px;padding:5px 11px;margin-bottom:14px}
        .hiw .scene h2{margin:0 0 10px;font-size:clamp(21px,4.2vw,36px);line-height:1.1;letter-spacing:-.02em;
          font-weight:800;max-width:17ch}
        .hiw .scene p{margin:0;font-size:clamp(14px,2.2vw,18px);line-height:1.5;color:#f6efdd;max-width:40ch}
        .hiw .big{font-size:clamp(46px,13vw,110px);font-weight:900;letter-spacing:-.04em;line-height:1;
          background:linear-gradient(120deg,#fff,#f0d089);-webkit-background-clip:text;background-clip:text;color:transparent}
        .hiw .art{position:absolute;right:clamp(14px,4vw,40px);top:50%;transform:translateY(-50%);
          font-size:clamp(70px,20vw,140px);opacity:.96}
        @media(max-width:560px){.hiw .art{position:static;transform:none;font-size:clamp(60px,18vw,110px);margin-bottom:14px;align-self:flex-start}
          .hiw .scene{justify-content:flex-start;padding-top:28px}}
        .hiw .flow{display:flex;gap:9px;flex-wrap:wrap;margin-top:18px}
        .hiw .node{display:flex;align-items:center;gap:7px;background:rgba(255,255,255,.07);
          border:1px solid rgba(255,255,255,.12);border-radius:11px;padding:8px 12px;font-size:12.5px;font-weight:700}
        .hiw .node .r{width:8px;height:8px;border-radius:50%}
        .hiw .bar{height:4px;background:rgba(255,255,255,.12);position:absolute;left:0;right:0;bottom:0}
        .hiw .bar i{display:block;height:100%;background:#a8842f}
        .hiw .ctl{display:flex;align-items:center;gap:10px;margin-top:14px;flex-wrap:wrap}
        .hiw .ctl button{border:1px solid var(--border,#dce7e3);background:var(--card,#fff);color:inherit;font:inherit;
          font-weight:700;border-radius:10px;padding:9px 14px;cursor:pointer;font-size:13px}
        .hiw .ctl button.primary{background:#a8842f;border-color:#a8842f;color:#fff}
        .hiw .dots{display:flex;gap:7px;margin-left:auto}
        .hiw .dots i{width:9px;height:9px;border-radius:50%;background:var(--border,#dce7e3);cursor:pointer;transition:all .2s}
        .hiw .dots i.on{background:#a8842f;transform:scale(1.3)}
        .hiw .cta{margin-top:22px;text-align:center}
        .hiw .cta a{display:inline-block;background:#a8842f;color:#fff;text-decoration:none;font-weight:800;
          padding:13px 24px;border-radius:12px;font-size:15px}
      `}</style>

      <h1>{c.h1}</h1>
      <p className="sub">{c.sub}</p>

      <div className="tabs" role="group">
        <button className="tab" aria-pressed={film === 0} onClick={() => setFilm(0)}>
          <span className="ic">🧭</span><span><b>{c.tab0}</b></span>
        </button>
        <button className="tab" aria-pressed={film === 1} onClick={() => setFilm(1)}>
          <span className="ic">🛰️</span><span><b>{c.tab1}</b></span>
        </button>
      </div>

      <div className="stage" aria-live="polite">
        {(() => {
          const s = scenes[idx] ?? scenes[0];
          if (!s) return null;
          return (
            <div className="scene" key={`${film}-${idx}-${lang}`}>
              <span className="chip">{s.chip}</span>
              {s.big ? <div className="big">{s.big}</div> : null}
              <h2>{s.title}</h2>
              <p>{s.body}</p>
              {s.flow ? (
                <div className="flow">
                  {s.flow.map((f) => (
                    <span className="node" key={f[0]}><span className="r" style={{ background: f[1] }} />{f[0]}</span>
                  ))}
                </div>
              ) : null}
              {!s.big ? <div className="art" aria-hidden>{s.art}</div> : null}
            </div>
          );
        })()}
        <div className="bar"><i style={{ width: `${progress * 100}%` }} /></div>
      </div>

      <div className="ctl">
        <button className="primary" onClick={() => setPlaying((p) => !p)}>{playing ? `⏸ ${c.pause}` : `▶ ${c.play}`}</button>
        <button onClick={() => go(idx - 1)}>◀ {c.back}</button>
        <button onClick={() => go(idx + 1)}>{c.next} ▶</button>
        <button onClick={() => go(0)}>↺ {c.replay}</button>
        <div className="dots">
          {scenes.map((_, i) => (
            <i key={i} className={i === idx ? "on" : ""} onClick={() => go(i)} />
          ))}
        </div>
      </div>

      <div className="cta"><a href="/">{c.cta}</a></div>
    </div>
  );
}
