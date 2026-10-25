"use client";

import Script from "next/script";

// Google tag (gtag.js) for Google Ads / GA4 conversion tracking. Flag-gated: nothing loads unless
// NEXT_PUBLIC_GOOGLE_TAG_ID is set at build time (a measurement/Ads id like "G-…" or "AW-…" — not a
// secret). Conversion events are fired with trackConversion() at key funnel points. No-ops when the
// tag isn't configured, so the app behaves identically with tracking off.
const TAG_ID = process.env.NEXT_PUBLIC_GOOGLE_TAG_ID?.trim();

export function GoogleTag() {
  if (!TAG_ID) return null;
  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(TAG_ID)}`}
        strategy="afterInteractive"
      />
      <Script id="gtag-init" strategy="afterInteractive">
        {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${TAG_ID}');`}
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
