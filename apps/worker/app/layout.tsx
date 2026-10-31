import type { Metadata } from "next";
import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { Inter, Playfair_Display } from "next/font/google";
import { LOCALE_COOKIE, htmlLang, localeDir, resolveWorkerLocale } from "./i18n/config";
import { dictionaries } from "./i18n/messages";
import { LocaleProvider } from "./i18n/LocaleProvider";
import { Footer } from "./Footer";
import { GoogleTag } from "./analytics";
import { RegisterSW } from "./RegisterSW";
import "./globals.css";

export const viewport = { themeColor: "#000000" };

// One brand voice, platform-wide: Playfair Display serif headings + Inter sans body.
// next/font self-hosts the faces and exposes them as CSS variables (--font-serif / --font-sans)
// that the shared design-system tokens read.
const serif = Playfair_Display({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-serif",
  display: "swap"
});
const sans = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-sans",
  display: "swap"
});

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
  const title = `JobLop — ${m["mk.heroTitle"] ?? enDict["mk.heroTitle"]}`;
  const description = m["mk.heroIntro"] ?? enDict["mk.heroIntro"];
  return {
    metadataBase: new URL(SITE_URL),
    title,
    description,
    applicationName: "JobLop",
    manifest: "/manifest.webmanifest",
    appleWebApp: { capable: true, title: "JobLop", statusBarStyle: "default" },
    icons: { apple: "/apple-touch-icon.png" },
    alternates: { canonical: "/" },
    openGraph: {
      type: "website",
      siteName: "JobLop",
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
        <LocaleProvider locale={locale}>{children}</LocaleProvider>
        <Footer locale={locale} />
      </body>
    </html>
  );
}
