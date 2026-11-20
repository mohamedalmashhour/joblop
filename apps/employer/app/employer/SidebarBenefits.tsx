"use client";
/** @jsxRuntime automatic */
// (pragma: lets vitest render this component; Next.js already uses the automatic runtime)

import { useEffect, useState, type CSSProperties, type KeyboardEvent } from "react";
import { useLocale, useT, type Translate } from "../i18n/LocaleProvider";
import { localeDir } from "../i18n/config";
import type { MessageKey } from "../i18n/messages";

// Decorative benefits card that fills the empty part of the employer sidebar (desktop only; hidden
// on phones by the .employer-sidebar-benefits rule in globals.css). Text only — it never shows
// worker pay or the platform margin.

export const REQUEST_WORKERS_ROUTE = "/employer/calendar/create";
export const CONTACT_JOBLOP_ROUTE = "/employer/contact-joblop";
export const BENEFIT_ROTATE_MS = 5000;

export const SIDEBAR_BENEFITS: readonly {
  id: string;
  titleKey: MessageKey;
  textKey: MessageKey;
  href?: string;
}[] = [
  { id: "checked", titleKey: "shell.benefits.checked.title", textKey: "shell.benefits.checked.text" },
  { id: "price", titleKey: "shell.benefits.price.title", textKey: "shell.benefits.price.text" },
  { id: "invoice", titleKey: "shell.benefits.invoice.title", textKey: "shell.benefits.invoice.text" },
  {
    id: "help",
    titleKey: "shell.benefits.help.title",
    textKey: "shell.benefits.help.text",
    href: CONTACT_JOBLOP_ROUTE
  }
];

const gold = "#F8B808";
const cream = "#f4efe4";

export function SidebarBenefits() {
  const t = useT();
  const dir = localeDir(useLocale());
  const [active, setActive] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const query = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!query) return;
    const update = () => setReducedMotion(query.matches);
    update();
    query.addEventListener?.("change", update);
    return () => query.removeEventListener?.("change", update);
  }, []);

  const paused = hovered || focused;
  useEffect(() => {
    if (reducedMotion || paused) return;
    const timer = window.setInterval(
      () => setActive((index) => (index + 1) % SIDEBAR_BENEFITS.length),
      BENEFIT_ROTATE_MS
    );
    return () => window.clearInterval(timer);
  }, [reducedMotion, paused]);

  return (
    <SidebarBenefitsView
      active={active}
      dir={dir}
      onBlur={() => setFocused(false)}
      onFocus={() => setFocused(true)}
      onHoverChange={setHovered}
      onSelect={setActive}
      paused={paused}
      reducedMotion={reducedMotion}
      t={t}
    />
  );
}

export function SidebarBenefitsView({
  active = 0,
  dir = "ltr",
  onBlur,
  onFocus,
  onHoverChange,
  onSelect,
  paused = false,
  reducedMotion,
  t
}: Readonly<{
  active?: number;
  dir?: "ltr" | "rtl";
  onBlur?: () => void;
  onFocus?: () => void;
  onHoverChange?: (hovered: boolean) => void;
  onSelect?: (index: number) => void;
  paused?: boolean;
  reducedMotion: boolean;
  t: Translate;
}>) {
  const total = SIDEBAR_BENEFITS.length;
  const current = ((active % total) + total) % total;

  function handleDotKey(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const forward = dir === "rtl" ? "ArrowLeft" : "ArrowRight";
    const backward = dir === "rtl" ? "ArrowRight" : "ArrowLeft";
    let next: number | null = null;
    if (event.key === forward) next = (index + 1) % total;
    else if (event.key === backward) next = (index - 1 + total) % total;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = total - 1;
    if (next === null) return;
    event.preventDefault();
    onSelect?.(next);
    const group = event.currentTarget.parentElement;
    group?.querySelectorAll<HTMLButtonElement>("button")[next]?.focus();
  }

  return (
    <section
      aria-label={t("shell.benefits.label")}
      className="employer-sidebar-benefits"
      data-reduced-motion={reducedMotion ? "true" : "false"}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) onBlur?.();
      }}
      onFocus={onFocus}
      onMouseEnter={() => onHoverChange?.(true)}
      onMouseLeave={() => onHoverChange?.(false)}
      style={card}
    >
      <BenefitsIllustration />
      {reducedMotion ? (
        <ul style={list}>
          {SIDEBAR_BENEFITS.map((benefit) => (
            <li data-benefit={benefit.id} key={benefit.id} style={item}>
              <BenefitBody benefit={benefit} t={t} />
            </li>
          ))}
        </ul>
      ) : (
        <>
          <div aria-live={paused ? "polite" : "off"} style={slides}>
            {SIDEBAR_BENEFITS.map((benefit, index) => (
              <div
                data-benefit={benefit.id}
                hidden={index !== current}
                key={benefit.id}
                // Inline display would override the [hidden] UA rule, so hide explicitly too.
                style={index === current ? item : hiddenItem}
              >
                <BenefitBody benefit={benefit} t={t} />
              </div>
            ))}
          </div>
          <div style={dots}>
            {SIDEBAR_BENEFITS.map((benefit, index) => (
              <button
                aria-label={t("shell.benefits.dot", { num: index + 1, total })}
                aria-pressed={index === current}
                key={benefit.id}
                onClick={() => onSelect?.(index)}
                onKeyDown={(event) => handleDotKey(event, index)}
                style={dotButton}
                type="button"
              >
                <span aria-hidden="true" style={index === current ? dotActive : dot} />
              </button>
            ))}
          </div>
        </>
      )}
      <a className="employer-sidebar-benefits-cta" href={REQUEST_WORKERS_ROUTE} style={cta}>
        {t("shell.nav.request")}
      </a>
    </section>
  );
}

