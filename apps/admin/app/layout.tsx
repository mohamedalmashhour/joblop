import type { Metadata } from "next";
import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { AdminShell } from "./AdminShell";
import { serif, sans } from "./fonts";
import { LOCALE_COOKIE, htmlLang, localeDir, resolveAdminLocale } from "./i18n/config";
import { LocaleProvider } from "./i18n/LocaleProvider";
import "./globals.css";


export const metadata: Metadata = {
  title: "Joblop Administration",
  description: "Joblop staff workspace.",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48" },
      { url: "/icon.png", type: "image/png", sizes: "512x512" }
    ],
    apple: "/apple-touch-icon.png"
  }
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
