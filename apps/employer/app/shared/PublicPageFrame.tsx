import type { ReactNode } from "react";
import { pricingCopy } from "../pricing/pricingContent";
import { PublicFooter, PublicHeader, publicStyles as s, readPublicLocale } from "../pricing/publicPageStyles";

/**
 * Frame for signed-out pages (/signin, /signup/employer): the public header and footer, never the
 * signed-in workspace menu or the "Secure workspace" note.
 */
export async function PublicPageFrame({
  current,
  eyebrow,
  title,
  lede,
  children
}: {
  current: string;
  eyebrow: string;
  title: string;
  lede: string;
  children: ReactNode;
}) {
  const nav = pricingCopy[await readPublicLocale()].nav;
  return (
    <main style={s.page}>
      <PublicHeader nav={nav} current={current} />
      <section style={s.hero}>
        <p style={s.eyebrow}>{eyebrow}</p>
        <h1 style={s.title}>{title}</h1>
        <p style={s.lede}>{lede}</p>
      </section>
      {children}
      <PublicFooter nav={nav} />
    </main>
  );
}
