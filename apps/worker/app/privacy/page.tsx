import type { Metadata } from "next";
import { PrivacyPolicy } from "../legal/content";
import { readLegalLanguage } from "../legal/legalLocale";

const meta = {
  en: { title: "Privacy Policy — Joblop", description: "How Joblop collects, uses and shares your personal information." },
  fr: { title: "Politique de confidentialité — Joblop", description: "Comment Joblop recueille, utilise et communique vos renseignements personnels." },
  ar: { title: "سياسة الخصوصية — جوب‑لوب", description: "كيف تجمع جوب‑لوب معلوماتك الشخصية وتستخدمها وتشاركها." }
} as const;

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  return meta[await readLegalLanguage(searchParams)];
}

export default async function Page({ searchParams }: Props) {
  return <PrivacyPolicy lang={await readLegalLanguage(searchParams)} />;
}
