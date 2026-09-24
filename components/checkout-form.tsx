"use client";

import { useRef, useState } from "react";
import { CreditCard, LoaderCircle, ShieldCheck } from "lucide-react";
import { formatPrice } from "@/lib/format";
import { effectiveVariantPrice, getStartingPrice } from "@/lib/product-pricing";
import type { ProductColor, ProductVariant } from "@/types/catalog";

type CheckoutResponse = { checkoutUrl?: string; error?: string };

export function CheckoutForm({
  productId,
  variants,
  sizes,
  colors,
}: {
  productId: string;
  variants: ProductVariant[];
  sizes: string[];
  colors: ProductColor[];
}) {
  const [quantity, setQuantity] = useState(1);
  const [selectedModel, setSelectedModel] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const checkoutAttemptId = useRef<string | null>(null);
  const selectedVariant = variants.find((variant) => variant.model === selectedModel && variant.active);
  const unitPrice = selectedVariant ? effectiveVariantPrice(selectedVariant) : getStartingPrice(variants);
  const total = unitPrice * quantity;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    const formData = new FormData(event.currentTarget);
    checkoutAttemptId.current ??= crypto.randomUUID();

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          checkoutAttemptId: checkoutAttemptId.current,
          productId,
          model: String(formData.get("model") ?? ""),
          size: String(formData.get("size") ?? ""),
          color: String(formData.get("color") ?? ""),
          quantity,
          customer: {
            name: String(formData.get("name") ?? ""),
            email: String(formData.get("email") ?? ""),
            phone: String(formData.get("phone") ?? ""),
            notes: String(formData.get("notes") ?? ""),
          },
        }),
      });
      const data = (await response.json()) as CheckoutResponse;
      if (!response.ok || !data.checkoutUrl) {
        setMessage(data.error || "Não foi possível iniciar o pagamento.");
        return;
      }
      window.location.assign(data.checkoutUrl);
    } catch {
      setMessage("Falha de conexão. Verifique sua internet e tente novamente.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="mt-8 border-y fine-rule bg-[var(--paper-bright)] px-4 py-6 sm:px-5" aria-labelledby="checkout-title">
      <div className="flex items-start justify-between gap-5">
        <div>
          <p className="eyebrow text-[var(--muted)]">Compra segura</p>
          <h2 id="checkout-title" className="mt-2 text-xl font-medium tracking-[-.025em]">Escolha sua peça</h2>
        </div>
        <ShieldCheck className="shrink-0 text-[var(--success)]" size={24} aria-hidden />
      </div>

      <form className="mt-6 space-y-4" onSubmit={submit} onChange={() => { if (!pending) checkoutAttemptId.current = null; }}>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="admin-label">Modelagem
            <select className="admin-input" name="model" value={selectedModel} onChange={(event) => setSelectedModel(event.target.value)} required>
              <option value="" disabled>Selecione</option>
              {variants.filter((variant) => variant.active).map((variant) => (
                <option key={variant.model} value={variant.model}>{variant.model} — {formatPrice(effectiveVariantPrice(variant))}</option>
              ))}
            </select>
          </label>
          {sizes.length > 0 && (
            <label className="admin-label">Tamanho
              <select className="admin-input" name="size" defaultValue="" required>
                <option value="" disabled>Selecione</option>
                {sizes.map((size) => <option key={size} value={size}>{size}</option>)}
              </select>
            </label>
          )}
          {colors.length > 0 && (
            <label className="admin-label">Cor
              <select className="admin-input" name="color" defaultValue="" required>
                <option value="" disabled>Selecione</option>
                {colors.map((color) => <option key={color.name} value={color.name}>{color.name}</option>)}
              </select>
            </label>
          )}
          <label className="admin-label">Quantidade
            <input className="admin-input" type="number" min="1" max="10" value={quantity} onChange={(event) => setQuantity(Math.max(1, Math.min(10, Number(event.target.value) || 1)))} />
          </label>
          <label className="admin-label">Nome completo
            <input className="admin-input normal-case tracking-normal" name="name" autoComplete="name" minLength={2} maxLength={120} required />
          </label>
          <label className="admin-label">E-mail
            <input className="admin-input normal-case tracking-normal" name="email" type="email" autoComplete="email" maxLength={180} required />
          </label>
          <label className="admin-label">WhatsApp
            <input className="admin-input normal-case tracking-normal" name="phone" type="tel" inputMode="tel" autoComplete="tel" minLength={8} maxLength={30} placeholder="(11) 99999-9999" required />
          </label>
        </div>
        <label className="admin-label">Observações para a costureira <span className="normal-case tracking-normal text-[var(--muted)]">(opcional)</span>
          <textarea className="admin-input min-h-20 normal-case tracking-normal" name="notes" maxLength={600} placeholder="Personalização, prazo ou outra informação importante" />
        </label>

        <label className="flex items-start gap-3 text-xs leading-relaxed text-[var(--muted)]">
          <input className="mt-0.5 size-5 shrink-0 accent-black" type="checkbox" required />
          <span>Li e concordo com os <a className="font-semibold text-black underline underline-offset-4" href="/termos-de-uso" target="_blank">Termos de Uso</a> e com a <a className="font-semibold text-black underline underline-offset-4" href="/privacidade" target="_blank">Política de Privacidade</a>.</span>
        </label>

        <div className="flex flex-col gap-3 border-t fine-rule pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div><span className="eyebrow text-[var(--muted)]">{selectedVariant ? "Total" : "Total a partir de"}</span><p className="mt-1 text-xl font-semibold tabular-nums">{formatPrice(total)}</p></div>
          <button className="button-primary w-full sm:w-auto" disabled={pending} type="submit">
            {pending ? <LoaderCircle className="animate-spin" size={16} /> : <CreditCard size={16} />}
            {pending ? "Abrindo pagamento..." : "Pagar com Mercado Pago"}
          </button>
        </div>
        <p className="text-xs leading-relaxed text-[var(--muted)]">Você será direcionado ao ambiente seguro do Mercado Pago. O preço é confirmado novamente pelo servidor antes da cobrança.</p>
        {message && <p role="alert" className="border-l-2 border-[var(--danger)] pl-3 text-sm text-[var(--danger)]">{message}</p>}
      </form>
    </section>
  );
}
