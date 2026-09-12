import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import type { CatalogSettings } from "@/types/catalog";

export function SiteHeader({ settings }: { settings: CatalogSettings }) {
  return (
    <header className="container-wide flex min-h-24 items-center justify-between border-b fine-rule px-[var(--page-gutter)] py-3 sm:min-h-28">
      <Link href="/" aria-label="Ir para o catálogo Laus Sit"><BrandMark logoUrl={settings.logoUrl} compact /></Link>
      <nav aria-label="Navegação principal" className="flex items-center gap-5 text-[.68rem] font-bold tracking-[.14em] uppercase sm:gap-9">
        <Link href="/#catalogo" className="underline-offset-4 hover:underline">Catálogo</Link>
        <Link href="/#sobre" className="hidden underline-offset-4 hover:underline sm:inline">Informações</Link>
      </nav>
    </header>
  );
}