function BenefitBody({
  benefit,
  t
}: Readonly<{ benefit: (typeof SIDEBAR_BENEFITS)[number]; t: Translate }>) {
  return (
    <>
      <strong style={itemTitle}>{t(benefit.titleKey)}</strong>
      {benefit.href ? (
        <a href={benefit.href} style={itemLink}>
          {t(benefit.textKey)}
        </a>
      ) : (
        <span style={itemText}>{t(benefit.textKey)}</span>
      )}
    </>
  );
}

// Abstract team + calendar + check scene in brand colours. Decorative only.
function BenefitsIllustration() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      style={{ display: "block", height: "auto", width: "100%" }}
      viewBox="0 0 240 120"
    >
      <rect fill="#000" height="120" rx="12" width="240" />
      <circle cx="162" cy="62" fill={gold} opacity=".12" r="46" />
      <g fill="none" stroke={cream} strokeLinecap="round" strokeWidth="2.5">
        <rect height="62" rx="7" width="76" x="124" y="30" />
        <path d="M124 46h76M142 24v12M182 24v12" />
      </g>
      <g fill={cream} opacity=".55">
        <rect height="7" rx="2" width="10" x="134" y="54" />
        <rect height="7" rx="2" width="10" x="151" y="54" />
        <rect height="7" rx="2" width="10" x="134" y="70" />
        <rect height="7" rx="2" width="10" x="168" y="70" />
      </g>
      <circle cx="198" cy="84" fill={gold} r="17" />
      <path d="M190 84l6 6 11-12" fill="none" stroke="#000" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3.5" />
      <g fill={gold}>
        <circle cx="58" cy="46" r="11" />
        <path d="M36 90c0-14 10-24 22-24s22 10 22 24z" />
      </g>
      <g fill="none" stroke={cream} strokeWidth="2.5">
        <circle cx="30" cy="56" r="8" />
        <path d="M14 92c0-11 7-19 16-19s16 8 16 19" strokeLinecap="round" />
        <circle cx="88" cy="56" r="8" />
        <path d="M72 92c0-11 7-19 16-19s16 8 16 19" strokeLinecap="round" />
      </g>
      <path d="M14 100h92" stroke={gold} strokeLinecap="round" strokeWidth="2" opacity=".6" />
    </svg>
  );
}

const card: CSSProperties = {
  alignSelf: "start",
  background: "#000000",
  border: "1px solid rgba(248, 184, 8, 0.28)",
  borderRadius: 10,
  color: cream,
  display: "grid",
  gap: 12,
  padding: 12,
  textAlign: "start"
};
const list: CSSProperties = { display: "grid", gap: 10, listStyle: "none", margin: 0, padding: 0 };
const slides: CSSProperties = { minHeight: 64 };
const item: CSSProperties = { display: "grid", gap: 4 };
const hiddenItem: CSSProperties = { display: "none" };
const itemTitle: CSSProperties = { color: gold, fontSize: 14, fontWeight: 800 };
const itemText: CSSProperties = { color: cream, fontSize: 13, lineHeight: 1.45 };
const itemLink: CSSProperties = { ...itemText, textDecoration: "underline", textUnderlineOffset: 3 };
const dots: CSSProperties = { display: "flex", gap: 2, justifyContent: "center" };
const dotButton: CSSProperties = {
  alignItems: "center",
  background: "transparent",
  border: 0,
  cursor: "pointer",
  display: "inline-flex",
  height: 24,
  justifyContent: "center",
  padding: 0,
  width: 24
};
const dot: CSSProperties = {
  background: "rgba(244, 239, 228, 0.35)",
  borderRadius: 999,
  display: "block",
  height: 8,
  width: 8
};
const dotActive: CSSProperties = { ...dot, background: gold, width: 18 };
const cta: CSSProperties = {
  alignItems: "center",
  background: gold,
  borderRadius: 8,
  color: "#000000",
  display: "flex",
  fontSize: 15,
  fontWeight: 800,
  justifyContent: "center",
  minHeight: 44,
  padding: "0 16px",
  textDecoration: "none"
};
