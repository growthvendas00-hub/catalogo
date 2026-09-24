import type { ProductVariant } from "@/types/catalog";

export function effectiveVariantPrice(variant: Pick<ProductVariant, "price" | "promotionalPrice">) {
  return Number(variant.promotionalPrice ?? variant.price);
}

export function getStartingPrice(variants: ProductVariant[], fallback = 0) {
  const prices = variants
    .filter((variant) => variant.active)
    .map(effectiveVariantPrice)
    .filter((price) => Number.isFinite(price) && price >= 0.5);
  return prices.length ? Math.min(...prices) : fallback;
}
