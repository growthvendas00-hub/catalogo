import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { SellerLoginForm } from "@/components/seller-login-form";
export const metadata={title:"Vendedor — Laus Sit"};
export default function SellerLoginPage(){return <main id="conteudo" className="grid min-h-screen lg:grid-cols-2"><section className="flex min-h-64 flex-col justify-between bg-[var(--ink)] p-[var(--page-gutter)] text-white"><Link href="/"><BrandMark/></Link><div><p className="eyebrow mb-4 text-white/50">Área reservada</p><h1 className="text-5xl leading-[.93] tracking-[-.05em] sm:text-7xl">Seus pedidos.<br/>Seu atendimento.</h1></div></section><section className="flex items-center p-[var(--page-gutter)]"><div className="mx-auto w-full max-w-md"><p className="eyebrow text-[var(--muted)]">Laus Sit · Vendedores</p><h2 className="mt-3 text-3xl font-medium tracking-[-.04em]">Entre para continuar.</h2><SellerLoginForm/></div></section></main>}
