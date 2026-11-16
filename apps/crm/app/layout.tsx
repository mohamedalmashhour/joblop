import type { Metadata } from "next";
import type { ReactNode } from "react";
import { serif, sans } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Joblop CRM",
  description: "Joblop staff CRM — pipeline and contacts.",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48" },
      { url: "/icon.png", type: "image/png", sizes: "512x512" }
    ],
    apple: "/apple-touch-icon.png"
  }
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" className={`${serif.variable} ${sans.variable}`}>
      <body>
        <a className="crm-skip-link" href="#crm-main">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
