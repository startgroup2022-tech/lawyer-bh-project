import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/seo/pages";
import { PRIVATE_ROUTE_PREFIXES } from "@/lib/seo/indexing-policy";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [...PRIVATE_ROUTE_PREFIXES],
    },

    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
