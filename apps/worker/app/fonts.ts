import localFont from "next/font/local";

// Self-hosted brand faces (vendored woff2 under ./fonts) so the production build never
// depends on a network fetch to Google Fonts (which is flaky in the Render Docker build
// and was the cause of intermittent `next/font` build failures). Playfair Display = serif
// headings (--font-serif); Inter = sans body (--font-sans). Same brand voice, platform-wide.
export const serif = localFont({
  variable: "--font-serif",
  display: "swap",
  src: [
    { path: "./fonts/playfair-display-latin-600-normal.woff2", weight: "600", style: "normal" },
    { path: "./fonts/playfair-display-latin-700-normal.woff2", weight: "700", style: "normal" },
    { path: "./fonts/playfair-display-latin-800-normal.woff2", weight: "800", style: "normal" }
  ]
});

export const sans = localFont({
  variable: "--font-sans",
  display: "swap",
  src: [
    { path: "./fonts/inter-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "./fonts/inter-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "./fonts/inter-latin-600-normal.woff2", weight: "600", style: "normal" },
    { path: "./fonts/inter-latin-700-normal.woff2", weight: "700", style: "normal" },
    { path: "./fonts/inter-latin-800-normal.woff2", weight: "800", style: "normal" }
  ]
});
