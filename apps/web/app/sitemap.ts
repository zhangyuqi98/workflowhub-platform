import type { MetadataRoute } from "next";
import { getBaseUrl } from "@/lib/env";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getBaseUrl();

  return [
    {
      url: `${baseUrl}/`,
      lastModified: new Date(),
    },
    {
      url: `${baseUrl}/discover`,
      lastModified: new Date(),
    },
    {
      url: `${baseUrl}/publish`,
      lastModified: new Date(),
    },
    {
      url: `${baseUrl}/docs`,
      lastModified: new Date(),
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date(),
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: new Date(),
    },
  ];
}
