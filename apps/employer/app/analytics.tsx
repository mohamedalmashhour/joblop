"use client";

import Script from "next/script";

// Google tag (gtag.js) for Google Ads / GA4 conversion tracking. Flag-gated: nothing loads unless a
// measurement/Ads id (like "G-…" or "AW-…", not a secret) is configured. The id is read at RUNTIME
// in the server layout and passed in as `tagId` — a client-side NEXT_PUBLIC_ read would require the
// value at build time, which a Docker image build may not have. Conversion events fire via
// trackConversion(); everything no-ops when the tag is absent, so behaviour is identical with it off.
export function GoogleTag({ tagId }: { tagId?: string | null }) {
  const id = tagId?.trim();
  if (!id) return null;
  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`}
        strategy="afterInteractive"
      />
      <Script id="gtag-init" strategy="afterInteractive">
        {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${id}');`}
      </Script>
    </>
  );
}

// Fire a conversion/analytics event. Safe to call anywhere; silently does nothing when gtag is
// absent (tracking disabled, blocked, or still loading).
export function trackConversion(event: string, params?: Record<string, unknown>) {
  try {
    const w = window as unknown as { gtag?: (...args: unknown[]) => void };
    if (typeof w.gtag === "function") w.gtag("event", event, params ?? {});
  } catch {
    /* ignore — analytics must never break the app */
  }
}
