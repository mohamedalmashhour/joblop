import type { MetadataRoute } from "next";

// Web App Manifest — makes the employer workspace installable (Add to Home Screen / Install app) with
// its own "EMPLOYER" icon. Served at /manifest.webmanifest. Country-neutral.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Joblop Employer",
    short_name: "Joblop Employer",
    description: "Joblop employer workspace.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#17140f",
    theme_color: "#17140f",
    icons: [
      { src: "/employer-icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/employer-icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/employer-icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
    ]
  };
}
