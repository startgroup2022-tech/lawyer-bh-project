import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/seo/pages";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/admin/",
        "/ar/admin/",
        "/en/admin/",
        "/provider-dashboard/",
        "/ar/provider-dashboard/",
        "/en/provider-dashboard/",
      ],
    },

    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}