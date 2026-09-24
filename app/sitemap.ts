import type { MetadataRoute } from "next";
import { getPublicProductCards } from "@/lib/catalog";
import { resolveSiteUrl } from "@/lib/site-url";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = resolveSiteUrl().origin;
  const products = await getPublicProductCards();
  return [
    { url: origin, changeFrequency: "weekly", priority: 1 },
    ...["privacidade", "termos-de-uso", "trocas-e-devolucoes", "entrega"].map((path) => ({ url: `${origin}/${path}`, changeFrequency: "yearly" as const, priority: 0.3 })),
    ...products.map((product) => ({ url: `${origin}/produto/${product.slug}`, changeFrequency: "weekly" as const, priority: 0.8 })),
  ];
}
