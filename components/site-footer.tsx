import Link from "next/link";
import type { CatalogSettings } from "@/types/catalog";

export function SiteFooter({ settings }: { settings: CatalogSettings }) {
  const instagram = settings.instagram?.replace(/^@/, "").replace(/^https?:\/\/(www\.)?instagram\.com\//, "").replace(/\/$/, "");
  return (
    <footer className="container-wide border-t fine-rule px-[var(--page-gutter)] py-8 text-xs text-[var(--muted)]">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div><p className="font-semibold uppercase tracking-[.08em] text-black">{settings.footerText}</p><p className="mt-2 leading-relaxed">Atendimento direto · pagamento processado pelo Mercado Pago</p></div>
        <nav aria-label="Informações legais" className="grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
          <Link className="underline underline-offset-4" href="/privacidade">Privacidade</Link>
          <Link className="underline underline-offset-4" href="/termos-de-uso">Termos de uso</Link>
          <Link className="underline underline-offset-4" href="/trocas-e-devolucoes">Trocas e devoluções</Link>
          <Link className="underline underline-offset-4" href="/entrega">Entrega</Link>
        </nav>
      </div>
      <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 border-t fine-rule pt-5">
        {settings.contactEmail && <a className="underline underline-offset-4" href={`mailto:${settings.contactEmail}`}>{settings.contactEmail}</a>}
        {instagram && <a className="underline underline-offset-4" href={`https://instagram.com/${instagram}`} target="_blank" rel="noreferrer">Instagram de {settings.brandName}</a>}
        {settings.taxId && <span>CNPJ {settings.taxId}</span>}
      </div>
    </footer>
  );
}
