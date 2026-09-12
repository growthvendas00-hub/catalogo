import Image from "next/image";
import Link from "next/link";
import { formatPrice } from "@/lib/format";
import type { Product } from "@/types/catalog";

export function ProductCard({ product, index }: { product: Product; index: number }) {
  const finalPrice = product.promotionalPrice ?? product.price;
  return (
    <article className="catalog-cell group">
      <Link href={`/produto/${product.slug}`} className="block h-full" aria-label={`Ver ${product.name}, ${formatPrice(finalPrice)}`}>
        <div className="relative aspect-[4/5] overflow-hidden bg-[#e9e6de]">
          <Image
            src={product.mainImageUrl}
            alt={product.mainImageAlt}
            fill
            sizes="(max-width: 759px) 50vw, (max-width: 1179px) 33vw, 25vw"
            className="product-image object-cover"
            priority={index < 4}
          />
          <span className="absolute left-2 top-2 text-[.6rem] font-bold tracking-[.12em] text-black/55 sm:left-3 sm:top-3">{String(product.sortOrder).padStart(2, "0")}</span>
        </div>
        <div className="min-h-[6.8rem] border-t fine-rule p-3 sm:min-h-32 sm:p-5">
          <p className="mb-2 text-[.58rem] font-bold tracking-[.13em] text-black/55 uppercase sm:text-[.65rem]">{product.category}</p>
          <h2 className="max-w-[22ch] text-[.78rem] font-semibold leading-[1.25] tracking-[.035em] uppercase sm:text-sm">{product.name}</h2>
          <div className="mt-3 flex flex-wrap items-baseline gap-x-2 text-xs sm:text-sm">
            {product.promotionalPrice && <span className="text-[.65rem] text-black/45 line-through sm:text-xs">{formatPrice(product.price)}</span>}
            <span className="font-semibold tabular-nums">{formatPrice(finalPrice)}</span>
          </div>
        </div>
      </Link>
    </article>
  );
}
