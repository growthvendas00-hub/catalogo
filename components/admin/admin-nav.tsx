"use client";

import Link from "next/link";
import { Boxes, ChartNoAxesColumn, Images, LogOut, Package, Settings, ShoppingBag, TicketPercent, Users } from "lucide-react";
import { usePathname } from "next/navigation";
import { BrandMark } from "@/components/brand-mark";
import { logoutAction } from "@/app/admin/actions";

const links = [
  { href: "/admin/painel", label: "Painel", icon: ChartNoAxesColumn },
  { href: "/admin/pedidos", label: "Pedidos", icon: ShoppingBag },
  { href: "/admin/estoque", label: "Estoque", icon: Boxes },
  { href: "/admin/produtos", label: "Produtos", icon: Package },
  { href: "/admin/cupons", label: "Cupons", icon: TicketPercent },
  { href: "/admin/vendedores", label: "Vendedores", icon: Users },
  { href: "/admin/imagens", label: "Imagens", icon: Images },
  { href: "/admin/configuracoes", label: "Configurações", icon: Settings },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <aside className="border-b fine-rule bg-[var(--ink)] text-white lg:fixed lg:inset-y-0 lg:left-0 lg:w-60 lg:border-b-0 lg:border-r lg:border-white/20">
      <div className="flex flex-col px-4 py-4 lg:block lg:px-6 lg:py-7">
        <div className="flex min-h-12 items-center justify-between">
        <Link href="/" aria-label="Ver catálogo" className="inline-block"><BrandMark compact /></Link>
        <form action={logoutAction} className="lg:hidden"><button className="flex min-h-11 items-center gap-2 px-2 text-xs font-bold uppercase"><LogOut size={16} aria-hidden /> Sair</button></form>
        </div>
        <nav aria-label="Administração" className="mt-3 flex snap-x overflow-x-auto border-t border-white/20 lg:mt-10 lg:grid lg:grid-cols-1 lg:gap-0 lg:overflow-visible lg:border-t-0">
          {links.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return <Link key={href} href={href} aria-current={active ? "page" : undefined} className={`flex min-h-12 shrink-0 snap-start items-center gap-2 border-b border-white/15 px-3 text-[.68rem] font-bold tracking-[.06em] hover:text-[#d9c4bb] lg:gap-3 lg:px-0 lg:text-xs lg:tracking-[.08em] ${active ? "text-[#d9c4bb]" : "text-white"}`}><Icon size={16} aria-hidden />{label}</Link>;
          })}
        </nav>
      </div>
      <form action={logoutAction} className="hidden lg:absolute lg:bottom-6 lg:left-6 lg:block"><button className="flex min-h-11 items-center gap-3 text-xs font-bold tracking-[.1em] uppercase text-white/65 hover:text-white"><LogOut size={16} /> Sair</button></form>
    </aside>
  );
}
