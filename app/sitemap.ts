import type { MetadataRoute } from "next";
import { getPublicProductCards } from "@/lib/catalog";
import { resolveSiteUrl } from "@/lib/site-url";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = resolveSiteUrl().origin;
  const products = await getPublicProductCards();
  return [
    { url: origin, changeFrequency: "weekly", priority: 1 },
    ...products.map((product) => ({ url: `${origin}/produto/${product.slug}`, changeFrequency: "weekly" as const, priority: 0.8 })),
  ];
}
