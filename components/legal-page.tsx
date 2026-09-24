import type { ReactNode } from "react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import type { CatalogSettings } from "@/types/catalog";

export function LegalPage({ settings, eyebrow, title, introduction, children }: {
  settings: CatalogSettings;
  eyebrow: string;
  title: string;
  introduction: string;
  children: ReactNode;
}) {
  return <>
    <SiteHeader settings={settings} />
    <main id="conteudo" className="container-wide px-[var(--page-gutter)] py-10 sm:py-16">
      <article className="mx-auto max-w-4xl">
        <header className="border-b fine-rule pb-8"><p className="eyebrow text-[var(--muted)]">{eyebrow}</p><h1 className="mt-3 text-4xl font-medium tracking-[-.045em] uppercase sm:text-6xl">{title}</h1><p className="mt-6 max-w-2xl text-base leading-7 text-black/70">{introduction}</p><p className="mt-4 text-xs text-[var(--muted)]">Última atualização: 24 de setembro de 2026.</p></header>
        <div className="legal-copy py-8 sm:py-12">{children}</div>
      </article>
    </main>
    <SiteFooter settings={settings} />
  </>;
}

export function SupplierDetails({ settings }: { settings: CatalogSettings }) {
  return <dl className="mt-4 border-t fine-rule text-sm">
    <div><dt>Responsável pela loja</dt><dd>{settings.legalName || settings.brandName}</dd></div>
    <div><dt>CNPJ</dt><dd>{settings.taxId || "A informar no painel administrativo"}</dd></div>
    <div><dt>E-mail</dt><dd>{settings.contactEmail ? <a href={`mailto:${settings.contactEmail}`}>{settings.contactEmail}</a> : "A informar no painel administrativo"}</dd></div>
    <div><dt>Endereço comercial</dt><dd>{settings.businessAddress || "A informar no painel administrativo"}</dd></div>
  </dl>;
}
