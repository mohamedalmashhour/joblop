import type { Metadata } from "next";
import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { Inter, Playfair_Display } from "next/font/google";
import { AdminShell } from "./AdminShell";
import { LOCALE_COOKIE, htmlLang, localeDir, resolveAdminLocale } from "./i18n/config";
import { LocaleProvider } from "./i18n/LocaleProvider";
import "./globals.css";

// One brand voice, platform-wide: Playfair Display serif headings + Inter sans body.
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


export const metadata: Metadata = {
  title: "Resident Workforce OS Administration",
  description: "Authorized Resident Workforce OS administration workspace."
};

export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const rwosEnv = process.env.RWOS_ENV;
  const staging = rwosEnv === "staging";
  // The deployed test tier (Render soft launch, RWOS_ENV="test") and any non-local tier must behave
  // like a real connected environment: lean nav only, never the numbered prototype page-map. The
  // full page-map is reserved for genuine LOCAL dev (RWOS_ENV unset or "local"). Computed here
  // server-side so RWOS_ENV (not exposed to the client bundle) is authoritative.
  const connected = rwosEnv !== undefined && rwosEnv !== "" && rwosEnv !== "local";
  const store = await cookies();
  const locale = resolveAdminLocale(store.get(LOCALE_COOKIE)?.value);
  return (
    <html lang={htmlLang(locale)} dir={localeDir(locale)} className={`${serif.variable} ${sans.variable}`}>
      <body>
        <LocaleProvider locale={locale}>
          <AdminShell connected={connected} staging={staging}>
            {children}
          </AdminShell>
        </LocaleProvider>
      </body>
    </html>
  );
}
