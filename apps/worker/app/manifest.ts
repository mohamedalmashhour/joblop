import type { MetadataRoute } from "next";

// Web App Manifest — makes joblop.com an installable PWA (Add to Home Screen) and the basis for the
// Trusted Web Activity (TWA) Android app on Google Play. Served at /manifest.webmanifest.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Joblop — Find work across Canada",
    short_name: "Joblop",
    description:
      "Find work across Canada and apply free. JobScanner brings the whole market into one search — and Joblop never takes a cut of your pay.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#17140f",
    lang: "en-CA",
    dir: "ltr",
    categories: ["business", "productivity"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
    ]
  };
}
