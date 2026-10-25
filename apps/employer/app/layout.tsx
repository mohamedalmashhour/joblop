import type { Metadata } from "next";
import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { LOCALE_COOKIE, htmlLang, resolveRwosLocale } from "./i18n/config";
import { dictionaries } from "./i18n/messages";
import { LocaleProvider } from "./i18n/LocaleProvider";
import { GoogleTag } from "./analytics";
import "./globals.css";

async function resolveLocale() {
  const store = await cookies();
  return resolveRwosLocale(store.get(LOCALE_COOKIE)?.value);
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await resolveLocale();
  const m = dictionaries[locale];
  return {
    title: `JobLop — ${m["brand.tagline"]}`,
    description: "JobLop employer workforce, staffing, scheduling and operations workspace."
  };
}

export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const locale = await resolveLocale();
  return (
    <html lang={htmlLang(locale)}>
      <body>
        <GoogleTag tagId={process.env.GOOGLE_TAG_ID ?? null} />
        <LocaleProvider locale={locale}>{children}</LocaleProvider>
      </body>
    </html>
  );
}
