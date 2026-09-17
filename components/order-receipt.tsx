"use client";

import Link from "next/link";
import { CheckCircle2, Clock3, RotateCcw, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { formatPrice } from "@/lib/format";
import { isTerminalPaymentStatus, paymentLabel, paymentVisualState } from "@/lib/order-status";
import type { PublicOrder } from "@/types/order";

function StatusIcon({ status }: { status: string }) {
  const state = paymentVisualState(status);
  if (state === "success") return <CheckCircle2 size={38} className="text-[var(--success)]" aria-hidden />;
  if (state === "failure") return <XCircle size={38} className="text-[var(--danger)]" aria-hidden />;
  if (state === "reversal") return <RotateCcw size={38} className="text-[var(--accent)]" aria-hidden />;
  return <Clock3 size={38} className="text-[var(--accent)]" aria-hidden />;
}

function statusMessage(status: string) {
  const state = paymentVisualState(status);
  if (state === "success") return "Pagamento confirmado. A Laus Sit recebeu seu pedido e já pode iniciar o atendimento.";
  if (state === "waiting") return "O Mercado Pago ainda está processando o pagamento. Esta página verifica o pedido novamente em alguns instantes.";
  if (state === "reversal") return "O pagamento teve uma reversão. Entre em contato com a Laus Sit se precisar de ajuda.";
  return "O pagamento não foi concluído. Volte ao catálogo para tentar novamente ou fale com a Laus Sit.";
}

export function OrderReceipt({ initialOrder }: { initialOrder: PublicOrder }) {
  const [order, setOrder] = useState(initialOrder);

  useEffect(() => {
    if (isTerminalPaymentStatus(order.paymentStatus)) return;
    let active = true;
    const poll = async () => {
      try {
        const response = await fetch(`/api/orders/${order.publicToken}`, { cache: "no-store" });
        if (response.ok && active) setOrder(await response.json() as PublicOrder);
      } catch { /* A próxima tentativa cobre falhas transitórias. */ }
    };
    const timer = window.setInterval(poll, 10_000);
    return () => { active = false; window.clearInterval(timer); };
  }, [order.paymentStatus, order.publicToken]);

  return (
    <section className="mt-10 border-y fine-rule bg-[var(--paper-bright)] px-5 py-8 sm:px-8 sm:py-10" aria-live="polite">
      <div className="flex items-start gap-4">
        <StatusIcon status={order.paymentStatus} />
        <div><p className="eyebrow text-[var(--muted)]">Seu pedido</p><h1 className="mt-2 text-3xl font-medium tracking-[-.04em] uppercase sm:text-5xl">{paymentLabel(order.paymentStatus)}</h1></div>
      </div>
      <p className="mt-6 max-w-xl text-sm leading-7 text-[var(--muted)]">{statusMessage(order.paymentStatus)}</p>
      <dl className="mt-8 border-t fine-rule text-sm">
        <div className="grid grid-cols-[8rem_1fr] gap-3 border-b fine-rule py-3"><dt className="eyebrow text-[var(--muted)]">Peça</dt><dd>{order.productName}</dd></div>
        {order.selectedSize && <div className="grid grid-cols-[8rem_1fr] gap-3 border-b fine-rule py-3"><dt className="eyebrow text-[var(--muted)]">Tamanho</dt><dd>{order.selectedSize}</dd></div>}
        {order.selectedColor && <div className="grid grid-cols-[8rem_1fr] gap-3 border-b fine-rule py-3"><dt className="eyebrow text-[var(--muted)]">Cor</dt><dd>{order.selectedColor}</dd></div>}
        <div className="grid grid-cols-[8rem_1fr] gap-3 border-b fine-rule py-3"><dt className="eyebrow text-[var(--muted)]">Quantidade</dt><dd>{order.quantity}</dd></div>
        <div className="grid grid-cols-[8rem_1fr] gap-3 border-b fine-rule py-3"><dt className="eyebrow text-[var(--muted)]">Total</dt><dd className="font-semibold tabular-nums">{formatPrice(order.totalAmount)}</dd></div>
      </dl>
      <Link href="/" className="button-primary mt-8 w-full sm:w-auto">Voltar ao catálogo</Link>
    </section>
  );
}
