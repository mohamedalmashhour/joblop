import type { Metadata } from "next";
import { TermsOfService } from "../legal/content";
import { readLegalLanguage } from "../legal/legalLocale";

const meta = {
  en: { title: "Terms of Service — Joblop", description: "The terms that govern your use of Joblop." },
  fr: { title: "Conditions d’utilisation — Joblop", description: "Les conditions qui régissent votre utilisation de Joblop." },
  ar: { title: "شروط الاستخدام — جوب‑لوب", description: "الشروط التي تحكم استخدامك لجوب‑لوب." }
} as const;

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  return meta[await readLegalLanguage(searchParams)];
}

export default async function Page({ searchParams }: Props) {
  return <TermsOfService lang={await readLegalLanguage(searchParams)} />;
}
