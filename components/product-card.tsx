import Image from "next/image";
import Link from "next/link";
import { formatPrice } from "@/lib/format";
import { CUSTOM_CATEGORY, type PublicProductCard } from "@/types/catalog";

export function ProductCard({ product, index }: { product: PublicProductCard; index: number }) {
  const isCustom = product.category === CUSTOM_CATEGORY;
  return (
    <article className="catalog-cell group">
      <Link href={`/produto/${product.slug}`} className="block h-full" aria-label={isCustom ? `Ver ${product.name} e solicitar orçamento` : `Ver ${product.name}, a partir de ${formatPrice(product.startingPrice)}`}>
        <div className="relative aspect-[4/5] overflow-hidden bg-[#e9e6de]">
          <Image
            src={product.mainImageUrl}
            alt={product.mainImageAlt}
            fill
            sizes="(max-width: 759px) 50vw, (max-width: 1179px) 33vw, 25vw"
            className="product-image object-contain p-3 sm:p-5"
            priority={index < 4}
          />
          <span className="absolute left-2 top-2 text-[.55rem] font-medium tracking-[.1em] text-[var(--muted)] sm:left-3 sm:top-3">{String(index + 1).padStart(2, "0")}</span>
        </div>
        <div className="min-h-[6.8rem] border-t fine-rule p-3 sm:min-h-32 sm:p-5">
          <p className="mb-2 text-[.58rem] font-bold tracking-[.13em] text-[var(--muted)] uppercase sm:text-[.65rem]">{product.category}</p>
          <h2 className="max-w-[22ch] text-[.82rem] font-semibold leading-[1.3] tracking-[.01em] sm:text-base">{product.name}</h2>
          <p className="mt-3 text-xs font-semibold tabular-nums sm:text-sm">{isCustom ? "Solicite um orçamento" : `A partir de ${formatPrice(product.startingPrice)}`}</p>
        </div>
      </Link>
    </article>
  );
}
