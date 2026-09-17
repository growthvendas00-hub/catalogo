import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { notFound } from "next/navigation";
import { OrderStatusForm } from "@/components/admin/order-status-form";
import { ReconcilePaymentForm } from "@/components/admin/reconcile-payment-form";
import { formatDateTime, formatPrice, onlyDigits } from "@/lib/format";
import { getAdminOrderById } from "@/lib/orders";
import { fulfillmentStatusLabels, paymentLabel } from "@/lib/order-status";

export const metadata = { title: "Detalhes do pedido — Admin" };

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="grid gap-1 border-b fine-rule py-3 sm:grid-cols-[11rem_1fr] sm:gap-5"><dt className="eyebrow text-[var(--muted)]">{label}</dt><dd className="text-sm leading-relaxed break-words">{children}</dd></div>;
}

export default async function AdminOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await getAdminOrderById(id);
  if (!order) notFound();
  const whatsappUrl = `https://wa.me/${onlyDigits(order.customerPhone)}?text=${encodeURIComponent(`Olá, ${order.customerName}! Estamos falando sobre seu pedido de ${order.productName} na Laus Sit.`)}`;

  return (
    <main id="conteudo" className="p-4 sm:p-7 lg:p-10">
      <Link href="/admin/pedidos" className="inline-flex min-h-11 items-center gap-2 text-xs font-bold tracking-[.08em] uppercase"><ArrowLeft size={16} /> Voltar aos pedidos</Link>
      <header className="mt-6 border-b fine-rule pb-7">
        <p className="eyebrow text-[var(--muted)]">Pedido de {formatDateTime(order.createdAt)}</p>
        <h1 className="mt-2 max-w-4xl text-3xl font-medium tracking-[-.04em] uppercase sm:text-5xl">{order.customerName}</h1>
        <div className="mt-5 flex flex-wrap gap-x-8 gap-y-2 text-sm"><span><strong>Pagamento:</strong> {paymentLabel(order.paymentStatus)}</span><span><strong>Produção:</strong> {fulfillmentStatusLabels[order.fulfillmentStatus]}</span></div>
      </header>

      <div className="grid gap-10 py-8 xl:grid-cols-[minmax(0,1fr)_minmax(20rem,.55fr)]">
        <div className="space-y-10">
          <section><h2 className="eyebrow mb-4">Item</h2><dl><Row label="Produto">{order.productName}</Row><Row label="Tamanho">{order.selectedSize || "Não informado"}</Row><Row label="Cor">{order.selectedColor || "Não informada"}</Row><Row label="Quantidade">{order.quantity}</Row><Row label="Valor unitário">{formatPrice(order.unitPrice)}</Row><Row label="Total">{formatPrice(order.totalAmount)}</Row>{order.customerNotes && <Row label="Pedido do cliente">{order.customerNotes}</Row>}</dl></section>
          <section><h2 className="eyebrow mb-4">Cliente</h2><dl><Row label="Nome">{order.customerName}</Row><Row label="E-mail"><a className="underline underline-offset-4" href={`mailto:${order.customerEmail}`}>{order.customerEmail}</a></Row><Row label="WhatsApp"><a className="inline-flex items-center gap-2 underline underline-offset-4" href={whatsappUrl} target="_blank" rel="noreferrer">{order.customerPhone}<ExternalLink size={13} /></a></Row></dl></section>
          <section><h2 className="eyebrow mb-4">Mercado Pago</h2><dl><Row label="Situação">{paymentLabel(order.paymentStatus)}</Row><Row label="Detalhe">{order.paymentStatusDetail || "—"}</Row><Row label="ID do pagamento">{order.paymentId || "Aguardando"}</Row><Row label="Forma">{[order.paymentMethod, order.paymentType].filter(Boolean).join(" · ") || "Aguardando"}</Row><Row label="Confirmado em">{order.paidAt ? formatDateTime(order.paidAt) : "Aguardando"}</Row></dl></section>
        </div>
        <aside><OrderStatusForm id={order.id} status={order.fulfillmentStatus} notes={order.adminNotes} /><ReconcilePaymentForm orderId={order.id} /><a className="button-secondary mt-5 w-full" href={`/pedido/${order.publicToken}`} target="_blank" rel="noreferrer"><ExternalLink size={15} /> Ver acompanhamento</a></aside>
      </div>
    </main>
  );
}
