import type { MetadataRoute } from "next";

// Web App Manifest — makes the admin workspace installable (Add to Home Screen / Install app) with
// its own "ADMIN" icon, so staff open it full screen like an app. Served at /manifest.webmanifest.
// Country-neutral: no locale, currency or provider assumptions.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Joblop Admin",
    short_name: "Joblop Admin",
    description: "Joblop staff workspace.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#17140f",
    theme_color: "#17140f",
    icons: [
      { src: "/admin-icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/admin-icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/admin-icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
    ]
  };
}
