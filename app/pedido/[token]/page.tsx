import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BrandMark } from "@/components/brand-mark";
import { OrderReceipt } from "@/components/order-receipt";
import { PaymentAssociationError, syncMercadoPagoPayment } from "@/lib/mercado-pago";
import { getPublicOrderContextByToken } from "@/lib/orders";

export const metadata: Metadata = {
  title: "Acompanhar pedido",
  robots: { index: false, follow: false, nocache: true },
};

export default async function OrderPage({ params, searchParams }: {
  params: Promise<{ token: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { token } = await params;
  let context = await getPublicOrderContextByToken(token);
  if (!context) notFound();

  const query = await searchParams;
  const paymentId = typeof query.payment_id === "string"
    ? query.payment_id
    : typeof query.collection_id === "string" ? query.collection_id : null;

  if (paymentId) {
    try {
      await syncMercadoPagoPayment(paymentId, context.orderId);
      context = await getPublicOrderContextByToken(token) ?? context;
    } catch (error) {
      console.warn(JSON.stringify({
        level: "warning", action: "payment.return", orderId: context.orderId,
        paymentId, status: "ignored",
        errorCategory: error instanceof PaymentAssociationError ? "association" : "sync",
      }));
    }
  }

  return (
    <main id="conteudo" className="min-h-screen bg-[var(--paper)] px-[var(--page-gutter)] py-8 sm:py-12">
      <div className="mx-auto max-w-2xl">
        <Link href="/" aria-label="Voltar ao catálogo"><BrandMark /></Link>
        <OrderReceipt initialOrder={context.order} />
        <p className="mt-5 text-center text-xs leading-relaxed text-[var(--muted)]">Guarde este endereço para acompanhar o pedido. Ele não aparece no catálogo público.</p>
      </div>
    </main>
  );
}
