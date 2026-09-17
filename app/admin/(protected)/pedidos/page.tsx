import Link from "next/link";
import { ArrowRight, CheckCircle2, Clock3, ShoppingBag } from "lucide-react";
import { formatDateTime, formatPrice } from "@/lib/format";
import { getAdminOrders } from "@/lib/orders";
import { fulfillmentStatusLabels, paymentLabel } from "@/lib/order-status";

export const metadata = { title: "Pedidos — Admin" };

export default async function AdminOrdersPage() {
  const orders = await getAdminOrders();
  const approved = orders.filter((order) => order.paymentStatus === "approved").length;
  const waiting = orders.filter((order) => ["created", "pending", "in_process"].includes(order.paymentStatus)).length;

  return (
    <main id="conteudo" className="p-4 sm:p-7 lg:p-10">
      <header className="mb-8">
        <p className="eyebrow text-[var(--muted)]">Operação</p>
        <h1 className="mt-2 text-4xl font-medium tracking-[-.045em] uppercase sm:text-5xl">Pedidos</h1>
      </header>

      <section className="mb-8 grid border-y fine-rule sm:grid-cols-3" aria-label="Resumo dos pedidos">
        <div className="border-b fine-rule p-5 sm:border-b-0 sm:border-r"><ShoppingBag size={18} aria-hidden /><p className="mt-5 text-3xl font-semibold tabular-nums">{orders.length}</p><p className="eyebrow mt-1 text-[var(--muted)]">Total</p></div>
        <div className="border-b fine-rule p-5 sm:border-b-0 sm:border-r"><CheckCircle2 size={18} aria-hidden /><p className="mt-5 text-3xl font-semibold tabular-nums">{approved}</p><p className="eyebrow mt-1 text-[var(--muted)]">Pagos</p></div>
        <div className="p-5"><Clock3 size={18} aria-hidden /><p className="mt-5 text-3xl font-semibold tabular-nums">{waiting}</p><p className="eyebrow mt-1 text-[var(--muted)]">Aguardando</p></div>
      </section>

      {orders.length === 0 ? (
        <div className="grid min-h-72 place-items-center border-y fine-rule px-6 text-center"><div><p className="eyebrow mb-3">Nenhum pedido</p><p className="text-sm text-[var(--muted)]">As compras iniciadas no catálogo aparecerão aqui.</p></div></div>
      ) : (
        <div className="border-t fine-rule">
          <div className="hidden grid-cols-[8rem_minmax(12rem,1fr)_10rem_9rem_9rem_3rem] gap-4 border-b fine-rule px-4 py-3 text-[.62rem] font-bold tracking-[.1em] text-[var(--muted)] uppercase xl:grid"><span>Data</span><span>Cliente / Peça</span><span>Pagamento</span><span>Produção</span><span>Total</span><span /></div>
          <ul>
            {orders.map((order) => (
              <li key={order.id} className="border-b fine-rule">
                <Link href={`/admin/pedidos/${order.id}`} className="grid gap-3 px-4 py-5 transition-colors hover:bg-white/45 xl:grid-cols-[8rem_minmax(12rem,1fr)_10rem_9rem_9rem_3rem] xl:items-center xl:gap-4">
                  <span className="text-xs tabular-nums text-[var(--muted)]">{formatDateTime(order.createdAt)}</span>
                  <span><strong className="block text-sm">{order.customerName}</strong><small className="mt-1 block text-xs text-[var(--muted)]">{order.productName}{order.selectedSize ? ` · ${order.selectedSize}` : ""}{order.selectedColor ? ` · ${order.selectedColor}` : ""}</small></span>
                  <span className={`text-xs font-semibold ${order.paymentStatus === "approved" ? "text-[var(--success)]" : "text-black/60"}`}>{paymentLabel(order.paymentStatus)}</span>
                  <span className="text-xs">{fulfillmentStatusLabels[order.fulfillmentStatus]}</span>
                  <span className="text-sm font-semibold tabular-nums">{formatPrice(order.totalAmount)}</span>
                  <ArrowRight size={17} aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </main>
  );
}

