import type { Metadata } from "next";
import { AccountDeletion } from "../legal/content";
import { readLegalLanguage } from "../legal/legalLocale";

const meta = {
  en: { title: "Delete your account — Joblop", description: "How to request deletion of your Joblop account and associated data." },
  fr: { title: "Supprimer votre compte — Joblop", description: "Comment demander la suppression de votre compte Joblop et des données associées." },
  ar: { title: "حذف الحساب — جوب‑لوب", description: "كيف تطلب حذف حساب جوب‑لوب والبيانات المرتبطة به." }
} as const;

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  return meta[await readLegalLanguage(searchParams)];
}

export default async function Page({ searchParams }: Props) {
  return <AccountDeletion lang={await readLegalLanguage(searchParams)} />;
}
