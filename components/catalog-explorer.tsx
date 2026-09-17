"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { ProductCard } from "@/components/product-card";
import type { Category, PublicProductCard } from "@/types/catalog";

const filters: Array<"Todas" | Category> = ["Todas", "Baby Look", "Tradicional", "Oversized"];

export function CatalogExplorer({ products }: { products: PublicProductCard[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const requestedCategory = searchParams.get("categoria");
  const category = filters.includes(requestedCategory as (typeof filters)[number]) ? requestedCategory as (typeof filters)[number] : "Todas";
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  useEffect(() => {
    const syncFromHistory = () => setQuery(new URLSearchParams(window.location.search).get("q") ?? "");
    window.addEventListener("popstate", syncFromHistory);
    return () => window.removeEventListener("popstate", syncFromHistory);
  }, []);
  const updateCategory = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (query) params.set("q", query); else params.delete("q");
    if (value === "Todas") params.delete("categoria"); else params.set("categoria", value);
    const next = params.toString();
    router.push(next ? `${pathname}?${next}` : pathname, { scroll: false });
  };
  const updateQuery = (value: string) => {
    setQuery(value);
    const params = new URLSearchParams(window.location.search);
    if (value) params.set("q", value); else params.delete("q");
    const next = params.toString();
    window.history.replaceState(null, "", next ? `${pathname}?${next}` : pathname);
  };
  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("pt-BR");
    return products.filter((product) =>
      (category === "Todas" || product.category === category) &&
      (!normalized || `${product.name} ${product.category}`.toLocaleLowerCase("pt-BR").includes(normalized)),
    );
  }, [category, products, query]);

  return (
    <section id="catalogo" aria-labelledby="catalog-title">
      <div className="flex flex-col border-y fine-rule sm:flex-row sm:items-stretch">
        <div className="filter-scroll flex min-w-0 flex-1 overflow-x-auto px-[var(--page-gutter)]" role="group" aria-label="Filtrar por modelagem">
          {filters.map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => updateCategory(filter)}
              aria-pressed={category === filter}
              className={`min-h-14 shrink-0 border-b-2 px-3 text-[.66rem] font-bold tracking-[.11em] uppercase transition-colors sm:px-4 ${category === filter ? "border-black text-black" : "border-transparent text-[var(--muted)] hover:text-black"}`}
            >{filter}</button>
          ))}
        </div>
        <label className="flex min-h-14 items-center gap-2 border-t fine-rule px-[var(--page-gutter)] sm:w-80 sm:border-l sm:border-t-0">
          <Search aria-hidden size={16} strokeWidth={1.5} />
          <span className="sr-only">Buscar por nome ou modelo</span>
          <input value={query} onChange={(event) => updateQuery(event.target.value)} className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#686963]" placeholder="BUSCAR MODELO" />
          {query && <button type="button" className="grid size-11 shrink-0 place-items-center" onClick={() => updateQuery("")} aria-label="Limpar busca"><X size={15} /></button>}
        </label>
      </div>
      <h2 id="catalog-title" className="sr-only">Peças do catálogo</h2>
      {filtered.length ? (
        <div className="catalog-grid">
          {filtered.map((product, index) => <ProductCard key={product.id} product={product} index={index} />)}
        </div>
      ) : (
        <div className="grid min-h-80 place-items-center border-b fine-rule px-6 text-center">
          <div><p className="eyebrow mb-3">Nenhuma peça encontrada</p><p className="text-sm text-[var(--muted)]">Tente outra modelagem ou termo de busca.</p></div>
        </div>
      )}
    </section>
  );
}
