import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://joblop.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: `${SITE_URL}/browse`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: "weekly", priority: 0.8 }
  ];
}
