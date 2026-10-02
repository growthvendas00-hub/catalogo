import { CheckCircle2, Clock3, ShoppingBag, TicketPercent } from "lucide-react";
import { getAdminOrders } from "@/lib/orders";

export const dynamic = "force-dynamic";
export const metadata = { title: "Painel — Admin" };
export default async function DashboardPage() {
  const orders=await getAdminOrders();
  const today=new Date().toLocaleDateString("pt-BR",{timeZone:"America/Sao_Paulo"});
  const cards=[
    [ShoppingBag,"Pedidos hoje",orders.filter(o=>new Date(o.createdAt).toLocaleDateString("pt-BR",{timeZone:"America/Sao_Paulo"})===today).length],
    [CheckCircle2,"Aprovados",orders.filter(o=>o.paymentStatus==="approved").length],
    [Clock3,"Pendentes",orders.filter(o=>["created","pending","in_process"].includes(o.paymentStatus)).length],
    [TicketPercent,"Com cupom",orders.filter(o=>o.couponCode).length],
  ] as const;
  const origins=new Set(orders.map(o=>o.attributionSource).filter(source=>source!=="direta")).size;
  return <main id="conteudo" className="p-4 sm:p-7 lg:p-10"><header className="mb-8"><p className="eyebrow text-[var(--muted)]">Operação</p><h1 className="mt-2 text-4xl font-medium tracking-[-.045em] sm:text-5xl">Painel</h1><p className="mt-3 text-sm text-[var(--muted)]">Resumo atualizado da loja · {origins} origem(ns) atribuída(s)</p></header><section className="grid border-y fine-rule sm:grid-cols-2 xl:grid-cols-4">{cards.map(([Icon,label,value],index)=><div key={label} className={`p-5 ${index<3?"border-b fine-rule sm:border-r xl:border-b-0":""}`}><Icon size={18}/><p className="mt-5 text-3xl font-semibold tabular-nums">{value}</p><p className="eyebrow mt-1 text-[var(--muted)]">{label}</p></div>)}</section></main>;
}
