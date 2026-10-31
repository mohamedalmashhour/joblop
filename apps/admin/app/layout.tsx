import type { Metadata } from "next";
import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { AdminShell } from "./AdminShell";
import { LOCALE_COOKIE, htmlLang, localeDir, resolveAdminLocale } from "./i18n/config";
import { LocaleProvider } from "./i18n/LocaleProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Resident Workforce OS Administration",
  description: "Authorized Resident Workforce OS administration workspace."
};

export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const staging = process.env.RWOS_ENV === "staging";
  const store = await cookies();
  const locale = resolveAdminLocale(store.get(LOCALE_COOKIE)?.value);
  return (
    <html lang={htmlLang(locale)} dir={localeDir(locale)}>
      <body>
        <LocaleProvider locale={locale}>
          <AdminShell staging={staging}>{children}</AdminShell>
        </LocaleProvider>
      </body>
    </html>
  );
}
