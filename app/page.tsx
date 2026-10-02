import { CatalogExplorer } from "@/components/catalog-explorer";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { getCatalogSettings, getPublicProductCards } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [products, settings] = await Promise.all([getPublicProductCards(), getCatalogSettings()]);
  return (
    <>
      <SiteHeader settings={settings} />
      <main id="conteudo" className="container-wide">
        <section className="grid min-h-[19rem] grid-cols-1 px-[var(--page-gutter)] py-10 sm:min-h-[26rem] sm:grid-cols-[minmax(0,1.5fr)_minmax(16rem,.6fr)] sm:items-end sm:gap-12 sm:py-16">
          <div>
            <p className="eyebrow mb-5">Catálogo — {new Date().getFullYear()}</p>
            <h1 className="display-title max-w-[9ch]">Vestir ideias, do seu jeito.</h1>
          </div>
          <div className="mt-8 max-w-md self-end border-l border-black pl-4 sm:mt-0">
            <p className="text-base leading-relaxed sm:text-lg">{settings.subtitle}</p>
            <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">Produção independente · peças lisas e personalizadas.</p>
          </div>
        </section>
        <Suspense fallback={<div className="min-h-80 border-y fine-rule" aria-hidden />}><CatalogExplorer products={products} /></Suspense>
        <section id="sobre" className="grid border-b fine-rule md:grid-cols-2">
          <div className="min-h-64 border-b fine-rule p-[var(--page-gutter)] md:border-b-0 md:border-r"><p className="eyebrow">Sobre a Laus Sit</p></div>
          <div className="flex min-h-64 items-end p-[var(--page-gutter)]"><p className="max-w-xl text-2xl leading-tight tracking-[-.025em] sm:text-4xl">{settings.institutionalText}</p></div>
        </section>
      </main>
      <SiteFooter settings={settings} />
    </>
  );
}
import { Suspense } from "react";
