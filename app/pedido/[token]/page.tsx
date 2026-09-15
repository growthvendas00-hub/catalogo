import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Clock3, XCircle } from "lucide-react";
import { notFound } from "next/navigation";
import { BrandMark } from "@/components/brand-mark";
import { formatPrice } from "@/lib/format";
import { syncMercadoPagoPayment } from "@/lib/mercado-pago";
import { getPublicOrderByToken } from "@/lib/orders";
import { paymentLabel } from "@/lib/order-status";

export const metadata: Metadata = {
  title: "Acompanhar pedido",
  robots: { index: false, follow: false, nocache: true },
};

function StatusIcon({ status }: { status: string }) {
  if (status === "approved") return <CheckCircle2 size={38} className="text-[var(--success)]" aria-hidden />;
  if (["rejected", "cancelled", "checkout_error", "amount_mismatch"].includes(status)) return <XCircle size={38} className="text-[var(--danger)]" aria-hidden />;
  return <Clock3 size={38} className="text-[var(--accent)]" aria-hidden />;
}

export default async function OrderPage({ params, searchParams }: {
  params: Promise<{ token: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { token } = await params;
  const query = await searchParams;
  const paymentId = typeof query.payment_id === "string"
    ? query.payment_id
    : typeof query.collection_id === "string"
      ? query.collection_id
      : null;

  if (paymentId) {
    try {
      await syncMercadoPagoPayment(paymentId);
    } catch (error) {
      console.error("mercado-pago-return", error);
    }
  }

  const order = await getPublicOrderByToken(token);
  if (!order) notFound();

  return (
    <main id="conteudo" className="min-h-screen bg-[var(--paper)] px-[var(--page-gutter)] py-8 sm:py-12">
      <div className="mx-auto max-w-2xl">
        <Link href="/" aria-label="Voltar ao catálogo"><BrandMark /></Link>
        <section className="mt-10 border-y fine-rule bg-[var(--paper-bright)] px-5 py-8 sm:px-8 sm:py-10">
          <div className="flex items-start gap-4">
            <StatusIcon status={order.paymentStatus} />
            <div>
              <p className="eyebrow text-black/45">Seu pedido</p>
              <h1 className="mt-2 text-3xl font-medium tracking-[-.04em] uppercase sm:text-5xl">{paymentLabel(order.paymentStatus)}</h1>
            </div>
          </div>
          <p className="mt-6 max-w-xl text-sm leading-7 text-black/65">
            {order.paymentStatus === "approved"
              ? "Pagamento confirmado. A Laus Sit recebeu seu pedido e já pode iniciar o atendimento."
              : order.paymentStatus === "pending"
                ? "O Mercado Pago ainda está processando o pagamento. Esta página será atualizada quando houver confirmação."
                : "Se o pagamento não foi concluído, volte ao catálogo e tente novamente ou fale com a Laus Sit."}
          </p>

          <dl className="mt-8 border-t fine-rule text-sm">
            <div className="grid grid-cols-[8rem_1fr] gap-3 border-b fine-rule py-3"><dt className="eyebrow text-black/45">Peça</dt><dd>{order.productName}</dd></div>
            {order.selectedSize && <div className="grid grid-cols-[8rem_1fr] gap-3 border-b fine-rule py-3"><dt className="eyebrow text-black/45">Tamanho</dt><dd>{order.selectedSize}</dd></div>}
            {order.selectedColor && <div className="grid grid-cols-[8rem_1fr] gap-3 border-b fine-rule py-3"><dt className="eyebrow text-black/45">Cor</dt><dd>{order.selectedColor}</dd></div>}
            <div className="grid grid-cols-[8rem_1fr] gap-3 border-b fine-rule py-3"><dt className="eyebrow text-black/45">Quantidade</dt><dd>{order.quantity}</dd></div>
            <div className="grid grid-cols-[8rem_1fr] gap-3 border-b fine-rule py-3"><dt className="eyebrow text-black/45">Total</dt><dd className="font-semibold tabular-nums">{formatPrice(order.totalAmount)}</dd></div>
          </dl>

          <Link href="/" className="button-primary mt-8 w-full sm:w-auto">Voltar ao catálogo</Link>
        </section>
        <p className="mt-5 text-center text-xs leading-relaxed text-black/45">Guarde este endereço para acompanhar o pedido. Ele não aparece no catálogo público.</p>
      </div>
    </main>
  );
}
