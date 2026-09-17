import type { MetadataRoute } from "next";
import { resolveSiteUrl } from "@/lib/site-url";

export default function robots(): MetadataRoute.Robots {
  const origin = resolveSiteUrl().origin;
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/pedido", "/api"] },
    sitemap: `${origin}/sitemap.xml`,
  };
}
