import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { LoginForm } from "@/components/admin/login-form";
import { hasSupabaseEnv } from "@/lib/env";

export const metadata = { title: "Administração" };

export default function AdminLoginPage() {
  return <main id="conteudo" className="grid min-h-screen lg:grid-cols-2"><section className="flex min-h-64 flex-col justify-between bg-[var(--ink)] p-[var(--page-gutter)] text-white"><Link href="/"><BrandMark /></Link><div className="max-w-xl"><p className="eyebrow mb-4 text-white/50">Área reservada</p><h1 className="text-5xl leading-[.93] tracking-[-.05em] uppercase sm:text-7xl">O catálogo nas suas mãos.</h1></div></section><section className="flex items-center p-[var(--page-gutter)]"><div className="mx-auto w-full max-w-md"><p className="eyebrow text-[var(--muted)]">Laus Sit · Administração</p><h2 className="mt-3 text-3xl font-medium tracking-[-.04em]">Entre para continuar.</h2>{hasSupabaseEnv ? <LoginForm /> : <div className="mt-8 border fine-rule p-5"><p className="text-sm leading-relaxed text-black/65">O Supabase ainda não foi configurado. Você pode explorar o painel em modo demonstração.</p><Link href="/admin/produtos" className="button-primary mt-5 w-full">Entrar no modo demonstração</Link></div>}</div></section></main>;
}
