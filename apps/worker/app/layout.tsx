import type { Metadata } from "next";
import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { LOCALE_COOKIE, htmlLang, localeDir, resolveWorkerLocale } from "./i18n/config";
import { dictionaries } from "./i18n/messages";
import { LocaleProvider } from "./i18n/LocaleProvider";
import { IdleLogout } from "./IdleLogout";
import { LogoIntro } from "./LogoIntro";
import { Footer } from "./Footer";
import { FooterGate } from "./FooterGate";
import { GoogleTag } from "./analytics";
import { RegisterSW } from "./RegisterSW";
import { serif, sans } from "./fonts";
import "./globals.css";

export const viewport = { themeColor: "#000000" };

async function resolveLocale() {
  const store = await cookies();
  return resolveWorkerLocale(store.get(LOCALE_COOKIE)?.value);
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://joblop.com";
// Google Search Console meta-tag verification. The owner pastes the token from Search Console
// into the GOOGLE_SITE_VERIFICATION env var on Render — no code change needed. Empty ⇒ no tag.
const GOOGLE_SITE_VERIFICATION = process.env.GOOGLE_SITE_VERIFICATION?.trim();

export async function generateMetadata(): Promise<Metadata> {
  const locale = await resolveLocale();
  const enDict = dictionaries["en-CA"];
  const m = dictionaries[locale] ?? enDict;
  const title = `Joblop — ${m["mk.heroTitle"] ?? enDict["mk.heroTitle"]}`;
  const description = m["mk.heroIntro"] ?? enDict["mk.heroIntro"];
  return {
    metadataBase: new URL(SITE_URL),
    title,
    description,
    applicationName: "Joblop",
    manifest: "/manifest.webmanifest",
    appleWebApp: { capable: true, title: "Joblop", statusBarStyle: "default" },
    icons: { apple: "/apple-touch-icon.png" },
    alternates: { canonical: "/" },
    openGraph: {
      type: "website",
      siteName: "Joblop",
      url: SITE_URL,
      title,
      description,
      locale: htmlLang(locale)
    },
    twitter: { card: "summary_large_image", title, description },
    ...(GOOGLE_SITE_VERIFICATION ? { verification: { google: GOOGLE_SITE_VERIFICATION } } : {})
  };
}

export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const locale = await resolveLocale();
  return (
    <html lang={htmlLang(locale)} dir={localeDir(locale)} className={`${serif.variable} ${sans.variable}`}>
      <body>
        <GoogleTag tagId={process.env.GOOGLE_TAG_ID ?? null} />
        <RegisterSW />
        <LogoIntro />
        <LocaleProvider locale={locale}>
          <IdleLogout />
          {children}
        </LocaleProvider>
        <FooterGate>
          <Footer locale={locale} />
        </FooterGate>
      </body>
    </html>
  );
}
