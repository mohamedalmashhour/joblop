import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AdminShell } from "./AdminShell";
import "./globals.css";

export const metadata: Metadata = {
  title: "Resident Workforce OS Administration",
  description: "Authorized Resident Workforce OS administration workspace."
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <AdminShell>{children}</AdminShell>
      </body>
    </html>
  );
}
