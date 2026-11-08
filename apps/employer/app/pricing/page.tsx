import { pricingCopy } from "./pricingContent";
import { PublicFooter, PublicHeader, publicStyles as s, readPublicLocale } from "./publicPageStyles";

export default async function PricingPage() {
  const c = pricingCopy[await readPublicLocale()];
  return (
    <main style={s.page}>
      <PublicHeader nav={c.nav} current="/pricing" />

      <section style={s.hero}>
        <p style={s.eyebrow}>{c.eyebrow}</p>
        <h1 style={s.title}>{c.title}</h1>
        <p style={s.lede}>{c.lede}</p>
      </section>

      <section aria-labelledby="short-title" style={s.section}>
        <h2 id="short-title" style={s.sectionTitle}>{c.shortTitle}</h2>
        <p style={s.sectionCopy}>{c.shortIntro}</p>
        <ul style={s.list}>
          {c.shortPoints.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="plans-title" style={s.section}>
        <h2 id="plans-title" style={s.sectionTitle}>{c.plansTitle}</h2>
        <p style={s.sectionCopy}>{c.plansIntro}</p>
        <div style={s.cardGrid}>
          {c.plans.map((plan) => (
            <article key={plan.name} style={s.card}>
              <h3 style={s.cardTitle}>{plan.name}</h3>
              <p style={s.cardPrice}>{plan.price}</p>
              <ul style={s.list}>
                {plan.points.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
        <a href="/plans" style={s.link}>{c.plansLink}</a>
      </section>

      <section aria-labelledby="long-title" style={s.section}>
        <h2 id="long-title" style={s.sectionTitle}>{c.longTitle}</h2>
        <p style={s.sectionCopy}>{c.longIntro}</p>
        <ul style={s.list}>
          {c.longPoints.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="pay-title" style={s.section}>
        <h2 id="pay-title" style={s.sectionTitle}>{c.payTitle}</h2>
        <ul style={s.list}>
          {c.payPoints.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="cancel-title" style={s.section}>
        <h2 id="cancel-title" style={s.sectionTitle}>{c.cancelTitle}</h2>
        <ul style={s.list}>
          {c.cancelPoints.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="cta-title" style={s.section}>
        <h2 id="cta-title" style={s.sectionTitle}>{c.ctaTitle}</h2>
        <div style={s.actions}>
          <a href="/signin" style={s.primaryButton}>{c.ctaPrimary}</a>
          <a href="/contact" style={s.secondaryButton}>{c.ctaSecondary}</a>
        </div>
        <a href="/faq" style={s.link}>{c.footerFaq}</a>
      </section>

      <PublicFooter nav={c.nav} />
    </main>
  );
}
