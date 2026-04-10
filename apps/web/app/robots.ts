import type { MetadataRoute } from "next";
import { getBaseUrl } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getBaseUrl();

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/discover", "/docs", "/publish", "/privacy", "/terms", "/workflows/", "/users/"],
        disallow: ["/api/"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
