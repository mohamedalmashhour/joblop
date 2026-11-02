import type { Metadata } from "next";
import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { LOCALE_COOKIE, htmlLang, localeDir, resolveEmployerLocale } from "./i18n/config";
import { dictionaries } from "./i18n/messages";
import { LocaleProvider } from "./i18n/LocaleProvider";
import { GoogleTag } from "./analytics";
import { serif, sans } from "./fonts";
import "./globals.css";


async function resolveLocale() {
  const store = await cookies();
  return resolveEmployerLocale(store.get(LOCALE_COOKIE)?.value);
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await resolveLocale();
  const enDict = dictionaries["en-CA"];
  const m = dictionaries[locale] ?? enDict;
  return {
    title: `Joblop — ${m["brand.tagline"] ?? enDict["brand.tagline"]}`,
    description: "Joblop employer workforce, staffing, scheduling and operations workspace."
  };
}

export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const locale = await resolveLocale();
  return (
    <html lang={htmlLang(locale)} dir={localeDir(locale)} className={`${serif.variable} ${sans.variable}`}>
      <body>
        <GoogleTag tagId={process.env.GOOGLE_TAG_ID ?? null} />
        <LocaleProvider locale={locale}>{children}</LocaleProvider>
      </body>
    </html>
  );
}
