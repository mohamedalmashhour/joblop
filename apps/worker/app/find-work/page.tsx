import type { Metadata } from "next";
import { cookies } from "next/headers";
import { SiteHeader } from "../SiteHeader";
import { LOCALE_COOKIE, resolveWorkerLocale } from "../i18n/config";
import { dictionaries } from "../i18n/messages";
import { cleanFilter, firstParam, parseFindWorkTab } from "../findWorkUrl";
import { FindWork } from "./FindWork";

export async function generateMetadata(): Promise<Metadata> {
  const store = await cookies();
  const locale = resolveWorkerLocale(store.get(LOCALE_COOKIE)?.value);
  const m = dictionaries[locale] ?? dictionaries["en-CA"];
  const en = dictionaries["en-CA"];
  return {
    title: `Joblop — ${m["fw.title"] ?? en["fw.title"]}`,
    description: m["fw.sub"] ?? en["fw.sub"],
    alternates: { canonical: "/find-work" }
  };
}

export default async function FindWorkPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  return (
    <>
      <SiteHeader />
      <main className="wrap">
        <FindWork
          initialTab={parseFindWorkTab(firstParam(params.tab))}
          initialQ={cleanFilter(firstParam(params.q) ?? firstParam(params.roleKeywords))}
          initialCity={cleanFilter(firstParam(params.city) ?? firstParam(params.where))}
        />
      </main>
    </>
  );
}
