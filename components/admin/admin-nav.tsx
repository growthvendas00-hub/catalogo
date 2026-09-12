import Link from "next/link";
import { Images, LogOut, Package, Settings } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { logoutAction } from "@/app/admin/actions";

const links = [
  { href: "/admin/produtos", label: "Produtos", icon: Package },
  { href: "/admin/imagens", label: "Imagens", icon: Images },
  { href: "/admin/configuracoes", label: "Configurações", icon: Settings },
];

export function AdminNav() {
  return (
    <aside className="border-b fine-rule bg-[var(--ink)] text-white lg:fixed lg:inset-y-0 lg:left-0 lg:w-60 lg:border-b-0 lg:border-r lg:border-white/20">
      <div className="flex h-20 items-center justify-between px-4 lg:h-auto lg:block lg:px-6 lg:py-7">
        <Link href="/" aria-label="Ver catálogo" className="inline-block"><BrandMark compact /></Link>
        <nav aria-label="Administração" className="hidden lg:mt-12 lg:grid lg:gap-1">
          {links.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className="flex min-h-12 items-center gap-3 border-b border-white/15 text-xs font-bold tracking-[.1em] uppercase hover:text-[#d9c4bb]"><Icon size={16} aria-hidden />{label}</Link>)}
        </nav>
        <nav aria-label="Administração móvel" className="flex gap-1 lg:hidden">
          {links.map(({ href, label, icon: Icon }) => <Link key={href} href={href} aria-label={label} className="grid size-11 place-items-center"><Icon size={18} /></Link>)}
        </nav>
      </div>
      <form action={logoutAction} className="hidden lg:absolute lg:bottom-6 lg:left-6 lg:block"><button className="flex min-h-11 items-center gap-3 text-xs font-bold tracking-[.1em] uppercase text-white/65 hover:text-white"><LogOut size={16} /> Sair</button></form>
    </aside>
  );
}
