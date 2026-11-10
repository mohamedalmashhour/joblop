import type { Metadata } from "next";
import { SiteHeader } from "../SiteHeader";
import { ConfirmEmail } from "./ConfirmEmail";

// Landing page for the "confirm your email" link (item 45). Public: the link may be opened on any
// device, signed in or not. Confirming needs a tap, so mail scanners that open links do not use it up.
export const metadata: Metadata = {
  title: "Confirm your email — Joblop",
  robots: { index: false, follow: false },
  referrer: "no-referrer"
};

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function Page({ searchParams }: Props) {
  const raw = (await searchParams).token;
  const token = typeof raw === "string" ? raw : "";
  return (
    <>
      <SiteHeader />
      <main className="wrap">
        <ConfirmEmail token={token} />
      </main>
    </>
  );
}
