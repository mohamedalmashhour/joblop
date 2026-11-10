import type { MetadataRoute } from "next";

// Public crawl rules. The marketing landing (/browse) is indexable; the signed-in app areas are not.
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://joblop.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/find-work", "/about", "/browse"],
        disallow: ["/api/", "/contact", "/schedule", "/offers", "/pay", "/hr", "/documents", "/cv-builder", "/saved-jobs", "/my-interests"]
      }
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL
  };
}
