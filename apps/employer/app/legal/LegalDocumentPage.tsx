// Reviewed and accepted by the owner's Québec lawyer (2026-11-09). See docs/legal/LEGAL_REVIEW_NOTES.md before changing any wording.
// Public legal page for the employer site: public header and footer (never the signed-in
// workspace menu), the text in the visitor's language, and the version and effective date.
import type { CSSProperties, ReactNode } from "react";
import { LEGAL_COMPANY, LEGAL_DOCUMENTS_VERSION, type LegalBlock } from "@rwos/shared";
import { pricingCopy } from "../pricing/pricingContent";
import { GOLD, PublicFooter, PublicHeader, publicStyles as s, readPublicLocale } from "../pricing/publicPageStyles";
import type { EmployerLocale } from "../i18n/config";
import { employerArabicFullText, type EmployerLegalLanguage } from "./employerLegal";

export function employerLegalLanguage(locale: EmployerLocale): EmployerLegalLanguage {
  return locale === "fr-CA" ? "fr" : locale === "ar" ? "ar" : "en";
}

const words: Readonly<Record<EmployerLegalLanguage, { eyebrow: string; version: string; effective: string; fullText: string }>> = {
  en: { eyebrow: "Legal", version: "Version", effective: "Effective November 11, 2026", fullText: "" },
  fr: { eyebrow: "Mentions légales", version: "Version", effective: "En vigueur le 11 novembre 2026", fullText: "" },
  ar: { eyebrow: "قانوني", version: "الإصدار", effective: "ساري المفعول من 11 نوفمبر 2026", fullText: "النص الكامل باللغة الإنجليزية (معتمد)" }
};

function WithEmails({ text }: { text: string }) {
  const parts = text.split(/([\w.+-]+@[\w-]+\.[\w.]+[\w])/g);
  return (
    <>
      {parts.map((part, index) =>
        index % 2 === 1 ? (
          <a key={index} href={`mailto:${part}`} style={local.link}>
            {part}
          </a>
        ) : (
          part
        )
      )}
    </>
  );
}

export function LegalBlocks({ blocks }: { blocks: readonly LegalBlock[] }) {
  return (
    <>
      {blocks.map((block, index) => {
        switch (block.kind) {
          case "h2":
            return (
              <h2 key={index} id={block.id} style={local.h2}>
                {block.text}
              </h2>
            );
          case "h3":
            return (
              <h3 key={index} style={local.h3}>
                {block.text}
              </h3>
            );
          case "p":
            return (
              <p key={index} style={local.p}>
                <WithEmails text={block.text} />
              </p>
            );
          case "ul":
          case "ol": {
            const List = block.kind;
            return (
              <List key={index} style={local.list}>
                {block.items.map((item) => (
                  <li key={item}>
                    <WithEmails text={item} />
                  </li>
                ))}
              </List>
            );
          }
          case "table":
            return (
              <div key={index} style={{ overflowX: "auto" }}>
                <table style={local.table}>
                  <thead>
                    <tr>
                      {block.head.map((cell) => (
                        <th key={cell} style={local.cell}>
                          {cell}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {block.rows.map((row) => (
                      <tr key={row.join("|")}>
                        {row.map((cell, cellIndex) => (
                          <td key={cellIndex} style={local.cell}>
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          case "links":
            return (
              <p key={index} style={local.p}>
                {block.links.map((link) => (
                  <a key={link.href} href={link.href} style={local.link}>
                    {link.label}
                  </a>
                ))}
              </p>
            );
        }
      })}
    </>
  );
}

export async function LegalDocumentPage({
  current,
  title,
  documents,
  fullTextKey
}: {
  current: "/terms" | "/privacy";
  title: Readonly<Record<EmployerLegalLanguage, string>>;
  documents: Readonly<Record<EmployerLegalLanguage, readonly LegalBlock[]>>;
  fullTextKey: keyof typeof employerArabicFullText;
}) {
  const locale = await readPublicLocale();
  const lang = employerLegalLanguage(locale);
  const nav = pricingCopy[locale].nav;
  const w = words[lang];
  let body: ReactNode = <LegalBlocks blocks={documents[lang]} />;
  if (lang === "ar") {
    body = (
      <>
        <LegalBlocks blocks={documents.ar} />
        <h2 style={local.h2}>{w.fullText}</h2>
        <div dir="ltr" lang="en">
          <LegalBlocks blocks={employerArabicFullText[fullTextKey]} />
        </div>
      </>
    );
  }
  return (
    <main style={s.page}>
      <PublicHeader nav={nav} current={current} />
      <section style={s.hero}>
        <p style={s.eyebrow}>{w.eyebrow}</p>
        <h1 style={s.title}>{title[lang]}</h1>
        <p style={s.lede}>
          {w.version} {LEGAL_DOCUMENTS_VERSION} · {w.effective} · {LEGAL_COMPANY.legalName} ({LEGAL_COMPANY.tradeName})
        </p>
      </section>
      <section style={s.section}>
        <article style={local.article}>{body}</article>
      </section>
      <PublicFooter nav={nav} />
    </main>
  );
}

const line = "1px solid rgba(248, 184, 8, 0.22)";
const local: Record<string, CSSProperties> = {
  article: { color: "#f0e8d8", maxWidth: 860 },
  h2: { color: "#f4efe4", fontSize: 22, lineHeight: 1.25, margin: "32px 0 10px" },
  h3: { color: "#f4efe4", fontSize: 17, margin: "20px 0 6px" },
  p: { fontSize: 16, lineHeight: 1.65, margin: "0 0 12px" },
  list: { fontSize: 16, lineHeight: 1.6, margin: "0 0 14px", paddingInlineStart: 22, display: "grid", gap: 6 },
  table: { borderCollapse: "collapse", fontSize: 14, margin: "4px 0 16px", width: "100%" },
  cell: { border: line, padding: "8px 10px", textAlign: "start", verticalAlign: "top" },
  link: { color: GOLD }
};
