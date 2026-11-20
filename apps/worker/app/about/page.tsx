import type { Metadata } from "next";
import { cookies } from "next/headers";
import { LOCALE_COOKIE, htmlLang, resolveWorkerLocale } from "../i18n/config";
import { dictionaries } from "../i18n/messages";
import { PublicJobBoard } from "../browse/PublicJobBoard";

// About Joblop (the former /browse board): what Joblop is, for workers and employers, and the contact form. Google-ready metadata
// (title, description, Open Graph, Twitter, keywords) so it indexes and shares well once deployed.
// Title/description follow the visitor's language (Bill 96), mirroring the root layout.
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://joblop.com";

export async function generateMetadata(): Promise<Metadata> {
  const store = await cookies();
  const locale = resolveWorkerLocale(store.get(LOCALE_COOKIE)?.value);
  const enDict = dictionaries["en-CA"];
  const m = dictionaries[locale] ?? enDict;
  const title = `Joblop — ${m["browse.metaTitle"] ?? enDict["browse.metaTitle"]}`;
  const description = m["browse.metaDescription"] ?? enDict["browse.metaDescription"];
  return {
    metadataBase: new URL(SITE_URL),
    alternates: { canonical: "/about" },
    title,
    description,
    keywords: [
      "jobs Canada",
      "find work",
      "staffing",
      "care jobs",
      "nurse jobs",
      "PSW jobs",
      "kitchen jobs",
      "housekeeping jobs",
      "JobScanner",
      "apply free",
      "emplois Canada",
      "trouver du travail"
    ],
    openGraph: {
      title,
      description,
      siteName: "Joblop",
      url: `${SITE_URL}/about`,
      type: "website",
      locale: htmlLang(locale)
    },
    twitter: {
      card: "summary_large_image",
      title,
      description
    },
    robots: { index: true, follow: true }
  };
}

export default function AboutPage() {
  return <PublicJobBoard />;
}
