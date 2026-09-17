import { MessageCircle } from "lucide-react";
import { CheckoutForm } from "@/components/checkout-form";
import { DEMO_MEASUREMENTS_NOTICE } from "@/lib/demo-data";
import { formatPrice, onlyDigits } from "@/lib/format";
import type { CatalogSettings, Product } from "@/types/catalog";

function DetailRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return <div className="grid grid-cols-[7.5rem_1fr] gap-3 border-t fine-rule py-3 text-sm"><dt className="eyebrow pt-[.15rem] text-[var(--muted)]">{label}</dt><dd className="leading-relaxed">{value}</dd></div>;
}

export function ProductDetails({ product, settings, demoMode, checkoutEnabled }: { product: Product; settings: CatalogSettings; demoMode: boolean; checkoutEnabled: boolean }) {
  const price = product.promotionalPrice ?? product.price;
  const whatsappText = settings.whatsappMessage.replace("{produto}", product.name);
  const whatsappUrl = settings.whatsapp ? `https://wa.me/${onlyDigits(settings.whatsapp)}?text=${encodeURIComponent(whatsappText)}` : null;
  return (
    <div className="px-[var(--page-gutter)] py-8 sm:py-12 lg:sticky lg:top-0 lg:max-h-screen lg:overflow-y-auto">
      <p className="eyebrow text-[var(--muted)]">{product.category}</p>
      <h1 className="mt-3 max-w-[17ch] text-3xl font-medium leading-[.98] tracking-[-.045em] uppercase sm:text-5xl">{product.name}</h1>
      <div className="mt-5 flex items-baseline gap-3">
        <p className="text-xl font-semibold tabular-nums">{formatPrice(price)}</p>
        {product.promotionalPrice && <p className="text-sm text-[var(--muted)] line-through">{formatPrice(product.price)}</p>}
      </div>
      <p className="mt-7 max-w-xl text-base leading-relaxed text-black/70">{product.shortDescription}</p>
      {checkoutEnabled && <CheckoutForm productId={product.id} price={price} sizes={product.sizes} colors={product.colors} />}
      {!checkoutEnabled && !demoMode && <p className="mt-7 border-l-2 border-[var(--accent)] pl-4 text-sm leading-relaxed text-black/65">A compra online está em configuração. Enquanto isso, fale com a Laus Sit pelo WhatsApp.</p>}
      {whatsappUrl && <a className={`${checkoutEnabled ? "button-secondary" : "button-primary"} mt-5 w-full sm:w-auto`} href={whatsappUrl} target="_blank" rel="noreferrer"><MessageCircle size={16} aria-hidden /> Falar sobre esta peça</a>}

      <div className="mt-12 space-y-10">
        <section><h2 className="eyebrow mb-4">Sobre a peça</h2><p className="max-w-xl text-sm leading-7 text-black/70">{product.description}</p></section>
        {settings.showColors && product.colors.length > 0 && <section><h2 className="eyebrow mb-4">Cores disponíveis</h2><ul className="flex flex-wrap gap-x-6 gap-y-3">{product.colors.map((color) => <li key={color.name} className="flex items-center gap-2 text-sm"><span aria-hidden className="size-4 rounded-full border border-black/30" style={{ backgroundColor: color.hex ?? "transparent" }} />{color.name}</li>)}</ul></section>}
        <section><h2 className="eyebrow mb-4">Tamanhos</h2><div className="flex flex-wrap gap-2">{product.sizes.map((size) => <span key={size} className="grid min-h-11 min-w-11 place-items-center border fine-rule px-3 text-xs font-semibold">{size}</span>)}</div></section>
        {settings.showTechnicalSheet && <section><h2 className="eyebrow mb-4">Ficha técnica</h2><dl><DetailRow label="Modelo" value={product.category} /><DetailRow label="Tecido" value={product.fabric} /><DetailRow label="Composição" value={product.composition} /><DetailRow label="Fio" value={product.threadType} /><DetailRow label="Modelagem" value={product.fit} /><DetailRow label="Gramatura" value={product.gsm} /><DetailRow label="Estampa" value={product.printingMethod} /><DetailRow label="Acabamento" value={product.finish} /><DetailRow label="Notas técnicas" value={product.technicalNotes} /></dl></section>}
        {settings.showMeasurements && product.measurements.length > 0 && <section><div className="mb-4 flex flex-wrap items-end justify-between gap-2"><h2 className="eyebrow">Tabela de medidas</h2><span className="text-[.65rem] text-[var(--muted)]">medidas em cm</span></div><div className="overflow-x-auto"><table className="w-full border-collapse text-left text-xs sm:text-sm"><thead><tr className="border-y fine-rule"><th className="py-3 pr-2 font-semibold">Tamanho</th><th className="py-3 pr-2 font-semibold">Largura</th><th className="py-3 font-semibold">Comprimento</th></tr></thead><tbody>{product.measurements.map((item) => <tr key={item.size} className="border-b fine-rule"><td className="py-3 pr-2 font-semibold">{item.size}</td><td className="py-3 pr-2 tabular-nums">{item.width}</td><td className="py-3 tabular-nums">{item.length}</td></tr>)}</tbody></table></div>{demoMode && <p className="mt-3 text-xs leading-relaxed text-[var(--accent)]">{DEMO_MEASUREMENTS_NOTICE}</p>}</section>}
        <section className="grid gap-8 border-t fine-rule pt-8 sm:grid-cols-2"><div><h2 className="eyebrow mb-3">Cuidados</h2><p className="text-sm leading-6 text-black/65">{product.careInstructions}</p></div>{product.observations && <div><h2 className="eyebrow mb-3">Observações</h2><p className="text-sm leading-6 text-black/65">{product.observations}</p></div>}</section>
      </div>
    </div>
  );
}
