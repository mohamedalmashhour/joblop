import type { Metadata } from "next";
import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { LOCALE_COOKIE, htmlLang, resolveRwosLocale } from "./i18n/config";
import { dictionaries } from "./i18n/messages";
import { LocaleProvider } from "./i18n/LocaleProvider";
import { Footer } from "./Footer";
import { GoogleTag } from "./analytics";
import { RegisterSW } from "./RegisterSW";
import "./globals.css";

export const viewport = { themeColor: "#2563eb" };

async function resolveLocale() {
  const store = await cookies();
  return resolveRwosLocale(store.get(LOCALE_COOKIE)?.value);
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://joblop.com";
// Google Search Console meta-tag verification. The owner pastes the token from Search Console
// into the GOOGLE_SITE_VERIFICATION env var on Render — no code change needed. Empty ⇒ no tag.
const GOOGLE_SITE_VERIFICATION = process.env.GOOGLE_SITE_VERIFICATION?.trim();

export async function generateMetadata(): Promise<Metadata> {
  const locale = await resolveLocale();
  const m = dictionaries[locale];
  const title = `JobLop — ${m["mk.heroTitle"]}`;
  const description = m["mk.heroIntro"];
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
    <html lang={htmlLang(locale)}>
      <body>
        <GoogleTag tagId={process.env.GOOGLE_TAG_ID ?? null} />
        <RegisterSW />
        <LocaleProvider locale={locale}>{children}</LocaleProvider>
        <Footer locale={locale} />
      </body>
    </html>
  );
}
