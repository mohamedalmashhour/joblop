import type { CSSProperties } from "react";
import { PublicFooter, PublicHeader, publicStyles as s, readPublicLocale } from "../pricing/publicPageStyles";
import { faqCopy, faqIds } from "./faqContent";

export default async function FAQPage() {
  const c = faqCopy[await readPublicLocale()];
  return (
    <main style={s.page}>
      <PublicHeader nav={c.nav} current="/faq" />

      <section style={s.hero}>
        <p style={s.eyebrow}>{c.eyebrow}</p>
        <h1 style={s.title}>{c.title}</h1>
        <p style={s.lede}>{c.lede}</p>
      </section>

      <section aria-label={c.eyebrow} style={s.section}>
        <div style={local.list}>
          {faqIds.map((id) => {
            const [question, answer] = c.answers[id];
            return (
              <article key={id} id={id} style={local.item}>
                <h2 style={local.question}>{question}</h2>
                <p style={local.answer}>{answer}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="more-title" style={s.section}>
        <h2 id="more-title" style={s.sectionTitle}>{c.moreTitle}</h2>
        <p style={s.sectionCopy}>{c.moreCopy}</p>
        <div style={s.actions}>
          <a href="/contact" style={s.primaryButton}>{c.moreButton}</a>
        </div>
      </section>

      <PublicFooter nav={c.nav} />
    </main>
  );
}

const local: Record<string, CSSProperties> = {
  list: { display: "grid", gap: 14, maxWidth: 860 },
  item: { background: "#0c0c0c", border: "1px solid rgba(248, 184, 8, 0.16)", borderRadius: 10, padding: 20, scrollMarginTop: 90 },
  question: { color: "#f4efe4", fontSize: 19, lineHeight: 1.3, margin: 0 },
  answer: { color: "#d8cfbd", fontSize: 16, lineHeight: 1.6, margin: "10px 0 0" }
};
